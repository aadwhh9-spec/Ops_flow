import type { User } from "../drizzle/schema";

export type PublicUser = Pick<User, "id" | "role"> & {
  name: string;
  email: string;
};

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name ?? user.email ?? "Member",
    email: user.email ?? "",
    role: user.role,
  };
}

export function isAcceptablePassword(password: string): boolean {
  return password.length >= 8;
}
