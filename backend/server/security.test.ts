import { describe, expect, it } from "vitest";
import type { User } from "../drizzle/schema";
import { isAcceptablePassword, toPublicUser } from "./security";

const databaseUser: User = {
  id: 7,
  openId: "member@example.com",
  name: "Example Member",
  email: "member@example.com",
  avatarUrl: null,
  loginMethod: "password",
  passwordHash: "secret-hash",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("toPublicUser", () => {
  it("returns only fields safe for clients and AI context", () => {
    const result = toPublicUser(databaseUser);
    expect(result).toEqual({
      id: 7,
      name: "Example Member",
      email: "member@example.com",
      role: "user",
    });
    expect(result).not.toHaveProperty("passwordHash");
    expect(result).not.toHaveProperty("openId");
  });
});

describe("isAcceptablePassword", () => {
  it("requires at least eight characters", () => {
    expect(isAcceptablePassword("1234567")).toBe(false);
    expect(isAcceptablePassword("12345678")).toBe(true);
  });
});
