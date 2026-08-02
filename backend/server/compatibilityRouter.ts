import { GoogleGenAI } from "@google/genai";
import { Router, type Request, type Response } from "express";
import { createHash, randomInt } from "crypto";
import nodemailer from "nodemailer";
import { COOKIE_NAME } from "@shared/const";
import { hashPassword, signSessionToken, verifyPassword } from "./_core/auth";
import { getSessionCookieOptions } from "./_core/cookies";
import { createContext } from "./_core/trpc";
import {
  addProjectMember,
  createNotification,
  createPasswordResetToken,
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  getAllProjects,
  getAllTasks,
  getAllTasksForUser,
  getAllUsers,
  getStaffUsers,
  getUsersForProjects,
  getProjectMembers,
  getProjectMember,
  getProjectById,
  getProjectRooms,
  getProjectsForUser,
  getTaskById,
  getMessages,
  getNotificationsForUser,
  getUnreadNotificationCount,
  getOrCreateDirectRoom,
  getOrCreateProjectRoom,
  getDirectRoomsForUser,
  getUserByEmail,
  isProjectMember,
  markAllNotificationsRead,
  markChatNotificationsRead,
  markNotificationRead,
  resetPasswordWithToken,
  sendMessage,
  updateProject,
  updateTask,
  updateUserRole,
  upsertUser,
} from "./db";
import { isAcceptablePassword, toPublicUser } from "./security";
import { ENV } from "./_core/env";
import {
  canCreateProject,
  canDeleteProject,
  canManageMembers,
  canManageTasks,
  canUpdateProject,
  canViewProject,
  isSuperAdmin,
} from "./permissions";

export const compatibilityRouter = Router();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const resetAttempts = new Map<string, { count: number; resetAt: number }>();
const resetVerificationAttempts = new Map<
  string,
  { count: number; resetAt: number }
>();
const RESET_WINDOW_MS = 15 * 60 * 1000;
const MAX_RESET_ATTEMPTS = 3;

function resetCodeHash(email: string, code: string) {
  return createHash("sha256")
    .update(`${email}:${code}:${ENV.jwtSecret}`)
    .digest("hex");
}

function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}

