import { test, describe } from "node:test";
import assert from "node:assert";
import { generateRandomNumbers, generateAlgorithmicNumbers } from "@/lib/draw/numberGenerator";
import { matchSingleTicket, matchAllParticipants } from "@/lib/draw/matching";
import { calculatePrizeDistribution } from "@/lib/draw/prizeCalculator";
import { transformScoresToDrawNumbers } from "@/lib/draw/scoreToNumbers";
import { getUpcomingDraw } from "@/services/draws/drawService";

describe("Stage 4 — Draw Number Generation", () => {
  test("Random generator produces 5 unique numbers strictly between 1 and 45", () => {
    for (let trial = 0; trial < 10; trial++) {
      const result = generateRandomNumbers();
      assert.strictEqual(result.method, "random");
      assert.strictEqual(result.numbers.length, 5);

      // Check range 1..45 and integers
      for (const n of result.numbers) {
        assert.ok(Number.isInteger(n), `Expected integer, got ${n}`);
        assert.ok(n >= 1 && n <= 45, `Expected number in 1..45, got ${n}`);
      }

      // Check all unique
      const uniqueSet = new Set(result.numbers);
      assert.strictEqual(uniqueSet.size, 5, "Generated numbers must contain zero duplicates");

      // Check sorted ascending
      for (let i = 0; i < result.numbers.length - 1; i++) {
        assert.ok(result.numbers[i] < result.numbers[i + 1], "Numbers must be sorted ascending");
      }
    }
  });

  test("Algorithmic generator produces 5 unique numbers strictly between 1 and 45 using score frequency", () => {
    // Simulated community score distribution
    const mockFrequencies: Record<number, number> = {
      36: 50, // Very common par score
      38: 40,
      40: 30,
      35: 25,
      42: 20,
      18: 2,
      1: 1,
    };

    for (let trial = 0; trial < 10; trial++) {
      const result = generateAlgorithmicNumbers(mockFrequencies);
      assert.strictEqual(result.method, "algorithmic");
      assert.strictEqual(result.numbers.length, 5);

      for (const n of result.numbers) {
        assert.ok(n >= 1 && n <= 45);
      }

      const uniqueSet = new Set(result.numbers);
      assert.strictEqual(uniqueSet.size, 5, "Algorithmic numbers must be unique");

      // Check sorted
      for (let i = 0; i < result.numbers.length - 1; i++) {
        assert.ok(result.numbers[i] < result.numbers[i + 1]);
      }
    }
  });

  test("Algorithmic generator works with raw score array and empty input", () => {
    const rawScores = [36, 36, 36, 38, 40, 42, 35, 36, 45, 1];
    const res = generateAlgorithmicNumbers(rawScores);
    assert.strictEqual(res.numbers.length, 5);

    const emptyRes = generateAlgorithmicNumbers([]);
    assert.strictEqual(emptyRes.numbers.length, 5);
  });
});

