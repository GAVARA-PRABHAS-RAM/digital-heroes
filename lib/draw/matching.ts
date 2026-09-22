/**
 * ==============================================================================
 * TICKET MATCHING ENGINE
 * ==============================================================================
 * Evaluates participant tickets against the official winning draw numbers.
 *
 * Matching Tiers (PRD Level 1):
 * - Tier 5: Exactly 5 matched numbers
 * - Tier 4: Exactly 4 matched numbers
 * - Tier 3: Exactly 3 matched numbers
 * - Non-winning: 0, 1, or 2 matched numbers
 *
 * Strict Rule:
 * Tiers are mutually exclusive. A 5-match ticket qualifies ONLY for Tier 5,
 * and does not duplicate in Tier 4 or 3.
 * ==============================================================================
 */

export type PrizeTier = 5 | 4 | 3 | null;

export interface TicketMatchResult {
  entryId?: string;
  userId: string;
  numbers: number[];
  matchedNumbers: number[];
  matchCount: number;
  tier: PrizeTier;
  isWinner: boolean;
}

export interface MatchingSummary {
  totalEntries: number;
  tier5Winners: TicketMatchResult[];
  tier4Winners: TicketMatchResult[];
  tier3Winners: TicketMatchResult[];
  nonWinners: TicketMatchResult[];
  allResults: TicketMatchResult[];
}

/**
 * Matches a single participant's ticket against the official winning numbers.
 */
export function matchSingleTicket(
  ticket: { userId: string; numbers: number[]; entryId?: string },
  winningNumbers: number[]
): TicketMatchResult {
  if (!Array.isArray(winningNumbers) || winningNumbers.length !== 5) {
    throw new Error("Winning numbers must contain exactly 5 numbers");
  }

  if (!Array.isArray(ticket.numbers) || ticket.numbers.length !== 5) {
    throw new Error("Participant ticket must contain exactly 5 numbers");
  }

  // Validate number ranges (1-45)
  for (const n of winningNumbers) {
    if (!Number.isInteger(n) || n < 1 || n > 45) {
      throw new Error(`Invalid winning number: ${n}`);
    }
  }

  const winningSet = new Set(winningNumbers);

  // Determine matched numbers
  const matchedNumbers = ticket.numbers.filter((n) => winningSet.has(n));
  const matchCount = matchedNumbers.length;

  let tier: PrizeTier = null;
  if (matchCount === 5) tier = 5;
  else if (matchCount === 4) tier = 4;
  else if (matchCount === 3) tier = 3;

  return {
    entryId: ticket.entryId,
    userId: ticket.userId,
    numbers: [...ticket.numbers],
    matchedNumbers,
    matchCount,
    tier,
    isWinner: tier !== null,
  };
}

/**
 * Matches a collection of participant tickets and generates a categorized summary.
 */
export function matchAllParticipants(
  entries: { id?: string; user_id: string; numbers: number[] }[],
  winningNumbers: number[]
): MatchingSummary {
  const allResults = entries.map((entry) =>
    matchSingleTicket(
      {
        userId: entry.user_id,
        numbers: entry.numbers,
        entryId: entry.id,
      },
      winningNumbers
    )
  );

  const tier5Winners = allResults.filter((r) => r.tier === 5);
  const tier4Winners = allResults.filter((r) => r.tier === 4);
  const tier3Winners = allResults.filter((r) => r.tier === 3);
  const nonWinners = allResults.filter((r) => r.tier === null);

  return {
    totalEntries: entries.length,
    tier5Winners,
    tier4Winners,
    tier3Winners,
    nonWinners,
    allResults,
  };
}
