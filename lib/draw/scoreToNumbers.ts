/**
 * ==============================================================================
 * SCORE-TO-DRAW-NUMBERS TRANSFORMATION MODEL
 * ==============================================================================
 * PRD AMBIGUITY & ASSUMPTION DOCUMENTATION:
 * The PRD specifies that subscribers participate in monthly 5-number draws
 * using their latest eligible Stableford scores (valid range 1 to 45 points),
 * but does not define the mathematical mapping from scorecards to 5 draw numbers.
 *
 * LEVEL 1 ASSIGNMENT DESIGN DECISION:
 * 1. Stableford points (1–45) directly represent draw numbers (1–45).
 * 2. When a subscriber has 5 distinct scores logged, those 5 scores become their
 *    draw numbers (sorted in ascending order).
 * 3. If a subscriber has fewer than 5 rounds or duplicate score values across
 *    their rounds, the remaining unique numbers (1–45) are derived deterministically
 *    using a transparent seed hash (userId + drawId).
 * 4. All numbers are strictly unique within each ticket and bounded to [1, 45].
 * 5. The original scores, dates, and IDs are snapshotted to guarantee historical immutability.
 * ==============================================================================
 */

export interface ScoreLike {
  id?: string;
  score: number;
  score_date: string;
}

export interface TransformedTicket {
  numbers: number[]; // Exactly 5 unique integers between 1 and 45, sorted ascending
  snapshot: ScoreLike[]; // Snapshot of scores used to produce the ticket
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Transforms an array of Stableford scores into a 5-number draw ticket.
 */
export function transformScoresToDrawNumbers(
  scores: ScoreLike[],
  seed = "default-seed"
): TransformedTicket {
  // 1. Filter to valid Stableford scores (1 to 45)
  const validScores = (scores || []).filter(
    (s) => typeof s.score === "number" && Number.isInteger(s.score) && s.score >= 1 && s.score <= 45
  );

  // 2. Extract unique numbers preserving order
  const uniqueNumbers: number[] = [];
  for (const s of validScores) {
    if (!uniqueNumbers.includes(s.score)) {
      uniqueNumbers.push(s.score);
      if (uniqueNumbers.length === 5) break;
    }
  }

  // 3. If fewer than 5 unique numbers, deterministically fill up to 5 unique numbers (1 to 45)
  let pseudoState = simpleHash(seed || "dh-seed-fallback");
  while (uniqueNumbers.length < 5) {
    pseudoState = (pseudoState * 1664525 + 1013904223) % 4294967296;
    const candidate = (Math.abs(pseudoState) % 45) + 1;
    if (!uniqueNumbers.includes(candidate)) {
      uniqueNumbers.push(candidate);
    }
  }

  // 4. Sort ascending for uniform representation and matching
  uniqueNumbers.sort((a, b) => a - b);

  return {
    numbers: uniqueNumbers,
    snapshot: validScores.slice(0, 5),
  };
}
