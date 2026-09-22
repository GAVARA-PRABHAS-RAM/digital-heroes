/**
 * ==============================================================================
 * PRIZE POOL & TIER ALLOCATION ENGINE
 * ==============================================================================
 * Calculates monthly prize distributions based on active subscriber counts,
 * configurable subscription contribution rates, and PRD Level 1 prize rules:
 *
 * Tier Allocations:
 * - 5-match: 40% of monthly prize pool + prior jackpot rollover
 * - 4-match: 35% of monthly prize pool
 * - 3-match: 25% of monthly prize pool
 *
 * Multi-Winner Splitting:
 * - Each tier pool is split equally among all verified winners in that tier.
 *
 * Jackpot Rollover:
 * - If there are zero 5-match winners, the entire 5-match pool (including previous
 *   rollovers) rolls forward to the next monthly draw.
 * - When a 5-match winner occurs, the full 5-match pool is awarded and next rollover resets to $0.00.
 *
 * Decimal Safety:
 * - Calculations are executed using integer cents to prevent floating-point errors.
 * ==============================================================================
 */

export interface PrizeCalculationInput {
  activeSubscribersCount: number;
  subscriptionPrice?: number; // Default $20.00
  prizePoolPercentage?: number; // Configurable, default 50.00%
  previousRollover?: number; // Prior unawarded 5-match jackpot
  winnerCounts: {
    tier5: number;
    tier4: number;
    tier3: number;
  };
}

export interface TierPrizeDistribution {
  tier: 5 | 4 | 3;
  percentage: number;
  baseAmount: number;
  rolloverAdded: number;
  totalPool: number;
  winnerCount: number;
  amountPerWinner: number;
  rolloverForward: number;
}

export interface PrizeCalculationResult {
  activeSubscribersCount: number;
  subscriptionPrice: number;
  prizePoolPercentage: number;
  grossSubscriptionRevenue: number;
  basePrizePool: number;
  previousRolloverAdded: number;
  totalPrizePoolWithRollover: number;
  nextRolloverAmount: number;
  tiers: {
    tier5: TierPrizeDistribution;
    tier4: TierPrizeDistribution;
    tier3: TierPrizeDistribution;
  };
}

/**
 * Calculates prize pool amounts, tier splits, and rollover forward.
 */
export function calculatePrizeDistribution(
  input: PrizeCalculationInput
): PrizeCalculationResult {
  const {
    activeSubscribersCount,
    subscriptionPrice = 20.0,
    prizePoolPercentage = 50.0,
    previousRollover = 0.0,
    winnerCounts,
  } = input;

  if (activeSubscribersCount < 0) throw new Error("Subscriber count cannot be negative");
  if (subscriptionPrice < 0) throw new Error("Subscription price cannot be negative");
  if (prizePoolPercentage < 0 || prizePoolPercentage > 100) {
    throw new Error("Prize pool percentage must be between 0 and 100");
  }
  if (previousRollover < 0) throw new Error("Rollover cannot be negative");

  // Integer cents calculations
  const priceInCents = Math.round(subscriptionPrice * 100);
  const grossRevenueCents = activeSubscribersCount * priceInCents;
  const basePoolCents = Math.round(grossRevenueCents * (prizePoolPercentage / 100));
  const prevRolloverCents = Math.round(previousRollover * 100);

  // Base tier allocations: 40%, 35%, 25%
  const tier5BaseCents = Math.round(basePoolCents * 0.4);
  const tier4BaseCents = Math.round(basePoolCents * 0.35);
  // Ensure the three tiers sum exactly to the basePoolCents
  const tier3BaseCents = Math.max(0, basePoolCents - tier5BaseCents - tier4BaseCents);

  // Tier 5 pool includes previous rollover
  const tier5TotalCents = tier5BaseCents + prevRolloverCents;
  const tier4TotalCents = tier4BaseCents;
  const tier3TotalCents = tier3BaseCents;

  // Tier 5: Split or Rollover
  let tier5AmountPerWinnerCents = 0;
  let nextRolloverCents = 0;
  if (winnerCounts.tier5 > 0) {
    tier5AmountPerWinnerCents = Math.floor(tier5TotalCents / winnerCounts.tier5);
    nextRolloverCents = 0;
  } else {
    tier5AmountPerWinnerCents = 0;
    nextRolloverCents = tier5TotalCents; // Rolls forward
  }

  // Tier 4: Split
  let tier4AmountPerWinnerCents = 0;
  if (winnerCounts.tier4 > 0) {
    tier4AmountPerWinnerCents = Math.floor(tier4TotalCents / winnerCounts.tier4);
  }

  // Tier 3: Split
  let tier3AmountPerWinnerCents = 0;
  if (winnerCounts.tier3 > 0) {
    tier3AmountPerWinnerCents = Math.floor(tier3TotalCents / winnerCounts.tier3);
  }

  return {
    activeSubscribersCount,
    subscriptionPrice,
    prizePoolPercentage,
    grossSubscriptionRevenue: grossRevenueCents / 100,
    basePrizePool: basePoolCents / 100,
    previousRolloverAdded: prevRolloverCents / 100,
    totalPrizePoolWithRollover: (basePoolCents + prevRolloverCents) / 100,
    nextRolloverAmount: nextRolloverCents / 100,
    tiers: {
      tier5: {
        tier: 5,
        percentage: 40,
        baseAmount: tier5BaseCents / 100,
        rolloverAdded: prevRolloverCents / 100,
        totalPool: tier5TotalCents / 100,
        winnerCount: winnerCounts.tier5,
        amountPerWinner: tier5AmountPerWinnerCents / 100,
        rolloverForward: nextRolloverCents / 100,
      },
      tier4: {
        tier: 4,
        percentage: 35,
        baseAmount: tier4BaseCents / 100,
        rolloverAdded: 0,
        totalPool: tier4TotalCents / 100,
        winnerCount: winnerCounts.tier4,
        amountPerWinner: tier4AmountPerWinnerCents / 100,
        rolloverForward: 0,
      },
      tier3: {
        tier: 3,
        percentage: 25,
        baseAmount: tier3BaseCents / 100,
        rolloverAdded: 0,
        totalPool: tier3TotalCents / 100,
        winnerCount: winnerCounts.tier3,
        amountPerWinner: tier3AmountPerWinnerCents / 100,
        rolloverForward: 0,
      },
    },
  };
}
