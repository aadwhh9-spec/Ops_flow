import "dotenv/config";
import express from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import { ENV } from "./env";
import { createContext } from "./trpc";
import { appRouter } from "../routers";
import {
  createProject,
  createTask,
  getAllProjects,
  getAllTasks,
  getAllTasksForUser,
  getAllUsers,
  getProjectsForUser,
  getTaskById,
  isProjectMember,
  updateTask,
  upsertUser,
} from "../db";

const app = express();

app.use(express.json());

const projectStatus = (tasks: any[]) => {
  if (tasks.length === 0) return "Planning" as const;
  if (tasks.every(task => task.status === "done")) return "Completed" as const;
  if (tasks.some(task => task.status === "approval")) return "Review" as const;
  return "In Progress" as const;
};

const uiTaskStatus = (status: string) => {
  if (status === "done") return "Completed" as const;
  if (status === "processing" || status === "approval") return "In Progress" as const;
  return "Not Started" as const;
};

const dbTaskStatus = (status: string) => {
  if (status === "Completed") return "done" as const;
  if (status === "In Progress") return "processing" as const;
  return "pending" as const;
};

async function getAuthenticatedUser(req: express.Request, res: express.Response) {
  const context = await createContext({ req, res } as any);
  return context.user;
}

// Compatibility API for the current React UI. The database and authentication
// remain owned by the newer tRPC backend.
app.get("/api/workspace", async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });

    const [dbProjects, dbTasks, dbUsers] = await Promise.all([
      user.role === "admin" ? getAllProjects() : getProjectsForUser(user.id),
      user.role === "admin" ? getAllTasks() : getAllTasksForUser(user.id),
      getAllUsers(),
    ]);
    const usersById = new Map(dbUsers.map(member => [member.id, member]));

    const projects = dbProjects.map(project => {
      const tasks = dbTasks.filter(task => task.projectId === project.id);
      const completed = tasks.filter(task => task.status === "done").length;
      return {
        id: String(project.id),
        name: project.name,
        description: project.description ?? "",
        status: projectStatus(tasks),
        startDate: project.createdAt.toISOString().slice(0, 10),
        endDate: "TBD",
        progress: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
        color: project.color,
        team: dbUsers.filter(member => tasks.some(task => task.assigneeId === member.id)).map(member => member.name ?? member.email ?? "Member"),
      };
    });

    const tasks = dbTasks.map(task => ({
      id: String(task.id),
      projectId: String(task.projectId),
      name: task.title,
      assignedTo: task.assigneeId ? (usersById.get(task.assigneeId)?.name ?? "Unassigned") : "Unassigned",
      priority: task.priority === "high" || task.priority === "urgent" ? "High" : task.priority === "low" ? "Low" : "Medium",
      status: uiTaskStatus(task.status),
      date: (task.dueDate ?? task.createdAt).toISOString().slice(0, 10),
    }));

    const members = dbUsers.map(member => ({
      id: String(member.id),
      name: member.name ?? member.email ?? "Member",
      email: member.email ?? "",
      role: member.role === "admin" ? "Administrator" : "Staff",
      department: "Operations",
      status: "Active" as const,
      since: member.createdAt.toLocaleString("en-US", { month: "short", year: "numeric" }),
    }));

    res.json({ projects, tasks, members, chats: [] });
  } catch (error) {
    next(error);
  }
});

app.post("/api/projects", async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    if (!req.body.name) return res.status(400).json({ error: "Project name is required" });
    const project = await createProject({
      name: req.body.name,
      description: req.body.description,
      color: req.body.color,
      ownerId: user.id,
    });
    res.status(201).json({ success: true, project });
  } catch (error) {
    next(error);
  }
});

app.post("/api/tasks", async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    const projectId = Number(req.body.projectId);
    if (!projectId || !req.body.name) return res.status(400).json({ error: "Project and task name are required" });
    if (user.role !== "admin" && !(await isProjectMember(projectId, user.id))) {
      return res.status(403).json({ error: "Not a project member" });
    }
    const users = await getAllUsers();
    const assignee = users.find(member => member.name === req.body.assignedTo);
    const task = await createTask({
      projectId,
      title: req.body.name,
      creatorId: user.id,
      assigneeId: assignee?.id,
      priority: String(req.body.priority ?? "medium").toLowerCase() as "low" | "medium" | "high",
    });
    res.status(201).json({ success: true, task });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/tasks/:id", async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid task id" });
    const task = await getTaskById(id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (user.role !== "admin" && !(await isProjectMember(task.projectId, user.id))) {
      return res.status(403).json({ error: "Not a project member" });
    }
    await updateTask(id, { status: dbTaskStatus(req.body.status) });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/members", async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    if (user.role !== "admin") return res.status(403).json({ error: "Admin only" });
    if (!req.body.name || !req.body.email) return res.status(400).json({ error: "Name and email are required" });
    await upsertUser({ openId: req.body.email, name: req.body.name, email: req.body.email, loginMethod: "invite" });
    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.use(
  "/api/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(ENV.port, () => {
  console.log(`OpsFlow backend listening on port ${ENV.port}`);
});
