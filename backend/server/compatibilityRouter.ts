import { GoogleGenAI } from "@google/genai";
import { Router, type Request, type Response } from "express";
import { COOKIE_NAME } from "@shared/const";
import { hashPassword, signSessionToken, verifyPassword } from "./_core/auth";
import { getSessionCookieOptions } from "./_core/cookies";
import { createContext } from "./_core/trpc";
import {
  addProjectMember,
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  getAllProjects,
  getAllTasks,
  getAllTasksForUser,
  getAllUsers,
  getProjectMembers,
  getProjectById,
  getProjectRooms,
  getProjectsForUser,
  getTaskById,
  getMessages,
  getOrCreateDirectRoom,
  getOrCreateProjectRoom,
  getDirectRoomsForUser,
  getUserByEmail,
  isProjectMember,
  sendMessage,
  updateProject,
  updateTask,
  upsertUser,
} from "./db";
import { isAcceptablePassword, toPublicUser } from "./security";

export const compatibilityRouter = Router();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

function loginAttemptKey(req: Request, email: string) {
  return `${req.ip}:${email}`;
}

async function authenticatedUser(req: Request, res: Response) {
  const { user } = await createContext({ req, res } as any);
  return user;
}

function projectStatus(tasks: Array<{ status: string }>) {
  if (tasks.length === 0) return "Planning" as const;
  if (tasks.every((task) => task.status === "done"))
    return "Completed" as const;
  if (tasks.some((task) => task.status === "approval"))
    return "Review" as const;
  return "In Progress" as const;
}

function uiTaskStatus(status: string) {
  if (status === "done") return "Completed" as const;
  if (status === "processing" || status === "approval")
    return "In Progress" as const;
  return "Not Started" as const;
}

function dbTaskStatus(status: string) {
  if (status === "Completed") return "done" as const;
  if (status === "In Progress") return "processing" as const;
  return "pending" as const;
}