async function sendPasswordResetEmail(email: string, code: string) {
  if (
    !ENV.smtpHost ||
    !ENV.smtpUser ||
    !ENV.smtpPass ||
    !ENV.emailFrom ||
    !Number.isInteger(ENV.smtpPort)
  )
    throw new Error("Password reset email is not configured");
  const transporter = nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpPort === 465,
    requireTLS: ENV.smtpPort === 587,
    auth: { user: ENV.smtpUser, pass: ENV.smtpPass },
    tls: { minVersion: "TLSv1.2" },
  });
  await transporter.sendMail({
    from: ENV.emailFrom,
    to: email,
    subject: "OpsFlow | Password reset code",
    text: `Your OpsFlow password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `
        <div style="background:#f3f5f9;padding:32px;font-family:Arial,sans-serif;color:#0e1526">
          <div style="max-width:520px;margin:auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7eb">
            <div style="font-size:24px;font-weight:800;color:#2563eb;margin-bottom:24px">OpsFlow</div>
            <h1 style="font-size:22px;margin:0 0 12px">Reset your password</h1>
            <p style="font-size:14px;line-height:1.6;color:#64748b">Use this verification code to reset your OpsFlow password:</p>
            <div style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;background:#eff6ff;color:#1d4ed8;padding:18px;border-radius:12px;margin:24px 0">${code}</div>
            <p style="font-size:13px;color:#64748b">This code expires in 10 minutes and can only be used once.</p>
            <p style="font-size:12px;color:#94a3b8;margin-top:24px">If you did not request a password reset, ignore this email. Your password will remain unchanged.</p>
          </div>
        </div>`,
  });
}

async function sendStaffInvitationEmail(
  email: string,
  name: string | null,
  code: string,
  projectName?: string,
) {
  if (
    !ENV.smtpHost ||
    !ENV.smtpUser ||
    !ENV.smtpPass ||
    !ENV.emailFrom ||
    !Number.isInteger(ENV.smtpPort)
  )
    throw new Error("Staff invitation email is not configured");
  const transporter = nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpPort === 465,
    requireTLS: ENV.smtpPort === 587,
    auth: { user: ENV.smtpUser, pass: ENV.smtpPass },
    tls: { minVersion: "TLSv1.2" },
  });
  const inviteUrl = `${ENV.appUrl.replace(/\/$/, "")}/?invite=1&email=${encodeURIComponent(email)}`;
  const assignment = projectName ? ` and added to the project “${projectName}”` : "";
  const safeName = escapeEmailHtml(name || "there");
  const safeAssignment = escapeEmailHtml(assignment);
  await transporter.sendMail({
    from: ENV.emailFrom,
    to: email,
    subject: "OpsFlow | Staff invitation",
    text: `Hello ${name || "there"}, you have been invited to OpsFlow as a Staff member${assignment}. Open ${inviteUrl} and use code ${code} to create your password. The code expires in 10 minutes.`,
    html: `
      <div style="background:#f3f5f9;padding:32px;font-family:Arial,sans-serif;color:#0e1526">
        <div style="max-width:520px;margin:auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7eb">
          <div style="font-size:24px;font-weight:800;color:#2563eb;margin-bottom:24px">OpsFlow</div>
          <h1 style="font-size:22px;margin:0 0 12px">You have been invited</h1>
          <p style="font-size:14px;line-height:1.6;color:#64748b">Hello ${safeName}, an administrator invited you to join OpsFlow as a Staff member${safeAssignment}.</p>
          <div style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;background:#eff6ff;color:#1d4ed8;padding:18px;border-radius:12px;margin:24px 0">${code}</div>
          <p style="font-size:13px;color:#64748b">This one-time code expires in 10 minutes.</p>
          <a href="${inviteUrl}" style="display:block;background:#2563eb;color:#fff;text-decoration:none;text-align:center;font-weight:700;padding:13px;border-radius:10px;margin-top:24px">Create your password</a>
        </div>
      </div>`,
  });
}

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
      role: email === ENV.ownerOpenId ? "super_admin" : "admin",
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

compatibilityRouter.post("/auth/forgot-password", async (req, res, next) => {
  try {
    const email = String(req.body.email ?? "")
      .trim()
      .toLowerCase();
    if (!email) return res.status(400).json({ error: "Email is required" });
    if (!ENV.smtpHost || !ENV.smtpUser || !ENV.smtpPass || !ENV.emailFrom)
      return res
        .status(503)
        .json({ error: "Password reset email is not configured" });

    const attemptKey = `${req.ip}:${email}`;
    const now = Date.now();
    const attempt = resetAttempts.get(attemptKey);
    if (attempt && attempt.resetAt > now && attempt.count >= MAX_RESET_ATTEMPTS)
      return res
        .status(429)
        .json({ error: "Too many reset requests. Try again later." });
    const activeAttempt =
      attempt && attempt.resetAt > now
        ? attempt
        : { count: 0, resetAt: now + RESET_WINDOW_MS };
    resetAttempts.set(attemptKey, {
      count: activeAttempt.count + 1,
      resetAt: activeAttempt.resetAt,
    });

    const user = await getUserByEmail(email);
    if (user) {
      const code = String(randomInt(100000, 1000000));
      await createPasswordResetToken(
        user.id,
        resetCodeHash(email, code),
        new Date(now + 10 * 60 * 1000),
      );
      await sendPasswordResetEmail(email, code);
    }
    return res.json({
      success: true,
      message: "If an account exists, a reset code has been sent.",
    });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.post("/auth/reset-password", async (req, res, next) => {
  try {
    const email = String(req.body.email ?? "")
      .trim()
      .toLowerCase();
    const code = String(req.body.code ?? "").trim();
    const password = String(req.body.password ?? "");
    if (!email || !/^\d{6}$/.test(code))
      return res.status(400).json({ error: "Enter a valid six-digit code" });
    if (!isAcceptablePassword(password))
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    const attemptKey = `${req.ip}:${email}`;
    const now = Date.now();
    const attempt = resetVerificationAttempts.get(attemptKey);
    if (attempt && attempt.resetAt > now && attempt.count >= 5)
      return res
        .status(429)
        .json({ error: "Too many invalid attempts. Request a new code." });
    const activeAttempt =
      attempt && attempt.resetAt > now
        ? attempt
        : { count: 0, resetAt: now + RESET_WINDOW_MS };
    const changed = await resetPasswordWithToken(
      resetCodeHash(email, code),
      await hashPassword(password),
    );
    if (!changed) {
      resetVerificationAttempts.set(attemptKey, {
        count: activeAttempt.count + 1,
        resetAt: activeAttempt.resetAt,
      });
      return res
        .status(400)
        .json({ error: "The reset code is invalid or expired" });
    }
    resetAttempts.delete(attemptKey);
    resetVerificationAttempts.delete(attemptKey);
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.get("/notifications", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    const [notifications, unreadCount] = await Promise.all([
      getNotificationsForUser(user.id),
      getUnreadNotificationCount(user.id),
    ]);
    return res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.patch("/notifications/:id/read", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    await markNotificationRead(Number(req.params.id), user.id);
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.post("/notifications/read-all", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    await markAllNotificationsRead(user.id);
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.post("/notifications/read-chat", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    const type = req.body.type === "proj" ? "proj" : "dm";
    const targetId = Number(req.body.targetId);
    if (!targetId)
      return res.status(400).json({ error: "Chat target is required" });
    await markChatNotificationsRead(user.id, type, targetId);
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.get("/workspace", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });

    const [dbProjects, dbTasks, directRooms] = await Promise.all([
      isSuperAdmin(user.role) ? getAllProjects() : getProjectsForUser(user.id),
      isSuperAdmin(user.role)
        ? getAllTasks()
        : getAllTasksForUser(
            user.id,
            user.role === "staff" ? { assigneeId: user.id } : undefined,
          ),
      getDirectRoomsForUser(user.id),
    ]);
    const projectUsers = await getUsersForProjects(
      dbProjects.map((project) => project.id),
    );
    const roleVisibleUsers = isSuperAdmin(user.role)
      ? await getAllUsers()
      : user.role === "admin"
        ? [
            ...new Map(
              [...projectUsers, user].map((member) => [member.id, member]),
            ).values(),
          ]
        : projectUsers;
    // A direct-message participant must remain visible even when they do not
    // share a project with the current user (for example, an Admin messaging Staff).
    const dbUsers = roleVisibleUsers;
    const contactUsers = [
      ...new Map(
        [...dbUsers, ...directRooms.map(({ otherUser }) => otherUser)].map(
          (member) => [member.id, member],
        ),
      ).values(),
    ];
    const usersById = new Map(dbUsers.map((member) => [member.id, member]));
    const projectTeams = new Map<number, string[]>();
    const projectParticipants = new Map<
      number,
      Array<{
        id: string;
        name: string;
        email: string;
        systemRole: string;
        projectRole: string;
        isOwner: boolean;
      }>
    >();
    await Promise.all(
      dbProjects.map(async (project) => {
        const rows = await getProjectMembers(project.id);
        projectTeams.set(
          project.id,
          rows.map((row) => row.user.name ?? row.user.email ?? "Member"),
        );
        projectParticipants.set(
          project.id,
          rows.map((row) => ({
            id: String(row.user.id),
            name: row.user.name ?? row.user.email ?? "Member",
            email: row.user.email ?? "",
            systemRole: row.user.role,
            projectRole: row.member.role,
            isOwner: row.user.id === project.ownerId,
          })),
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
        participants: projectParticipants.get(project.id) ?? [],
      };
    });

    const tasks = dbTasks.map((task) => ({
      id: String(task.id),
      projectId: String(task.projectId),
      name: task.title,
      assignedTo: task.assigneeId
        ? (usersById.get(task.assigneeId)?.name ?? "Unassigned")
        : "Unassigned",
      assigneeId: task.assigneeId ? String(task.assigneeId) : null,
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
      role:
        member.role === "super_admin"
          ? "Super Admin"
          : member.role === "admin"
            ? "Administrator"
            : "Staff",
      department: "Operations",
      status: "Active" as const,
      since: member.createdAt.toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      }),
    }));
    const contacts = contactUsers.map((member) => ({
      id: String(member.id),
      name: member.name ?? member.email ?? "Member",
      email: member.email ?? "",
      role:
        member.role === "super_admin"
          ? "Super Admin"
          : member.role === "admin"
            ? "Administrator"
            : "Staff",
      department: "Operations",
      status: "Active" as const,
      since: member.createdAt.toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      }),
    }));

    const projectIds = dbProjects.map((project) => project.id);
    const projectRooms = await getProjectRooms(projectIds);
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
      contacts,
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
    if (!canCreateProject(user.role)) {
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
      createdBy: user.id,
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
    const projectId = Number(req.params.id);
    const project = await getProjectById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (!canUpdateProject(user, project))
      return res.status(403).json({ error: "Project owner access required" });

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
    const projectId = Number(req.params.id);
    const project = await getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    if (!canDeleteProject(user, project))
      return res.status(403).json({ error: "Project owner access required" });
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
    const project = await getProjectById(projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    const membership = await getProjectMember(projectId, user.id);
    if (!canManageTasks(user, project, membership))
      return res.status(403).json({ error: "Task manager access required" });
    const users = await getAllUsers();
    const requestedAssigneeId = Number(req.body.assigneeId);
    const assignee = requestedAssigneeId
      ? users.find((candidate) => candidate.id === requestedAssigneeId)
      : users.find((candidate) => candidate.name === req.body.assignedTo);
    if (!assignee)
      return res.status(400).json({ error: "Select a valid assignee" });
    if (!(await getProjectMember(projectId, assignee.id)))
      return res
        .status(400)
        .json({ error: "Assignee must be a project member" });
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
    if (assignee && assignee.id !== user.id) {
      await createNotification({
        userId: assignee.id,
        type: "task_assigned",
        title: `Task assigned to you: "${task.title}"`,
        relatedTaskId: task.id,
        relatedProjectId: projectId,
        actorId: user.id,
      });
    }
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
    const project = await getProjectById(task.projectId);
    if (!project) return res.status(404).json({ error: "Project not found" });
    const membership = await getProjectMember(task.projectId, user.id);
    if (!canViewProject(user, project, membership))
      return res.status(403).json({ error: "Not a project member" });
    const mayManage = canManageTasks(user, project, membership);
    const isStatusOnly =
      Object.keys(req.body).every((key) => key === "status") && req.body.status;
    if (!mayManage && (!isStatusOnly || task.assigneeId !== user.id)) {
      return res.status(403).json({ error: "Administrator access required" });
    }
    const update: Parameters<typeof updateTask>[1] = {};
    if (req.body.status) update.status = dbTaskStatus(req.body.status);
    if (mayManage) {
      if (req.body.name !== undefined) update.title = String(req.body.name);
      if (req.body.priority !== undefined) {
        const priority = String(req.body.priority).toLowerCase();
        update.priority =
          priority === "high" ? "high" : priority === "low" ? "low" : "medium";
      }
      if (
        req.body.assigneeId !== undefined ||
        req.body.assignedTo !== undefined
      ) {
        const users = await getAllUsers();
        const requestedId = Number(req.body.assigneeId);
        const assignee = requestedId
          ? users.find((candidate) => candidate.id === requestedId)
          : users.find((candidate) => candidate.name === req.body.assignedTo);
        if (assignee && !(await getProjectMember(task.projectId, assignee.id)))
          return res
            .status(400)
            .json({ error: "Assignee must be a project member" });
        update.assigneeId = assignee?.id ?? null;
      }
    }
    await updateTask(task.id, update);
    if (
      update.assigneeId &&
      update.assigneeId !== task.assigneeId &&
      update.assigneeId !== user.id
    ) {
      await createNotification({
        userId: update.assigneeId,
        type: "task_assigned",
        title: `Task assigned to you: "${update.title ?? task.title}"`,
        relatedTaskId: task.id,
        relatedProjectId: task.projectId,
        actorId: user.id,
      });
    }
    if (
      update.status &&
      update.status !== task.status &&
      task.assigneeId &&
      task.assigneeId !== user.id
    ) {
      await createNotification({
        userId: task.assigneeId,
        type: "task_status_changed",
        title: `Task "${task.title}" status changed`,
        relatedTaskId: task.id,
        relatedProjectId: task.projectId,
        actorId: user.id,
      });
    }
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.delete("/tasks/:id", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    const taskId = Number(req.params.id);
    const task = await getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    const project = await getProjectById(task.projectId);
    const membership = project
      ? await getProjectMember(task.projectId, user.id)
      : undefined;
    if (!project || !canManageTasks(user, project, membership))
      return res.status(403).json({ error: "Task manager access required" });
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
    if (!canCreateProject(user.role)) {
      return res.status(403).json({ error: "Administrator access required" });
    }
    if (!req.body.email)
      return res.status(400).json({ error: "Email is required" });
    const email = String(req.body.email).trim().toLowerCase();
    let project;
    if (req.body.projectId) {
      project = await getProjectById(Number(req.body.projectId));
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (!canManageMembers(user, project))
        return res.status(403).json({ error: "Project owner access required" });
    }
    let member = await getUserByEmail(email);
    const needsInvitation = !member?.passwordHash;
    if (!member) {
      await upsertUser({
        openId: email,
        email,
        name: req.body.name,
        role: "staff",
        loginMethod: "invited",
      });
      member = await getUserByEmail(email);
    }
    if (!member) throw new Error("Failed to create member");
    if (req.body.systemRole === "admin") {
      if (!isSuperAdmin(user.role))
        return res.status(403).json({ error: "Super Admin access required" });
      await updateUserRole(member.id, "admin");
      member = await getUserByEmail(email);
      if (!member) throw new Error("Failed to promote administrator");
    }
    if (project) {
      if (!isSuperAdmin(user.role) && member.role !== "staff")
        return res
          .status(403)
          .json({ error: "Admins may add Staff users only" });
      await addProjectMember(project.id, member.id);
      if (member.id !== user.id) {
        await createNotification({
          userId: member.id,
          type: "project_added",
          title: `Added to project "${project.name}"`,
          relatedProjectId: project.id,
          actorId: user.id,
        });
      }
    }
    if (needsInvitation && member.role === "staff") {
      const code = String(randomInt(100000, 1000000));
      await createPasswordResetToken(
        member.id,
        resetCodeHash(email, code),
        new Date(Date.now() + 10 * 60 * 1000),
      );
      await sendStaffInvitationEmail(
        email,
        member.name,
        code,
        project?.name,
      );
    }
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
    if (!canManageMembers(user, project)) {
      return res.status(403).json({ error: "Project owner access required" });
    }
    const member = (await getAllUsers()).find(
      (candidate) => candidate.name === req.body.name,
    );
    if (!member) return res.status(404).json({ error: "Member not found" });
    if (!isSuperAdmin(user.role) && member.role !== "staff")
      return res.status(403).json({ error: "Admins may add Staff users only" });
    await addProjectMember(projectId, member.id);
    if (member.id !== user.id) {
      await createNotification({
        userId: member.id,
        type: "project_added",
        title: `Added to project "${project.name}"`,
        relatedProjectId: project.id,
        actorId: user.id,
      });
    }
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
        !isSuperAdmin(user.role) &&
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
    const senderName = user.name ?? user.email ?? "Member";
    if (req.body.type === "dm") {
      if (targetId !== user.id) {
        await createNotification({
          userId: targetId,
          type: "message_received",
          title: `New message from ${senderName}`,
          body: text.length > 120 ? `${text.slice(0, 117)}...` : text,
          actorId: user.id,
        });
      }
    } else {
      const recipients = await getProjectMembers(targetId);
      await Promise.all(
        recipients
          .filter(({ user: member }) => member.id !== user.id)
          .map(({ user: member }) =>
            createNotification({
              userId: member.id,
              type: "message_received",
              title: `New message from ${senderName}`,
              body: text.length > 120 ? `${text.slice(0, 117)}...` : text,
              relatedProjectId: targetId,
              actorId: user.id,
            }),
          ),
      );
    }
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

    const [projects, tasks] = await Promise.all([
      isSuperAdmin(user.role) ? getAllProjects() : getProjectsForUser(user.id),
      isSuperAdmin(user.role)
        ? getAllTasks()
        : getAllTasksForUser(
            user.id,
            user.role === "staff" ? { assigneeId: user.id } : undefined,
          ),
    ]);
    const projectUsers = await getUsersForProjects(
      projects.map((project) => project.id),
    );
    const users = isSuperAdmin(user.role)
      ? await getAllUsers()
      : user.role === "admin"
        ? [
            ...new Map(
              [...(await getStaffUsers()), ...projectUsers, user].map(
                (member) => [member.id, member],
              ),
            ).values(),
          ]
        : projectUsers;
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
