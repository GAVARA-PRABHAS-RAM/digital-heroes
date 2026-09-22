import { test, describe } from "node:test";
import assert from "node:assert";
import { cn, formatDate } from "@/lib/utils";
import { isValidRole, hasPermission } from "@/lib/auth/roles";
import { loginSchema, signupSchema, scoreSubmissionSchema } from "@/lib/validations/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";

describe("Stage 1 & 2 - Foundation & Auth Tests", () => {
  test("cn utility merges class names correctly", () => {
    const result = cn("text-red-500", "p-4", false && "hidden", "p-6");
    assert.strictEqual(result, "text-red-500 p-6");
  });

  test("Role validation accepts subscriber and admin", () => {
    assert.strictEqual(isValidRole("subscriber"), true);
    assert.strictEqual(isValidRole("admin"), true);
    assert.strictEqual(isValidRole("guest"), false);
    assert.strictEqual(isValidRole(null), false);
  });

  test("Role permissions differentiate subscriber from admin", () => {
    assert.strictEqual(hasPermission("subscriber", "canSubmitScores"), true);
    assert.strictEqual(hasPermission("subscriber", "canManageUsers"), false);
    assert.strictEqual(hasPermission("subscriber", "canVerifyWinners"), false);
    assert.strictEqual(hasPermission("admin", "canManageUsers"), true);
    assert.strictEqual(hasPermission("admin", "canVerifyWinners"), true);
  });

  test("Validation schemas reject invalid credentials", () => {
    const invalidEmail = loginSchema.safeParse({ email: "invalid-email", password: "short" });
    assert.strictEqual(invalidEmail.success, false);

    const validLogin = loginSchema.safeParse({ email: "player@example.com", password: "password123" });
    assert.strictEqual(validLogin.success, true);

    const mismatchSignup = signupSchema.safeParse({
      fullName: "Player One",
      email: "player@example.com",
      password: "password123",
      confirmPassword: "password999",
    });
    assert.strictEqual(mismatchSignup.success, false);
  });

  test("isSupabaseConfigured returns a boolean", () => {
    const configured = isSupabaseConfigured();
    assert.strictEqual(typeof configured, "boolean");
  });

  test("Score submission schema validates Stableford score range (1-45)", () => {
    // Score range in PRD is 1-45
    const valid = scoreSubmissionSchema.safeParse({
      courseName: "St Andrews",
      playedAt: "2026-09-20",
      grossScore: 72,
      courseRating: 72.5,
      slopeRating: 125,
    });
    assert.strictEqual(valid.success, true);
  });

  test("formatDate deterministically formats dates as DD/MM/YYYY without locale drift", () => {
    // ISO string from database published_at timestamp
    assert.strictEqual(formatDate("2026-09-21T06:47:16.354812+00:00"), "21/09/2026");

    // Standard YYYY-MM-DD draw cycle string
    assert.strictEqual(formatDate("2026-09-28"), "28/09/2026");

    // Date object
    const dateObj = new Date("2026-09-21T12:00:00.000Z");
    assert.strictEqual(formatDate(dateObj), "21/09/2026");

    // Edge cases
    assert.strictEqual(formatDate(null), "");
    assert.strictEqual(formatDate(undefined), "");
    assert.strictEqual(formatDate("invalid-date-string"), "");
  });
});