function uiMessage(
  row: Awaited<ReturnType<typeof getMessages>>[number],
  type: "proj" | "dm",
  targetId: string,
) {
  const name = row.sender.name ?? row.sender.email ?? "Member";
  return {
    id: String(row.message.id),
    type,
    targetId,
    sender: {
      name,
      initials: name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      color: "#3B82F6",
    },
    text: row.message.content,
    timestamp: row.message.createdAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

compatibilityRouter.get("/auth/me", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.post("/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password ?? "");
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const attemptKey = loginAttemptKey(req, email);
    const now = Date.now();
    const attempt = loginAttempts.get(attemptKey);
    if (
      attempt &&
      attempt.resetAt > now &&
      attempt.count >= MAX_LOGIN_ATTEMPTS
    ) {
      return res
        .status(429)
        .json({ error: "Too many login attempts. Try again later." });
    }

    const user = await getUserByEmail(email);
    if (
      !user?.passwordHash ||
      !(await verifyPassword(password, user.passwordHash))
    ) {
      const activeAttempt =
        attempt && attempt.resetAt > now
          ? attempt
          : { count: 0, resetAt: now + LOGIN_WINDOW_MS };
      loginAttempts.set(attemptKey, {
        count: activeAttempt.count + 1,
        resetAt: activeAttempt.resetAt,
      });
      return res.status(401).json({ error: "Invalid email or password" });
    }

    loginAttempts.delete(attemptKey);
    const token = await signSessionToken(user.openId);
    res.cookie(COOKIE_NAME, token, getSessionCookieOptions(req));
    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.post("/auth/register", async (req, res, next) => {
  try {
    const name = String(req.body.name ?? "").trim();
    const email = String(req.body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password ?? "");
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email and password are required" });
    }
    if (!isAcceptablePassword(password)) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }
    if (await getUserByEmail(email)) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists" });
    }

    await upsertUser({
      openId: email,
      name,
      email,
      loginMethod: "password",
      passwordHash: await hashPassword(password),
      lastSignedIn: new Date(),
    });
    const user = await getUserByEmail(email);
    if (!user) throw new Error("Failed to create account");

    const token = await signSessionToken(user.openId);
    res.cookie(COOKIE_NAME, token, getSessionCookieOptions(req));
    return res.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.post("/auth/logout", async (req, res) => {
  res.clearCookie(COOKIE_NAME, getSessionCookieOptions(req));
  return res.json({ success: true });
});

compatibilityRouter.get("/workspace", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });

    const [dbProjects, dbTasks, dbUsers] = await Promise.all([
      user.role === "admin" ? getAllProjects() : getProjectsForUser(user.id),
      user.role === "admin" ? getAllTasks() : getAllTasksForUser(user.id),
      getAllUsers(),
    ]);
    const usersById = new Map(dbUsers.map((member) => [member.id, member]));
    const projectTeams = new Map<number, string[]>();
    await Promise.all(
      dbProjects.map(async (project) => {
        const rows = await getProjectMembers(project.id);
        projectTeams.set(
          project.id,
          rows.map((row) => row.user.name ?? row.user.email ?? "Member"),
        );
      }),
    );

    const projects = dbProjects.map((project) => {
      const projectTasks = dbTasks.filter(
        (task) => task.projectId === project.id,
      );
      const completed = projectTasks.filter(
        (task) => task.status === "done",
      ).length;
      return {
        id: String(project.id),
        name: project.name,
        description: project.description ?? "",
        status: projectStatus(projectTasks),
        startDate: (project.startDate ?? project.createdAt)
          .toISOString()
          .slice(0, 10),
        endDate: project.endDate?.toISOString().slice(0, 10) ?? "",
        progress: projectTasks.length
          ? Math.round((completed / projectTasks.length) * 100)
          : 0,
        color: project.color,
        team: projectTeams.get(project.id) ?? [],
      };
    });

    const tasks = dbTasks.map((task) => ({
      id: String(task.id),
      projectId: String(task.projectId),
      name: task.title,
      assignedTo: task.assigneeId
        ? (usersById.get(task.assigneeId)?.name ?? "Unassigned")
        : "Unassigned",
      priority:
        task.priority === "high" || task.priority === "urgent"
          ? "High"
          : task.priority === "low"
            ? "Low"
            : "Medium",
      status: uiTaskStatus(task.status),
      date: (task.dueDate ?? task.createdAt).toISOString().slice(0, 10),
    }));

    const members = dbUsers.map((member) => ({
      id: String(member.id),
      name: member.name ?? member.email ?? "Member",
      email: member.email ?? "",
      role: member.role === "admin" ? "Administrator" : "Staff",
      department: "Operations",
      status: "Active" as const,
      since: member.createdAt.toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      }),
    }));

    const projectIds = dbProjects.map((project) => project.id);
    const [projectRooms, directRooms] = await Promise.all([
      getProjectRooms(projectIds),
      getDirectRoomsForUser(user.id),
    ]);
    const projectChats = (
      await Promise.all(
        projectRooms.map(async (room) => {
          const projectId = room.name?.split(":")[1] ?? "";
          return (await getMessages(room.id)).map((row) =>
            uiMessage(row, "proj", projectId),
          );
        }),
      )
    ).flat();
    const directChats = (
      await Promise.all(
        directRooms.map(async ({ room, otherUser }) =>
          (await getMessages(room.id)).map((row) =>
            uiMessage(row, "dm", String(otherUser.id)),
          ),
        ),
      )
    ).flat();

    return res.json({
      projects,
      tasks,
      members,
      chats: [...projectChats, ...directChats],
    });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.post("/projects", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Administrator access required" });
    }
    if (!req.body.name)
      return res.status(400).json({ error: "Project name is required" });
    const startDate = req.body.startDate
      ? new Date(String(req.body.startDate))
      : undefined;
    const endDate = req.body.endDate
      ? new Date(String(req.body.endDate))
      : undefined;
    if (
      (startDate && Number.isNaN(startDate.getTime())) ||
      (endDate && Number.isNaN(endDate.getTime()))
    ) {
      return res.status(400).json({ error: "Invalid project date" });
    }
    if (startDate && endDate && endDate < startDate) {
      return res
        .status(400)
        .json({ error: "End date must be on or after start date" });
    }
    const project = await createProject({
      name: req.body.name,
      description: req.body.description,
      color: req.body.color,
      ownerId: user.id,
      startDate,
      endDate,
    });
    return res.status(201).json({ success: true, project });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.patch("/projects/:id", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Administrator access required" });
    }
    const projectId = Number(req.params.id);
    const project = await getProjectById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const startDate = req.body.startDate
      ? new Date(String(req.body.startDate))
      : null;
    const endDate = req.body.endDate
      ? new Date(String(req.body.endDate))
      : null;
    if (
      (startDate && Number.isNaN(startDate.getTime())) ||
      (endDate && Number.isNaN(endDate.getTime()))
    ) {
      return res.status(400).json({ error: "Invalid project date" });
    }
    if (startDate && endDate && endDate < startDate) {
      return res
        .status(400)
        .json({ error: "End date must be on or after start date" });
    }

    await updateProject(projectId, {
      name: String(req.body.name ?? project.name).trim(),
      description: String(req.body.description ?? ""),
      color: String(req.body.color ?? project.color),
      startDate,
      endDate,
    });
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.delete("/projects/:id", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Administrator access required" });
    }
    const projectId = Number(req.params.id);
    if (!(await getProjectById(projectId))) {
      return res.status(404).json({ error: "Project not found" });
    }
    await deleteProject(projectId);
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.post("/tasks", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    const projectId = Number(req.body.projectId);
    if (!projectId || !req.body.name)
      return res
        .status(400)
        .json({ error: "Project and task name are required" });
    if (user.role !== "admin" && !(await isProjectMember(projectId, user.id))) {
      return res.status(403).json({ error: "Not a project member" });
    }
    const users = await getAllUsers();
    const assignee = users.find(
      (candidate) => candidate.name === req.body.assignedTo,
    );
    const task = await createTask({
      projectId,
      title: req.body.name,
      creatorId: user.id,
      assigneeId: assignee?.id,
      priority:
        String(req.body.priority).toLowerCase() === "high"
          ? "high"
          : String(req.body.priority).toLowerCase() === "low"
            ? "low"
            : "medium",
    });
    return res.status(201).json({ success: true, task });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.patch("/tasks/:id", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    const task = await getTaskById(Number(req.params.id));
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (
      user.role !== "admin" &&
      !(await isProjectMember(task.projectId, user.id))
    ) {
      return res.status(403).json({ error: "Not a project member" });
    }
    const isStatusOnly =
      Object.keys(req.body).every((key) => key === "status") && req.body.status;
    if (user.role !== "admin" && !isStatusOnly) {
      return res.status(403).json({ error: "Administrator access required" });
    }
    const update: Parameters<typeof updateTask>[1] = {};
    if (req.body.status) update.status = dbTaskStatus(req.body.status);
    if (user.role === "admin") {
      if (req.body.name !== undefined) update.title = String(req.body.name);
      if (req.body.priority !== undefined) {
        const priority = String(req.body.priority).toLowerCase();
        update.priority =
          priority === "high" ? "high" : priority === "low" ? "low" : "medium";
      }
      if (req.body.assignedTo !== undefined) {
        const assignee = (await getAllUsers()).find(
          (candidate) => candidate.name === req.body.assignedTo,
        );
        update.assigneeId = assignee?.id ?? null;
      }
    }
    await updateTask(task.id, update);
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.delete("/tasks/:id", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Administrator access required" });
    }
    const taskId = Number(req.params.id);
    if (!(await getTaskById(taskId))) {
      return res.status(404).json({ error: "Task not found" });
    }
    await deleteTask(taskId);
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.post("/members", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Administrator access required" });
    }
    if (!req.body.email)
      return res.status(400).json({ error: "Email is required" });
    const email = String(req.body.email).trim().toLowerCase();
    let member = await getUserByEmail(email);
    if (!member) {
      await upsertUser({
        openId: email,
        email,
        name: req.body.name,
        loginMethod: "invited",
      });
      member = await getUserByEmail(email);
    }
    if (!member) throw new Error("Failed to create member");
    if (req.body.projectId)
      await addProjectMember(Number(req.body.projectId), member.id);
    return res.status(201).json({ success: true, member });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.post("/projects/:id/team", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    const projectId = Number(req.params.id);
    if (!projectId || !req.body.name)
      return res
        .status(400)
        .json({ error: "Project and member name are required" });
    const project = await getProjectById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (user.role !== "admin" && project.ownerId !== user.id) {
      return res.status(403).json({ error: "Project owner access required" });
    }
    const member = (await getAllUsers()).find(
      (candidate) => candidate.name === req.body.name,
    );
    if (!member) return res.status(404).json({ error: "Member not found" });
    await addProjectMember(projectId, member.id);
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.post("/chat/message", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    const text = String(req.body.text ?? "").trim();
    const targetId = Number(req.body.targetId);
    if (!text || !targetId)
      return res.status(400).json({ error: "Target and text are required" });

    let room;
    if (req.body.type === "dm") {
      room = await getOrCreateDirectRoom(user.id, targetId);
    } else {
      if (
        user.role !== "admin" &&
        !(await isProjectMember(targetId, user.id))
      ) {
        return res.status(403).json({ error: "Not a project member" });
      }
      room = await getOrCreateProjectRoom(targetId);
    }
    const message = await sendMessage({
      roomId: room.id,
      senderId: user.id,
      content: text,
    });
    return res.status(201).json({ success: true, message });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.post("/ai/ask", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    const question = String(req.body.question ?? "").trim();
    if (!question)
      return res.status(400).json({ error: "Question is required" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
      return res
        .status(503)
        .json({ error: "GEMINI_API_KEY is not configured" });

    const [projects, tasks, users] = await Promise.all([
      user.role === "admin" ? getAllProjects() : getProjectsForUser(user.id),
      user.role === "admin" ? getAllTasks() : getAllTasksForUser(user.id),
      getAllUsers(),
    ]);
    const aiUsers = users.map((member) => ({
      id: member.id,
      name: member.name ?? "Member",
      role: member.role,
    }));

    // التهيئة الرسمية للذكاء الاصطناعي
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: question,
      config: {
        systemInstruction: `You are OpsFlow Assistant. Reply in the user's language. Be concise and use this live workspace data:\n${JSON.stringify({ projects, tasks, users: aiUsers })}`,
        temperature: 0.7,
      },
    });

    if (!response.text) {
      return res
        .status(502)
        .json({ error: "Gemini returned an empty response" });
    }

    return res.json({ answer: response.text });
  } catch (error) {
    console.error("Gemini SDK Error:", error);
    next(error);
  }
});
