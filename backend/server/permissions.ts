import type { Project, ProjectMember, Task, User } from "../drizzle/schema";

export type UserRole = User["role"];

export function isSuperAdmin(role: UserRole) {
  return role === "super_admin";
}

export function canCreateProject(role: UserRole) {
  return role === "admin" || role === "super_admin";
}

export function canViewProject(
  user: Pick<User, "id" | "role">,
  project: Pick<Project, "ownerId">,
  membership?: Pick<ProjectMember, "role">,
) {
  return (
    isSuperAdmin(user.role) ||
    project.ownerId === user.id ||
    membership !== undefined
  );
}

export function canUpdateProject(
  user: Pick<User, "id" | "role">,
  project: Pick<Project, "ownerId">,
) {
  return (
    isSuperAdmin(user.role) ||
    (user.role === "admin" && project.ownerId === user.id)
  );
}

export const canDeleteProject = canUpdateProject;
export const canManageMembers = canUpdateProject;

export function canManageTasks(
  user: Pick<User, "id" | "role">,
  project: Pick<Project, "ownerId">,
  membership?: Pick<ProjectMember, "role">,
) {
  return (
    isSuperAdmin(user.role) ||
    (user.role === "admin" &&
      (project.ownerId === user.id || membership?.role === "manager"))
  );
}

export function canUpdateTaskStatus(
  user: Pick<User, "id" | "role">,
  task: Pick<Task, "assigneeId">,
  canManage: boolean,
) {
  return canManage || task.assigneeId === user.id;
}
