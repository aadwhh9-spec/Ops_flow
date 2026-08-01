import { describe, expect, it } from "vitest";
import {
  canManageMembers,
  canManageTasks,
  canUpdateProject,
  canUpdateTaskStatus,
  canViewProject,
} from "./permissions";

const owner = { id: 1, role: "admin" as const };
const otherAdmin = { id: 2, role: "admin" as const };
const staff = { id: 3, role: "staff" as const };
const root = { id: 4, role: "super_admin" as const };
const project = { ownerId: owner.id };

describe("project authorization", () => {
  it("limits an admin to owned projects for project and member management", () => {
    expect(canUpdateProject(owner, project)).toBe(true);
    expect(canUpdateProject(otherAdmin, project)).toBe(false);
    expect(canManageMembers(otherAdmin, project)).toBe(false);
  });

  it("allows a member to view but only an admin manager to manage tasks", () => {
    expect(canViewProject(staff, project, { role: "member" })).toBe(true);
    expect(canManageTasks(staff, project, { role: "manager" })).toBe(false);
    expect(canManageTasks(otherAdmin, project, { role: "manager" })).toBe(true);
  });

  it("gives super admins global control", () => {
    expect(canUpdateProject(root, project)).toBe(true);
    expect(canManageTasks(root, project)).toBe(true);
  });

  it("lets staff update only their assigned task status", () => {
    expect(canUpdateTaskStatus(staff, { assigneeId: staff.id }, false)).toBe(
      true,
    );
    expect(canUpdateTaskStatus(staff, { assigneeId: 99 }, false)).toBe(false);
  });
});
