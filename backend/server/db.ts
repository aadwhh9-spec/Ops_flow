import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  activities,
  chatRoomMembers,
  chatRooms,
  InsertActivity,
  InsertMessage,
  InsertNotification,
  InsertProject,
  InsertTask,
  InsertUser,
  messages,
  notifications,
  projectMembers,
  projects,
  tasks,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _client: postgres.Sql | null = null;

export async function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing. Add it to backend/.env");
  }

  if (!_db) {
    _client = postgres(process.env.DATABASE_URL, { prepare: false });
    _db = drizzle({ client: _client });
  }

  return _db;
}

// â”€â”€â”€ Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const fields = [
    "name",
    "email",
    "loginMethod",
    "avatarUrl",
    "passwordHash",
  ] as const;
  for (const field of fields) {
    const val = user[field];
    if (val !== undefined) {
      values[field] = val ?? null;
      updateSet[field] = val ?? null;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: updateSet,
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.name);
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// â”€â”€â”€ Projects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function createProject(data: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [project] = await db.insert(projects).values(data).returning();
  if (!project) throw new Error("Failed to create project");

  // Auto-add owner as manager
  await db
    .insert(projectMembers)
    .values({ projectId: project.id, userId: data.ownerId, role: "manager" })
    .onConflictDoUpdate({
      target: [projectMembers.projectId, projectMembers.userId],
      set: { role: "manager" },
    });

  return project;
}

async function getAccessibleProjectIds(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const [ownedRows, memberRows, assignedRows] = await Promise.all([
    db
      .select({ projectId: projects.id })
      .from(projects)
      .where(eq(projects.ownerId, userId)),
    db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId)),
    db
      .selectDistinct({ projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.assigneeId, userId)),
  ]);

  return [
    ...new Set(
      [...ownedRows, ...memberRows, ...assignedRows].map(
        (row) => row.projectId,
      ),
    ),
  ];
}

export async function getProjectsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const ids = await getAccessibleProjectIds(userId);
  if (ids.length === 0) return [];
  return db
    .select()
    .from(projects)
    .where(inArray(projects.id, ids))
    .orderBy(desc(projects.createdAt));
}

export async function getAllProjects() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return result[0];
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(projectMembers).where(eq(projectMembers.projectId, id));
  await db.delete(tasks).where(eq(tasks.projectId, id));
  await db.delete(projects).where(eq(projects.id, id));
}

export async function getProjectMembers(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ member: projectMembers, user: users })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId));
  return rows;
}

export async function addProjectMember(
  projectId: number,
  userId: number,
  role: "viewer" | "member" | "manager" = "member",
) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(projectMembers)
    .values({ projectId, userId, role })
    .onConflictDoUpdate({
      target: [projectMembers.projectId, projectMembers.userId],
      set: { role },
    });
}

export async function removeProjectMember(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    );
}

export async function isProjectMember(
  projectId: number,
  userId: number,
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const ids = await getAccessibleProjectIds(userId);
  return ids.includes(projectId);
}

// â”€â”€â”€ Tasks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function createTask(data: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [task] = await db.insert(tasks).values(data).returning();
  if (!task) throw new Error("Failed to create task");

  if (data.assigneeId) {
    await addProjectMember(data.projectId, data.assigneeId, "member");
  }

  return task;
}

export async function getTasksForProject(
  projectId: number,
  filters?: {
    status?: string;
    priority?: string;
    assigneeId?: number;
    search?: string;
  },
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(tasks.projectId, projectId)];
  if (filters?.status) conditions.push(eq(tasks.status, filters.status as any));
  if (filters?.priority)
    conditions.push(eq(tasks.priority, filters.priority as any));
  if (filters?.assigneeId)
    conditions.push(eq(tasks.assigneeId, filters.assigneeId));
  if (filters?.search)
    conditions.push(like(tasks.title, `%${filters.search}%`));
  return db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.createdAt));
}

export async function getTasksForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const ids = await getAccessibleProjectIds(userId);
  if (ids.length === 0) return [];
  return db
    .select()
    .from(tasks)
    .where(inArray(tasks.projectId, ids))
    .orderBy(desc(tasks.createdAt));
}

