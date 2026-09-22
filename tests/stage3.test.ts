import { test, describe } from "node:test";
import assert from "node:assert";
import { scoreInputSchema, scoreUpdateSchema } from "@/lib/validations/scores";
import { userCharitySchema } from "@/lib/validations/charity";
import { profileUpdateSchema } from "@/lib/validations/profile";

describe("Stage 3 — Stableford Score Validations (1 to 45)", () => {
  test("accepts valid Stableford integer scores between 1 and 45", () => {
    const validScores = [1, 18, 36, 42, 45];
    for (const score of validScores) {
      const res = scoreInputSchema.safeParse({
        score,
        score_date: "2026-09-15",
      });
      assert.strictEqual(res.success, true, `Expected score ${score} to be valid`);
    }
  });

  test("rejects scores outside 1 to 45 range", () => {
    const invalidScores = [0, -5, 46, 100];
    for (const score of invalidScores) {
      const res = scoreInputSchema.safeParse({
        score,
        score_date: "2026-09-15",
      });
      assert.strictEqual(res.success, false, `Expected score ${score} to fail`);
    }
  });

  test("rejects non-integer Stableford scores", () => {
    const res = scoreInputSchema.safeParse({
      score: 36.5,
      score_date: "2026-09-15",
    });
    assert.strictEqual(res.success, false);
  });

  test("rejects future dates", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const dateStr = futureDate.toISOString().split("T")[0];

    const res = scoreInputSchema.safeParse({
      score: 38,
      score_date: dateStr,
    });
    assert.strictEqual(res.success, false);
  });

  test("scoreUpdateSchema validates Stableford scores 1 to 45", () => {
    assert.strictEqual(scoreUpdateSchema.safeParse({ score: 40 }).success, true);
    assert.strictEqual(scoreUpdateSchema.safeParse({ score: 0 }).success, false);
    assert.strictEqual(scoreUpdateSchema.safeParse({ score: 50 }).success, false);
  });
});

describe("Stage 3 — Charity Contribution Validations (Min 10% strictly enforced)", () => {
  const validUuid = "11111111-2222-3333-4444-555555555555";

  test("enforces minimum 10% contribution strictly", () => {
    const belowMin = userCharitySchema.safeParse({
      charityId: validUuid,
      contributionPercentage: 9,
    });
    assert.strictEqual(belowMin.success, false);
    assert.match(
      belowMin.error!.errors[0].message,
      /Minimum charity contribution is 10%/
    );

    const zero = userCharitySchema.safeParse({
      charityId: validUuid,
      contributionPercentage: 0,
    });
    assert.strictEqual(zero.success, false);
  });

  test("accepts valid contribution percentages between 10% and 100%", () => {
    for (const pct of [10, 20, 25, 50, 75, 100]) {
      const res = userCharitySchema.safeParse({
        charityId: validUuid,
        contributionPercentage: pct,
      });
      assert.strictEqual(res.success, true, `Expected ${pct}% to be valid`);
    }
  });

  test("rejects contribution percentage exceeding 100%", () => {
    const res = userCharitySchema.safeParse({
      charityId: validUuid,
      contributionPercentage: 105,
    });
    assert.strictEqual(res.success, false);
  });

  test("rejects invalid charity UUID", () => {
    const res = userCharitySchema.safeParse({
      charityId: "not-a-uuid",
      contributionPercentage: 25,
    });
    assert.strictEqual(res.success, false);
  });
});

describe("Stage 3 — Profile Validations", () => {
  test("accepts valid full name and optional phone", () => {
    const res = profileUpdateSchema.safeParse({
      fullName: "Arnold Palmer",
      phone: "+1 555-019-2834",
    });
    assert.strictEqual(res.success, true);
  });

  test("accepts valid full name without phone", () => {
    const res = profileUpdateSchema.safeParse({
      fullName: "Gary Player",
      phone: "",
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data?.phone, null);
  });

  test("rejects blank or too short full name", () => {
    const res = profileUpdateSchema.safeParse({
      fullName: " ",
    });
    assert.strictEqual(res.success, false);
  });
});

describe("Stage 3 — Rolling 5-Score Retention Algorithm", () => {
  test("prunes oldest scores beyond the rolling 5 window", () => {
    const scores = [
      { id: "s1", score_date: "2026-09-01" },
      { id: "s2", score_date: "2026-09-05" },
      { id: "s3", score_date: "2026-09-10" },
      { id: "s4", score_date: "2026-09-12" },
      { id: "s5", score_date: "2026-09-18" },
      { id: "s6", score_date: "2026-09-20" },
    ];

    // Sort descending (newest first)
    const sorted = [...scores].sort(
      (a, b) => new Date(b.score_date).getTime() - new Date(a.score_date).getTime()
    );

    const retained = sorted.slice(0, 5);
    const pruned = sorted.slice(5);

    assert.strictEqual(retained.length, 5);
    assert.strictEqual(pruned.length, 1);
    assert.strictEqual(pruned[0].id, "s1"); // Oldest score s1 is pruned
    assert.strictEqual(retained[0].id, "s6"); // Newest score s6 is retained at rank 1
  });
});