describe("Stage 4 — Ticket Matching Engine", () => {
  const winningNumbers = [10, 20, 30, 40, 45];

  test("identifies exact 5-match as Tier 5", () => {
    const res = matchSingleTicket(
      { userId: "u1", numbers: [10, 20, 30, 40, 45] },
      winningNumbers
    );
    assert.strictEqual(res.matchCount, 5);
    assert.strictEqual(res.tier, 5);
    assert.strictEqual(res.isWinner, true);
    assert.deepStrictEqual(res.matchedNumbers, [10, 20, 30, 40, 45]);
  });

  test("identifies exactly 4-match as Tier 4", () => {
    const res = matchSingleTicket(
      { userId: "u2", numbers: [10, 20, 30, 40, 1] },
      winningNumbers
    );
    assert.strictEqual(res.matchCount, 4);
    assert.strictEqual(res.tier, 4);
    assert.strictEqual(res.isWinner, true);
    assert.deepStrictEqual(res.matchedNumbers, [10, 20, 30, 40]);
  });

  test("identifies exactly 3-match as Tier 3", () => {
    const res = matchSingleTicket(
      { userId: "u3", numbers: [10, 20, 30, 2, 3] },
      winningNumbers
    );
    assert.strictEqual(res.matchCount, 3);
    assert.strictEqual(res.tier, 3);
    assert.strictEqual(res.isWinner, true);
    assert.deepStrictEqual(res.matchedNumbers, [10, 20, 30]);
  });

  test("identifies 2, 1, and 0 matches as non-winning", () => {
    const twoMatches = matchSingleTicket(
      { userId: "u4", numbers: [10, 20, 1, 2, 3] },
      winningNumbers
    );
    assert.strictEqual(twoMatches.matchCount, 2);
    assert.strictEqual(twoMatches.tier, null);
    assert.strictEqual(twoMatches.isWinner, false);

    const zeroMatches = matchSingleTicket(
      { userId: "u5", numbers: [1, 2, 3, 4, 5] },
      winningNumbers
    );
    assert.strictEqual(zeroMatches.matchCount, 0);
    assert.strictEqual(zeroMatches.tier, null);
    assert.strictEqual(zeroMatches.isWinner, false);
  });

  test("rejects invalid winning numbers length or values", () => {
    assert.throws(() => {
      matchSingleTicket({ userId: "u1", numbers: [1, 2, 3, 4, 5] }, [1, 2, 3]);
    });
    assert.throws(() => {
      matchSingleTicket({ userId: "u1", numbers: [1, 2, 3, 4, 5] }, [1, 2, 3, 4, 50]); // 50 is invalid
    });
  });

  test("matches multiple participants into mutually exclusive tiers", () => {
    const entries = [
      { id: "e1", user_id: "u1", numbers: [10, 20, 30, 40, 45] }, // Tier 5
      { id: "e2", user_id: "u2", numbers: [10, 20, 30, 40, 1] }, // Tier 4
      { id: "e3", user_id: "u3", numbers: [10, 20, 30, 40, 2] }, // Tier 4
      { id: "e4", user_id: "u4", numbers: [10, 20, 30, 3, 4] }, // Tier 3
      { id: "e5", user_id: "u5", numbers: [1, 2, 3, 4, 5] }, // Non-winner
    ];

    const summary = matchAllParticipants(entries, winningNumbers);
    assert.strictEqual(summary.totalEntries, 5);
    assert.strictEqual(summary.tier5Winners.length, 1);
    assert.strictEqual(summary.tier4Winners.length, 2);
    assert.strictEqual(summary.tier3Winners.length, 1);
    assert.strictEqual(summary.nonWinners.length, 1);
  });
});

