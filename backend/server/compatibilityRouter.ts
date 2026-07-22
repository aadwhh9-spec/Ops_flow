import { Router, type Request, type Response } from "express";
import { createContext } from "./_core/trpc";
import {
  addProjectMember,
  createProject,
  createTask,
  getAllProjects,
  getAllTasks,
  getAllTasksForUser,
  getAllUsers,
  getProjectMembers,
  getProjectsForUser,
  getTaskById,
  getUserByEmail,
  isProjectMember,
  updateTask,
  upsertUser,
} from "./db";

export const compatibilityRouter = Router();

async function authenticatedUser(req: Request, res: Response) {
  const { user } = await createContext({ req, res } as any);
  return user;
}

function projectStatus(tasks: Array<{ status: string }>) {
  if (tasks.length === 0) return "Planning" as const;
  if (tasks.every(task => task.status === "done")) return "Completed" as const;
  if (tasks.some(task => task.status === "approval")) return "Review" as const;
  return "In Progress" as const;
}

function uiTaskStatus(status: string) {
  if (status === "done") return "Completed" as const;
  if (status === "processing" || status === "approval") return "In Progress" as const;
  return "Not Started" as const;
}

function dbTaskStatus(status: string) {
  if (status === "Completed") return "done" as const;
  if (status === "In Progress") return "processing" as const;
  return "pending" as const;
}

compatibilityRouter.get("/workspace", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });

    const [dbProjects, dbTasks, dbUsers] = await Promise.all([
      user.role === "admin" ? getAllProjects() : getProjectsForUser(user.id),
      user.role === "admin" ? getAllTasks() : getAllTasksForUser(user.id),
      getAllUsers(),
    ]);
    const usersById = new Map(dbUsers.map(member => [member.id, member]));
    const projectTeams = new Map<number, string[]>();
    await Promise.all(dbProjects.map(async project => {
      const rows = await getProjectMembers(project.id);
      projectTeams.set(project.id, rows.map(row => row.user.name ?? row.user.email ?? "Member"));
    }));

    const projects = dbProjects.map(project => {
      const projectTasks = dbTasks.filter(task => task.projectId === project.id);
      const completed = projectTasks.filter(task => task.status === "done").length;
      return {
        id: String(project.id),
        name: project.name,
        description: project.description ?? "",
        status: projectStatus(projectTasks),
        startDate: project.createdAt.toISOString().slice(0, 10),
        endDate: "TBD",
        progress: projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0,
        color: project.color,
        team: projectTeams.get(project.id) ?? [],
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

    return res.json({ projects, tasks, members, chats: [] });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.post("/projects", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    if (!req.body.name) return res.status(400).json({ error: "Project name is required" });
    const project = await createProject({
      name: req.body.name,
      description: req.body.description,
      color: req.body.color,
      ownerId: user.id,
    });
    return res.status(201).json({ success: true, project });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.post("/tasks", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    const projectId = Number(req.body.projectId);
    if (!projectId || !req.body.name) return res.status(400).json({ error: "Project and task name are required" });
    if (user.role !== "admin" && !(await isProjectMember(projectId, user.id))) {
      return res.status(403).json({ error: "Not a project member" });
    }
    const users = await getAllUsers();
    const assignee = users.find(candidate => candidate.name === req.body.assignedTo);
    const task = await createTask({
      projectId,
      title: req.body.name,
      creatorId: user.id,
      assigneeId: assignee?.id,
      priority: String(req.body.priority).toLowerCase() === "high" ? "high" : String(req.body.priority).toLowerCase() === "low" ? "low" : "medium",
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
    if (user.role !== "admin" && !(await isProjectMember(task.projectId, user.id))) {
      return res.status(403).json({ error: "Not a project member" });
    }
    await updateTask(task.id, { status: dbTaskStatus(req.body.status) });
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

compatibilityRouter.post("/members", async (req, res, next) => {
  try {
    const user = await authenticatedUser(req, res);
    if (!user) return res.status(401).json({ error: "You must be logged in" });
    if (!req.body.email) return res.status(400).json({ error: "Email is required" });
    const email = String(req.body.email).trim().toLowerCase();
    let member = await getUserByEmail(email);
    if (!member) {
      await upsertUser({ openId: email, email, name: req.body.name, loginMethod: "invited" });
      member = await getUserByEmail(email);
    }
    if (!member) throw new Error("Failed to create member");
    if (req.body.projectId) await addProjectMember(Number(req.body.projectId), member.id);
    return res.status(201).json({ success: true, member });
  } catch (error) {
    next(error);
  }
});