export async function getAllTasksForUser(
  userId: number,
  filters?: {
    status?: string;
    priority?: string;
    search?: string;
    projectId?: number;
  },
) {
  const db = await getDb();
  if (!db) return [];
  const ids = await getAccessibleProjectIds(userId);
  if (ids.length === 0) return [];
  const conditions = [inArray(tasks.projectId, ids)];
  if (filters?.status) conditions.push(eq(tasks.status, filters.status as any));
  if (filters?.priority)
    conditions.push(eq(tasks.priority, filters.priority as any));
  if (filters?.search)
    conditions.push(like(tasks.title, `%${filters.search}%`));
  if (filters?.projectId)
    conditions.push(eq(tasks.projectId, filters.projectId));
  return db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.createdAt));
}

export async function getAllTasks(filters?: {
  status?: string;
  priority?: string;
  search?: string;
  projectId?: number;
  assigneeId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.status) conditions.push(eq(tasks.status, filters.status as any));
  if (filters?.priority)
    conditions.push(eq(tasks.priority, filters.priority as any));
  if (filters?.search)
    conditions.push(like(tasks.title, `%${filters.search}%`));
  if (filters?.projectId)
    conditions.push(eq(tasks.projectId, filters.projectId));
  if (filters?.assigneeId)
    conditions.push(eq(tasks.assigneeId, filters.assigneeId));

  const query = db.select().from(tasks);
  return conditions.length > 0
    ? query.where(and(...conditions)).orderBy(desc(tasks.createdAt))
    : query.orderBy(desc(tasks.createdAt));
}

export async function getTaskById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result[0];
}

export async function updateTask(id: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) return;
  const updateData: any = { ...data, updatedAt: new Date() };
  if (data.status === "done" && !data.completedAt)
    updateData.completedAt = new Date();
  if (data.status && data.status !== "done") updateData.completedAt = null;
  await db.update(tasks).set(updateData).where(eq(tasks.id, id));

  if (data.assigneeId) {
    const updatedTask = await getTaskById(id);
    if (updatedTask) {
      await addProjectMember(updatedTask.projectId, data.assigneeId, "member");
    }
  }
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tasks).where(eq(tasks.id, id));
}

// â”€â”€â”€ Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getGlobalRoom() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(chatRooms)
    .where(eq(chatRooms.type, "global"))
    .limit(1);
  return result[0];
}

export async function getOrCreateProjectRoom(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const name = `project:${projectId}`;
  const [existing] = await db
    .select()
    .from(chatRooms)
    .where(and(eq(chatRooms.type, "global"), eq(chatRooms.name, name)))
    .limit(1);
  if (existing) return existing;
  const [room] = await db
    .insert(chatRooms)
    .values({ type: "global", name })
    .returning();
  if (!room) throw new Error("Failed to create project chat room");
  return room;
}

export async function getProjectRooms(projectIds: number[]) {
  const db = await getDb();
  if (!db || projectIds.length === 0) return [];
  return db
    .select()
    .from(chatRooms)
    .where(
      inArray(
        chatRooms.name,
        projectIds.map((id) => `project:${id}`),
      ),
    );
}

export async function getOrCreateDirectRoom(userId1: number, userId2: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Find existing DM room between the two users
  const rooms = await db
    .select({ roomId: chatRoomMembers.roomId })
    .from(chatRoomMembers)
    .where(eq(chatRoomMembers.userId, userId1));
  const roomIds = rooms.map((r) => r.roomId);
  if (roomIds.length > 0) {
    const shared = await db
      .select({ roomId: chatRoomMembers.roomId })
      .from(chatRoomMembers)
      .where(
        and(
          eq(chatRoomMembers.userId, userId2),
          inArray(chatRoomMembers.roomId, roomIds),
        ),
      );
    if (shared.length > 0) {
      // Verify it's a direct room
      const room = await db
        .select()
        .from(chatRooms)
        .where(
          and(eq(chatRooms.id, shared[0].roomId), eq(chatRooms.type, "direct")),
        )
        .limit(1);
      if (room[0]) return room[0];
    }
  }
  // Create new DM room
  const [room] = await db
    .insert(chatRooms)
    .values({ type: "direct" })
    .returning();
  if (!room) throw new Error("Failed to create direct chat room");

  await db.insert(chatRoomMembers).values([
    { roomId: room.id, userId: userId1 },
    { roomId: room.id, userId: userId2 },
  ]);

  return room;
}