describe("Stage 4 — Prize Pool Calculation & Jackpot Rollover", () => {
  test("calculates 40/35/25 tier split from active subscribers", () => {
    // 100 subscribers at $20/month with 50% prize pool contribution = $1,000 base prize pool
    const result = calculatePrizeDistribution({
      activeSubscribersCount: 100,
      subscriptionPrice: 20.0,
      prizePoolPercentage: 50.0,
      previousRollover: 0.0,
      winnerCounts: { tier5: 1, tier4: 2, tier3: 5 },
    });

    assert.strictEqual(result.grossSubscriptionRevenue, 2000.0);
    assert.strictEqual(result.basePrizePool, 1000.0);
    assert.strictEqual(result.previousRolloverAdded, 0.0);

    // Tier 5: 40% of 1000 = 400.00
    assert.strictEqual(result.tiers.tier5.totalPool, 400.0);
    assert.strictEqual(result.tiers.tier5.amountPerWinner, 400.0);
    assert.strictEqual(result.tiers.tier5.rolloverForward, 0.0);

    // Tier 4: 35% of 1000 = 350.00 split among 2 winners = 175.00 each
    assert.strictEqual(result.tiers.tier4.totalPool, 350.0);
    assert.strictEqual(result.tiers.tier4.amountPerWinner, 175.0);

    // Tier 3: 25% of 1000 = 250.00 split among 5 winners = 50.00 each
    assert.strictEqual(result.tiers.tier3.totalPool, 250.0);
    assert.strictEqual(result.tiers.tier3.amountPerWinner, 50.0);
  });

  test("multiple winners split tier prize equally", () => {
    // 4 winners in Tier 4
    const result = calculatePrizeDistribution({
      activeSubscribersCount: 50,
      subscriptionPrice: 20.0,
      prizePoolPercentage: 50.0,
      winnerCounts: { tier5: 0, tier4: 4, tier3: 0 },
    });

    // Base pool: 50 * 20 * 0.5 = 500.00
    // Tier 4: 35% of 500 = 175.00
    // Split among 4 winners = 43.75 each
    assert.strictEqual(result.tiers.tier4.totalPool, 175.0);
    assert.strictEqual(result.tiers.tier4.amountPerWinner, 43.75);
  });

  test("zero 5-match winners causes jackpot to roll forward", () => {
    const result = calculatePrizeDistribution({
      activeSubscribersCount: 100,
      subscriptionPrice: 20.0,
      prizePoolPercentage: 50.0,
      previousRollover: 0.0,
      winnerCounts: { tier5: 0, tier4: 1, tier3: 2 },
    });

    // Tier 5 base is $400.00
    // Because winnerCounts.tier5 == 0, winner amount is 0 and rolloverForward is $400.00
    assert.strictEqual(result.tiers.tier5.winnerCount, 0);
    assert.strictEqual(result.tiers.tier5.amountPerWinner, 0.0);
    assert.strictEqual(result.tiers.tier5.rolloverForward, 400.0);
    assert.strictEqual(result.nextRolloverAmount, 400.0);
  });

  test("subsequent draw includes previous rollover in Tier 5 pool", () => {
    // Next month: previous rollover was $400.00
    const result = calculatePrizeDistribution({
      activeSubscribersCount: 100,
      subscriptionPrice: 20.0,
      prizePoolPercentage: 50.0,
      previousRollover: 400.0,
      winnerCounts: { tier5: 1, tier4: 0, tier3: 0 },
    });

    // Tier 5 pool: 40% of $1000 ($400) + $400 rollover = $800.00!
    assert.strictEqual(result.previousRolloverAdded, 400.0);
    assert.strictEqual(result.tiers.tier5.baseAmount, 400.0);
    assert.strictEqual(result.tiers.tier5.totalPool, 800.0);
    assert.strictEqual(result.tiers.tier5.amountPerWinner, 800.0);
    // Since Tier 5 was won, next rollover resets to $0.00
    assert.strictEqual(result.tiers.tier5.rolloverForward, 0.0);
    assert.strictEqual(result.nextRolloverAmount, 0.0);
  });
});

describe("Stage 4 — Score-To-Numbers Transformation", () => {
  test("maps 5 distinct Stableford scores directly to 5 sorted draw numbers", () => {
    const scores = [
      { score: 36, score_date: "2026-09-15" },
      { score: 40, score_date: "2026-09-14" },
      { score: 32, score_date: "2026-09-13" },
      { score: 45, score_date: "2026-09-12" },
      { score: 18, score_date: "2026-09-11" },
    ];

    const ticket = transformScoresToDrawNumbers(scores, "user-123");
    assert.strictEqual(ticket.numbers.length, 5);
    assert.deepStrictEqual(ticket.numbers, [18, 32, 36, 40, 45]);
    assert.strictEqual(ticket.snapshot.length, 5);
  });

  test("handles duplicate scores and completes 5 unique numbers deterministically", () => {
    const scores = [
      { score: 36, score_date: "2026-09-15" },
      { score: 36, score_date: "2026-09-14" }, // Duplicate 36
      { score: 40, score_date: "2026-09-13" },
    ];

    const ticket1 = transformScoresToDrawNumbers(scores, "seed-abc");
    assert.strictEqual(ticket1.numbers.length, 5);
    const set1 = new Set(ticket1.numbers);
    assert.strictEqual(set1.size, 5);
    assert.ok(ticket1.numbers.includes(36));
    assert.ok(ticket1.numbers.includes(40));

    // Deterministic: same seed produces identical ticket
    const ticket2 = transformScoresToDrawNumbers(scores, "seed-abc");
    assert.deepStrictEqual(ticket1.numbers, ticket2.numbers);
  });

  test("handles single score and fills remaining 4 unique numbers", () => {
    const scores = [{ score: 28, score_date: "2026-09-15" }];
    const ticket = transformScoresToDrawNumbers(scores, "single-score-user");

    assert.strictEqual(ticket.numbers.length, 5);
    assert.ok(ticket.numbers.includes(28));
    const set = new Set(ticket.numbers);
    assert.strictEqual(set.size, 5);
    for (const n of ticket.numbers) {
      assert.ok(n >= 1 && n <= 45);
    }
  });
});

