import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { hashPassword, signSessionToken, verifyPassword } from "./_core/auth";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addProjectMember,
  changeProjectOwner,
  createAuditLog,
  createActivity,
  createNotification,
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  getAllProjects,
  getAllUsers,
  getStaffUsers,
  getDashboardStats,
  getDirectRoomsForUser,
  getGlobalRoom,
  getUserByEmail,
  getUserById,
  getMessages,
  getNotificationsForUser,
  getOrCreateDirectRoom,
  getProjectById,
  getProjectMember,
  getProjectMembers,
  getProjectsForUser,
  getRecentActivities,
  getTaskById,
  getTasksForProject,
  getAllTasksForUser,
  getUnreadNotificationCount,
  isProjectMember,
  isRoomMember,
  markAllNotificationsRead,
  markNotificationRead,
  removeProjectMember,
  sendMessage,
  updateProject,
  updateTask,
  updateUserRole,
  upsertUser,
} from "./db";
import { isAcceptablePassword, toPublicUser } from "./security";
import {
  canCreateProject,
  canDeleteProject,
  canManageMembers,
  canManageTasks,
  canUpdateProject,
  canUpdateTaskStatus,
  canViewProject,
  isSuperAdmin,
} from "./permissions";

// â”€â”€â”€ Admin guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!canCreateProject(ctx.user.role))
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  return next({ ctx });
});

// â”€â”€â”€ Project access guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function assertProjectAccess(
  projectId: number,
  userId: number,
  userRole: "staff" | "admin" | "super_admin",
) {
  const project = await getProjectById(projectId);
  if (!project) throw new TRPCError({ code: "NOT_FOUND" });
  const membership = await getProjectMember(projectId, userId);
  if (!canViewProject({ id: userId, role: userRole }, project, membership))
    throw new TRPCError({ code: "FORBIDDEN", message: "Not a project member" });
}

// â”€â”€â”€ Chat room access guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// The global room is open to any authenticated user; direct (DM) rooms require
// the caller to actually be one of the two participants.
async function assertRoomAccess(roomId: number, userId: number) {
  const global = await getGlobalRoom();
  if (global && global.id === roomId) return;
  const ok = await isRoomMember(roomId, userId);
  if (!ok)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not a member of this room",
    });
}

