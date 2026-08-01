import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "staff",
  "admin",
  "super_admin",
]);
export const projectMemberRoleEnum = pgEnum("project_member_role", [
  "viewer",
  "member",
  "manager",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "approval",
  "processing",
  "done",
]);
export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);
export const chatRoomTypeEnum = pgEnum("chat_room_type", ["global", "direct"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "task_assigned",
  "task_status_changed",
  "task_mentioned",
  "project_added",
  "message_received",
]);

const createdAt = () =>
  timestamp("createdAt", { withTimezone: true }).defaultNow().notNull();

const updatedAt = () =>
  timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull();

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  avatarUrl: text("avatarUrl"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: userRoleEnum("role").default("staff").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    usedAt: timestamp("usedAt", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [index("password_reset_tokens_user_id_idx").on(table.userId)],
);

// Projects
export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 32 }).notNull().default("#6366f1"),
    ownerId: integer("ownerId")
      .notNull()
      .references(() => users.id),
    createdBy: integer("createdBy")
      .notNull()
      .references(() => users.id),
    startDate: timestamp("startDate", { withTimezone: true }),
    endDate: timestamp("endDate", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("projects_owner_id_idx").on(table.ownerId)],
);

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// Project Members
export const projectMembers = pgTable(
  "project_members",
  {
    id: serial("id").primaryKey(),
    projectId: integer("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: projectMemberRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joinedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("project_members_project_user_unique").on(
      table.projectId,
      table.userId,
    ),
    index("project_members_user_id_idx").on(table.userId),
    index("project_members_project_id_idx").on(table.projectId),
  ],
);

export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = typeof projectMembers.$inferInsert;

// Tasks
export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 512 }).notNull(),
    description: text("description"),
    status: taskStatusEnum("status").notNull().default("pending"),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    projectId: integer("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    assigneeId: integer("assigneeId").references(() => users.id, {
      onDelete: "set null",
    }),
    creatorId: integer("creatorId").notNull(),
    startDate: timestamp("startDate", { withTimezone: true }),
    dueDate: timestamp("dueDate", { withTimezone: true }),
    completedAt: timestamp("completedAt", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("tasks_project_id_idx").on(table.projectId),
    index("tasks_assignee_id_idx").on(table.assigneeId),
  ],
);

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// Chat Rooms
export const chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  type: chatRoomTypeEnum("type").notNull(),
  name: varchar("name", { length: 255 }),
  createdAt: createdAt(),
});

export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertChatRoom = typeof chatRooms.$inferInsert;

// Chat Room Members
export const chatRoomMembers = pgTable("chat_room_members", {
  id: serial("id").primaryKey(),
  roomId: integer("roomId").notNull(),
  userId: integer("userId").notNull(),
  joinedAt: timestamp("joinedAt", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ChatRoomMember = typeof chatRoomMembers.$inferSelect;
export type InsertChatRoomMember = typeof chatRoomMembers.$inferInsert;

// Messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  roomId: integer("roomId").notNull(),
  senderId: integer("senderId").notNull(),
  content: text("content").notNull(),
  isEdited: boolean("isEdited").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  body: text("body"),
  isRead: boolean("isRead").notNull().default(false),
  relatedTaskId: integer("relatedTaskId"),
  relatedProjectId: integer("relatedProjectId"),
  actorId: integer("actorId"),
  createdAt: createdAt(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Activities
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  description: text("description").notNull(),
  relatedTaskId: integer("relatedTaskId"),
  relatedProjectId: integer("relatedProjectId"),
  createdAt: createdAt(),
});

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;

// Immutable security-relevant events. Metadata stores a small JSON snapshot
// such as the old/new role or the affected member id.
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorId: integer("actorId").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 64 }).notNull(),
    entityType: varchar("entityType", { length: 64 }).notNull(),
    entityId: integer("entityId"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (table) => [index("audit_logs_actor_id_idx").on(table.actorId)],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
