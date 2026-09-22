import crypto from "crypto";

/**
 * ==============================================================================
 * DRAW NUMBER GENERATION ENGINE
 * ==============================================================================
 * Supports two distinct modes:
 *
 * 1. RANDOM GENERATION:
 *    Cryptographically secure random sampling of 5 distinct integers between 1 and 45.
 *
 * 2. ALGORITHMIC / WEIGHTED GENERATION:
 *    Weighted sampling without replacement based on historical community score
 *    frequencies across the platform.
 *
 * NOTE & PRD COMPLIANCE:
 * The algorithmic weighting reflects community play patterns via Laplace smoothing
 * (weight = frequency + 1). It does NOT alter the fairness or mathematical
 * house edge, and no claims of improved winning probability are made to subscribers.
 * ==============================================================================
 */

export interface GeneratorResult {
  numbers: number[]; // 5 unique numbers in [1, 45], ascending
  method: "random" | "algorithmic";
  auditDetails?: {
    frequenciesUsed?: Record<number, number>;
    seedOrTimestamp: string;
  };
}

/**
 * Generates 5 cryptographically secure random unique integers between 1 and 45.
 */
export function generateRandomNumbers(): GeneratorResult {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  const selected: number[] = [];

  while (selected.length < 5) {
    const randomIndex = crypto.randomInt(0, pool.length);
    const chosen = pool.splice(randomIndex, 1)[0];
    selected.push(chosen);
  }

  selected.sort((a, b) => a - b);

  return {
    numbers: selected,
    method: "random",
    auditDetails: {
      seedOrTimestamp: new Date().toISOString(),
    },
  };
}

/**
 * Generates 5 unique integers between 1 and 45 weighted by community score frequency.
 * Uses Laplace smoothing (count + 1) so unplayed numbers still have a non-zero probability.
 */
export function generateAlgorithmicNumbers(
  scoreFrequencies: Record<number, number> | number[] = {}
): GeneratorResult {
  // Normalize frequencies to a 1..45 dictionary
  const freqMap: Record<number, number> = {};
  for (let i = 1; i <= 45; i++) {
    freqMap[i] = 0;
  }

  if (Array.isArray(scoreFrequencies)) {
    for (const score of scoreFrequencies) {
      if (score >= 1 && score <= 45) {
        freqMap[score] = (freqMap[score] || 0) + 1;
      }
    }
  } else if (typeof scoreFrequencies === "object") {
    for (const [key, val] of Object.entries(scoreFrequencies)) {
      const num = parseInt(key, 10);
      if (num >= 1 && num <= 45) {
        freqMap[num] = Number(val) || 0;
      }
    }
  }

  // Available candidates: 1 to 45
  const available = Array.from({ length: 45 }, (_, i) => i + 1);
  const selected: number[] = [];

  while (selected.length < 5) {
    // Total weight of available numbers using Laplace smoothing (frequency + 1)
    const weights = available.map((num) => (freqMap[num] || 0) + 1);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    // Random roll in [0, totalWeight)
    const randomFloat = crypto.randomInt(0, 1000000) / 1000000;
    let threshold = randomFloat * totalWeight;

    let chosenIdx = 0;
    for (let i = 0; i < available.length; i++) {
      threshold -= weights[i];
      if (threshold <= 0 || i === available.length - 1) {
        chosenIdx = i;
        break;
      }
    }

    const chosen = available.splice(chosenIdx, 1)[0];
    selected.push(chosen);
  }

  selected.sort((a, b) => a - b);

  return {
    numbers: selected,
    method: "algorithmic",
    auditDetails: {
      frequenciesUsed: freqMap,
      seedOrTimestamp: new Date().toISOString(),
    },
  };
}
