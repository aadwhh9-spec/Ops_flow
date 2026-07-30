import { describe, expect, it } from "vitest";
import { getDaysRemaining } from "./utils";

describe("getDaysRemaining", () => {
  const now = new Date("2026-07-30T00:00:00Z");

  it("returns the remaining number of days", () => {
    expect(getDaysRemaining("2026-08-02T00:00:00Z", now)).toEqual({
      text: "3 days remaining",
      isOverdue: false,
    });
  });

  it("marks past dates as overdue", () => {
    expect(getDaysRemaining("2026-07-28T00:00:00Z", now)).toEqual({
      text: "Overdue by 2 days",
      isOverdue: true,
    });
  });

  it("handles invalid dates without leaking NaN into the UI", () => {
    expect(getDaysRemaining("", now)).toEqual({
      text: "No due date",
      isOverdue: false,
    });
  });
});