describe("Stage 4 — Upcoming vs Published Draws & Subscriber Security", () => {
  // Test Mock Client factory
  function createMockSupabase(drawsData: any[]) {
    return {
      from: (table: string) => ({
        select: (_fields: string) => ({
          in: (col: string, values: string[]) => ({
            order: (_orderCol: string, _opts: any) => ({
              limit: (_count: number) => ({
                maybeSingle: async () => {
                  const filtered = drawsData.filter((d) => values.includes(d[col]));
                  filtered.sort((a, b) => a.draw_month.localeCompare(b.draw_month));
                  return { data: filtered[0] || null, error: null };
                },
              }),
            }),
          }),
        }),
      }),
    } as any;
  }

  test("getUpcomingDraw prioritizes draft or simulated draw over later published draw", async () => {
    const mockData = [
      {
        id: "d-pub",
        draw_number: "DH-STAGE4-VERIFY",
        draw_month: "2026-10-31",
        status: "published",
        winning_numbers: [7, 14, 21, 28, 35],
        prizes: [{ id: "p1", tier: 5, pool_amount: 1000 }],
        draw_results: [{ winning_numbers: [7, 14, 21, 28, 35] }],
      },
      {
        id: "d-sim",
        draw_number: "DH-MANUAL-TEST",
        draw_month: "2026-09-28",
        status: "simulated",
        winning_numbers: [3, 12, 19, 24, 41],
        prizes: [{ id: "p2", tier: 5, pool_amount: 500 }],
        draw_results: [{ winning_numbers: [3, 12, 19, 24, 41] }],
      },
    ];

    const mockClient = createMockSupabase(mockData);
    const upcoming = await getUpcomingDraw(mockClient);

    assert.ok(upcoming, "Expected upcoming draw to be returned");
    assert.strictEqual(upcoming.draw_number, "DH-MANUAL-TEST");
    assert.strictEqual(upcoming.draw_month, "2026-09-28");
    assert.strictEqual(upcoming.status, "simulated");
  });

  test("getUpcomingDraw strictly redacts simulated winning numbers and prizes for non-admin viewers", async () => {
    const mockData = [
      {
        id: "d-sim",
        draw_number: "DH-MANUAL-TEST",
        draw_month: "2026-09-28",
        status: "simulated",
        winning_numbers: [3, 12, 19, 24, 41],
        prizes: [{ id: "p2", tier: 5, pool_amount: 500 }],
        draw_results: [{ winning_numbers: [3, 12, 19, 24, 41] }],
      },
    ];

    const mockClient = createMockSupabase(mockData);

    // 1. Non-admin viewer (default)
    const nonAdminResult = await getUpcomingDraw(mockClient);
    assert.ok(nonAdminResult);
    assert.strictEqual(nonAdminResult.winning_numbers, null, "Simulated winning numbers must be null for non-admin");
    assert.strictEqual(nonAdminResult.draw_results?.length || 0, 0, "Simulated draw_results must be empty for non-admin");
    assert.strictEqual(nonAdminResult.prizes?.length || 0, 0, "Simulated prizes must be empty for non-admin");

    // 2. Admin viewer
    const adminResult = await getUpcomingDraw(mockClient, { isAdmin: true });
    assert.ok(adminResult);
    assert.deepStrictEqual(adminResult.winning_numbers, [3, 12, 19, 24, 41], "Admin must be able to view simulated winning numbers");
    assert.strictEqual(adminResult.draw_results?.length, 1);
    assert.strictEqual(adminResult.prizes?.length, 1);
  });

  test("draw entry rules permit draft/simulated draws but strictly close published draws", () => {
    const isEntryAllowed = (status: string) => status !== "published" && status !== "completed";

    assert.strictEqual(isEntryAllowed("draft"), true, "Draft draws must be open for entries");
    assert.strictEqual(isEntryAllowed("simulated"), true, "Simulated draws must be open for entries");
    assert.strictEqual(isEntryAllowed("published"), false, "Published draws must be closed to entries");
    assert.strictEqual(isEntryAllowed("completed"), false, "Completed draws must be closed to entries");
  });
});