export const appRouter = router({
  system: systemRouter,

  // â”€â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    login: publicProcedure
      .input(
        z.object({ email: z.string().email(), password: z.string().min(1) }),
      )
      .mutation(async ({ ctx, input }) => {
        const email = input.email.trim().toLowerCase();
        const user = await getUserByEmail(email);
        if (
          !user?.passwordHash ||
          !(await verifyPassword(input.password, user.passwordHash))
        ) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        const token = await signSessionToken(user.openId);
        ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));
        return { success: true, user: toPublicUser(user) } as const;
      }),
    register: publicProcedure
      .input(
        z.object({
          name: z.string().trim().min(1).max(255),
          email: z.string().email(),
          password: z
            .string()
            .refine(
              isAcceptablePassword,
              "Password must be at least 8 characters",
            ),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const email = input.email.trim().toLowerCase();
        if (await getUserByEmail(email)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email already exists",
          });
        }

        await upsertUser({
          openId: email,
          name: input.name,
          email,
          loginMethod: "password",
          passwordHash: await hashPassword(input.password),
          lastSignedIn: new Date(),
        });
        const user = await getUserByEmail(email);
        if (!user)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create account",
          });

        const token = await signSessionToken(user.openId);
        ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));
        return { success: true, user: toPublicUser(user) } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // â”€â”€â”€ Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!isSuperAdmin(ctx.user.role))
        throw new TRPCError({ code: "FORBIDDEN", message: "Super Admin only" });
      return (await getAllUsers()).map(toPublicUser);
    }),
    availableStaff: adminProcedure.query(async () => {
      return (await getStaffUsers()).map(toPublicUser);
    }),
    updateRole: protectedProcedure
      .input(
        z.object({
          userId: z.number(),
          role: z.enum(["staff", "admin", "super_admin"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!isSuperAdmin(ctx.user.role))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Super Admin only",
          });
        await updateUserRole(input.userId, input.role);
        await createAuditLog({
          actorId: ctx.user.id,
          action: "user_role_changed",
          entityType: "user",
          entityId: input.userId,
          metadata: { role: input.role },
        });
        return { success: true };
      }),
  }),

  // â”€â”€â”€ Projects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (isSuperAdmin(ctx.user.role)) return getAllProjects();
      return getProjectsForUser(ctx.user.id);
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertProjectAccess(input.id, ctx.user.id, ctx.user.role);
        return getProjectById(input.id);
      }),
    create: adminProcedure
      .input(
        z
          .object({
            name: z.string().min(1).max(255),
            description: z.string().optional(),
            color: z.string().optional(),
            startDate: z.coerce.date().optional(),
            endDate: z.coerce.date().optional(),
          })
          .refine(
            (project) =>
              !project.startDate ||
              !project.endDate ||
              project.endDate >= project.startDate,
            {
              message: "End date must be on or after start date",
              path: ["endDate"],
            },
          ),
      )
      .mutation(async ({ ctx, input }) => {
        const project = await createProject({
          name: input.name,
          description: input.description,
          color: input.color ?? "#6366f1",
          ownerId: ctx.user.id,
          createdBy: ctx.user.id,
          startDate: input.startDate,
          endDate: input.endDate,
        });
        await createActivity({
          userId: ctx.user.id,
          type: "project_created",
          description: `Created project "${input.name}"`,
          relatedProjectId: project?.id,
        });
        return project;
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          color: z.string().optional(),
          startDate: z.coerce.date().nullable().optional(),
          endDate: z.coerce.date().nullable().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        if (!canUpdateProject(ctx.user, project))
          throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        await updateProject(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        if (!canDeleteProject(ctx.user, project))
          throw new TRPCError({ code: "FORBIDDEN" });
        await deleteProject(input.id);
        await createAuditLog({
          actorId: ctx.user.id,
          action: "project_deleted",
          entityType: "project",
          entityId: input.id,
          metadata: { name: project.name },
        });
        return { success: true };
      }),
    getMembers: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertProjectAccess(input.projectId, ctx.user.id, ctx.user.role);
        return getProjectMembers(input.projectId);
      }),
    addMember: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          userId: z.number(),
          role: z.enum(["viewer", "member", "manager"]).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        if (!canManageMembers(ctx.user, project))
          throw new TRPCError({ code: "FORBIDDEN" });
        const target = await getUserById(input.userId);
        if (!target)
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        if (!isSuperAdmin(ctx.user.role) && target.role !== "staff")
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Admins may add Staff users only",
          });
        await addProjectMember(
          input.projectId,
          input.userId,
          input.role ?? "member",
        );
        await createAuditLog({
          actorId: ctx.user.id,
          action: "project_member_added",
          entityType: "project",
          entityId: input.projectId,
          metadata: { userId: input.userId, role: input.role ?? "member" },
        });
        await createNotification({
          userId: input.userId,
          type: "project_added",
          title: `Added to project "${project.name}"`,
          body: `You have been added to the project "${project.name}"`,
          relatedProjectId: input.projectId,
          actorId: ctx.user.id,
        });
        return { success: true };
      }),
    removeMember: protectedProcedure
      .input(z.object({ projectId: z.number(), userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        if (!canManageMembers(ctx.user, project))
          throw new TRPCError({ code: "FORBIDDEN" });
        if (project.ownerId === input.userId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Transfer ownership before removing the owner",
          });
        await removeProjectMember(input.projectId, input.userId);
        await createAuditLog({
          actorId: ctx.user.id,
          action: "project_member_removed",
          entityType: "project",
          entityId: input.projectId,
          metadata: { userId: input.userId },
        });
        return { success: true };
      }),
    changeOwner: protectedProcedure
      .input(z.object({ projectId: z.number(), ownerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!isSuperAdmin(ctx.user.role))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Super Admin only",
          });
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        await changeProjectOwner(input.projectId, input.ownerId);
        await createAuditLog({
          actorId: ctx.user.id,
          action: "project_owner_changed",
          entityType: "project",
          entityId: input.projectId,
          metadata: {
            previousOwnerId: project.ownerId,
            ownerId: input.ownerId,
          },
        });
        return { success: true };
      }),
  }),

  // â”€â”€â”€ Tasks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  tasks: router({
    list: protectedProcedure
      .input(
        z
          .object({
            projectId: z.number().optional(),
            status: z.string().optional(),
            priority: z.string().optional(),
            assigneeId: z.number().optional(),
            search: z.string().optional(),
          })
          .optional(),
      )
      .query(async ({ ctx, input }) => {
        if (input?.projectId) {
          await assertProjectAccess(
            input.projectId,
            ctx.user.id,
            ctx.user.role,
          );
          return getTasksForProject(input.projectId, {
            ...input,
            assigneeId:
              ctx.user.role === "staff" ? ctx.user.id : input.assigneeId,
          });
        }
        return getAllTasksForUser(ctx.user.id, {
          ...input,
          assigneeId:
            ctx.user.role === "staff" ? ctx.user.id : input?.assigneeId,
        });
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const task = await getTaskById(input.id);
        if (!task) throw new TRPCError({ code: "NOT_FOUND" });
        await assertProjectAccess(task.projectId, ctx.user.id, ctx.user.role);
        if (ctx.user.role === "staff" && task.assigneeId !== ctx.user.id)
          throw new TRPCError({ code: "FORBIDDEN" });
        return task;
      }),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(512),
          description: z.string().optional(),
          projectId: z.number(),
          assigneeId: z.number().optional(),
          priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
          startDate: z.string().optional(),
          dueDate: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        const membership = await getProjectMember(input.projectId, ctx.user.id);
        if (!canManageTasks(ctx.user, project, membership))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Task manager access required",
          });
        const task = await createTask({
          title: input.title,
          description: input.description,
          projectId: input.projectId,
          assigneeId: input.assigneeId,
          creatorId: ctx.user.id,
          priority: input.priority ?? "medium",
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        });
        await createActivity({
          userId: ctx.user.id,
          type: "task_created",
          description: `Created task "${input.title}"`,
          relatedTaskId: task?.id,
          relatedProjectId: input.projectId,
        });
        if (input.assigneeId && input.assigneeId !== ctx.user.id) {
          await createNotification({
            userId: input.assigneeId,
            type: "task_assigned",
            title: `Task assigned to you: "${input.title}"`,
            body: `You have been assigned a new task in the project.`,
            relatedTaskId: task?.id,
            relatedProjectId: input.projectId,
            actorId: ctx.user.id,
          });
        }
        return task;
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).max(512).optional(),
          description: z.string().optional(),
          status: z
            .enum(["pending", "approval", "processing", "done"])
            .optional(),
          priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
          assigneeId: z.number().nullable().optional(),
          startDate: z.string().nullable().optional(),
          dueDate: z.string().nullable().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const task = await getTaskById(input.id);
        if (!task) throw new TRPCError({ code: "NOT_FOUND" });
        await assertProjectAccess(task.projectId, ctx.user.id, ctx.user.role);
        const project = await getProjectById(task.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        const membership = await getProjectMember(task.projectId, ctx.user.id);
        const mayManage = canManageTasks(ctx.user, project, membership);
        if (!mayManage) {
          const keys = Object.keys(input).filter((key) => key !== "id");
          if (
            keys.some((key) => key !== "status") ||
            !input.status ||
            !canUpdateTaskStatus(ctx.user, task, false)
          )
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "You may only update the status of tasks assigned to you",
            });
        }
        const { id, startDate, dueDate, assigneeId, ...rest } = input;
        const updateData: any = { ...rest };
        if (startDate !== undefined)
          updateData.startDate = startDate ? new Date(startDate) : null;
        if (dueDate !== undefined)
          updateData.dueDate = dueDate ? new Date(dueDate) : null;
        if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
        await updateTask(id, updateData);

        // Notifications for status change
        if (input.status && input.status !== task.status) {
          await createActivity({
            userId: ctx.user.id,
            type: "task_status_changed",
            description: `Changed task "${task.title}" status to ${input.status}`,
            relatedTaskId: id,
            relatedProjectId: task.projectId,
          });
          if (task.assigneeId && task.assigneeId !== ctx.user.id) {
            await createNotification({
              userId: task.assigneeId,
              type: "task_status_changed",
              title: `Task "${task.title}" status changed to ${input.status}`,
              relatedTaskId: id,
              relatedProjectId: task.projectId,
              actorId: ctx.user.id,
            });
          }
          if (
            task.creatorId &&
            task.creatorId !== ctx.user.id &&
            task.creatorId !== task.assigneeId
          ) {
            await createNotification({
              userId: task.creatorId,
              type: "task_status_changed",
              title: `Task "${task.title}" status changed to ${input.status}`,
              relatedTaskId: id,
              relatedProjectId: task.projectId,
              actorId: ctx.user.id,
            });
          }
        }
        // Notification for assignment change
        if (
          input.assigneeId &&
          input.assigneeId !== task.assigneeId &&
          input.assigneeId !== ctx.user.id
        ) {
          await createNotification({
            userId: input.assigneeId,
            type: "task_assigned",
            title: `Task assigned to you: "${task.title}"`,
            relatedTaskId: id,
            relatedProjectId: task.projectId,
            actorId: ctx.user.id,
          });
        }
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const task = await getTaskById(input.id);
        if (!task) throw new TRPCError({ code: "NOT_FOUND" });
        const project = await getProjectById(task.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        const membership = await getProjectMember(task.projectId, ctx.user.id);
        if (!canManageTasks(ctx.user, project, membership))
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Task manager access required",
          });
        await deleteTask(input.id);
        await createActivity({
          userId: ctx.user.id,
          type: "task_deleted",
          description: `Deleted task "${task.title}"`,
          relatedProjectId: task.projectId,
        });
        return { success: true };
      }),
  }),

  // â”€â”€â”€ Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  chat: router({
    getGlobalRoom: protectedProcedure.query(async () => {
      return getGlobalRoom();
    }),
    getDirectRooms: protectedProcedure.query(async ({ ctx }) => {
      return getDirectRoomsForUser(ctx.user.id);
    }),
    getOrCreateDM: protectedProcedure
      .input(z.object({ otherUserId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return getOrCreateDirectRoom(ctx.user.id, input.otherUserId);
      }),
    getMessages: protectedProcedure
      .input(z.object({ roomId: z.number(), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        await assertRoomAccess(input.roomId, ctx.user.id);
        return getMessages(input.roomId, input.limit ?? 50);
      }),
    sendMessage: protectedProcedure
      .input(z.object({ roomId: z.number(), content: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await assertRoomAccess(input.roomId, ctx.user.id);
        return sendMessage({
          roomId: input.roomId,
          senderId: ctx.user.id,
          content: input.content,
        });
      }),
  }),

  // â”€â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getNotificationsForUser(ctx.user.id);
    }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return getUnreadNotificationCount(ctx.user.id);
    }),
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // â”€â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      return getDashboardStats(ctx.user.id, ctx.user.role);
    }),
    recentActivity: protectedProcedure.query(async ({ ctx }) => {
      return getRecentActivities(ctx.user.id, 20);
    }),
  }),
});

export type AppRouter = typeof appRouter;