export async function isRoomMember(
  roomId: number,
  userId: number,
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select({ id: chatRoomMembers.id })
    .from(chatRoomMembers)
    .where(
      and(
        eq(chatRoomMembers.roomId, roomId),
        eq(chatRoomMembers.userId, userId),
      ),
    )
    .limit(1);
  return result.length > 0;
}

export async function getMessages(roomId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ message: messages, sender: users })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.roomId, roomId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  return rows.reverse();
}

export async function sendMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [inserted] = await db
    .insert(messages)
    .values(data)
    .returning({ id: messages.id });
  if (!inserted) throw new Error("Failed to send message");

  const rows = await db
    .select({ message: messages, sender: users })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.id, inserted.id))
    .limit(1);
  return rows[0];
}

export async function getDirectRoomsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const userRooms = await db
    .select({ roomId: chatRoomMembers.roomId })
    .from(chatRoomMembers)
    .where(eq(chatRoomMembers.userId, userId));
  const roomIds = userRooms.map((r) => r.roomId);
  if (roomIds.length === 0) return [];
  const directRooms = await db
    .select()
    .from(chatRooms)
    .where(and(inArray(chatRooms.id, roomIds), eq(chatRooms.type, "direct")));
  // For each room, get the other user
  const result = [];
  for (const room of directRooms) {
    const members = await db
      .select({ user: users })
      .from(chatRoomMembers)
      .innerJoin(users, eq(chatRoomMembers.userId, users.id))
      .where(and(eq(chatRoomMembers.roomId, room.id)));
    const otherUser = members.find((m) => m.user.id !== userId);
    if (otherUser) result.push({ room, otherUser: otherUser.user });
  }
  return result;
}

// â”€â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function getNotificationsForUser(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId));
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
    );
  return Number(result[0]?.count ?? 0);
}

// â”€â”€â”€ Activities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function createActivity(data: InsertActivity) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activities).values(data);
}

export async function getRecentActivities(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  // Get activities from user's projects
  const memberRows = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));
  const projectIds = memberRows.map((r) => r.projectId);
  const conditions =
    projectIds.length > 0
      ? or(
          eq(activities.userId, userId),
          inArray(activities.relatedProjectId, projectIds),
        )
      : eq(activities.userId, userId);
  const rows = await db
    .select({ activity: activities, actor: users })
    .from(activities)
    .innerJoin(users, eq(activities.userId, users.id))
    .where(conditions)
    .orderBy(desc(activities.createdAt))
    .limit(limit);
  return rows;
}

// â”€â”€â”€ Dashboard Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db)
    return {
      activeTasks: 0,
      completedTasks: 0,
      projectCount: 0,
      pendingApproval: 0,
    };
  const memberRows = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));
  const projectIds = memberRows.map((r) => r.projectId);
  if (projectIds.length === 0)
    return {
      activeTasks: 0,
      completedTasks: 0,
      projectCount: 0,
      pendingApproval: 0,
    };

  const [activeResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(and(inArray(tasks.projectId, projectIds), sql`status != 'done'`));
  const [completedResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(and(inArray(tasks.projectId, projectIds), eq(tasks.status, "done")));
  const [approvalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(
      and(inArray(tasks.projectId, projectIds), eq(tasks.status, "approval")),
    );

  return {
    activeTasks: Number(activeResult?.count ?? 0),
    completedTasks: Number(completedResult?.count ?? 0),
    projectCount: projectIds.length,
    pendingApproval: Number(approvalResult?.count ?? 0),
  };
}
