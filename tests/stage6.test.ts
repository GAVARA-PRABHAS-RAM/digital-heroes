import { test, describe } from "node:test";
import assert from "node:assert";
import { STRIPE_PLAN_CONFIG, getPlanDetails, createStripeCheckoutSession } from "@/lib/stripe";
import {
  hasActiveSubscription,
  upsertSubscriptionFromStripe,
} from "@/services/subscriptions/subscriptionService";
import { verifyActiveSubscription } from "@/lib/auth/session";

describe("Stage 6A — Stripe Plan Configuration & INR Discount Validation", () => {
  test("Monthly plan configured correctly at ₹1,499 in INR", () => {
    const monthly = STRIPE_PLAN_CONFIG.monthly;
    assert.strictEqual(monthly.plan, "monthly");
    assert.strictEqual(monthly.amount, 1499);
    assert.strictEqual(monthly.amountPaise, 149900);
    assert.strictEqual(monthly.currency, "inr");
    assert.strictEqual(monthly.displayPrice, "₹1,499");
    assert.strictEqual(monthly.interval, "month");
  });

  test("Yearly plan configured correctly at ₹14,999 with ₹2,989 annual discount", () => {
    const yearly = STRIPE_PLAN_CONFIG.yearly;
    assert.strictEqual(yearly.plan, "yearly");
    assert.strictEqual(yearly.amount, 14999);
    assert.strictEqual(yearly.amountPaise, 1499900);
    assert.strictEqual(yearly.currency, "inr");
    assert.strictEqual(yearly.displayPrice, "₹14,999");
    assert.strictEqual(yearly.interval, "year");

    // PRD discount verification:
    // 12 × ₹1,499 = ₹17,988
    // Yearly price = ₹14,999
    // Annual saving = ₹2,989
    const twelveMonthsTotal = STRIPE_PLAN_CONFIG.monthly.amount * 12;
    assert.strictEqual(twelveMonthsTotal, 17988);
    const expectedDiscount = twelveMonthsTotal - yearly.amount;
    assert.strictEqual(expectedDiscount, 2989);
    assert.strictEqual(yearly.annualSaving, 2989);
    assert.strictEqual(yearly.displaySaving, "₹2,989");
  });

  test("getPlanDetails reads custom environment variable price ID as source of truth", () => {
    // With env set
    process.env.STRIPE_MONTHLY_PRICE_ID = "price_monthly_env_truth_123";
    process.env.STRIPE_YEARLY_PRICE_ID = "price_yearly_env_truth_456";
    const monthlyWithEnv = getPlanDetails("monthly");
    const yearlyWithEnv = getPlanDetails("yearly");
    assert.strictEqual(monthlyWithEnv.priceId, "price_monthly_env_truth_123");
    assert.strictEqual(yearlyWithEnv.priceId, "price_yearly_env_truth_456");

    // Without env set - MUST NOT invent fake or fallback price IDs
    delete process.env.STRIPE_MONTHLY_PRICE_ID;
    delete process.env.STRIPE_YEARLY_PRICE_ID;
    const defaultMonthly = getPlanDetails("monthly");
    const defaultYearly = getPlanDetails("yearly");
    assert.strictEqual(defaultMonthly.priceId, null);
    assert.strictEqual(defaultMonthly.amount, 1499);
    assert.strictEqual(defaultYearly.priceId, null);
    assert.strictEqual(defaultYearly.amount, 14999);
  });

  test("createStripeCheckoutSession returns clear configuration error when credentials or price IDs are missing", async () => {
    // 1. Missing STRIPE_SECRET_KEY
    const origKey = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    const resNoKey = await createStripeCheckoutSession({
      userId: "u-1",
      userEmail: "test@example.com",
      plan: "monthly",
      successUrl: "http://localhost:3000/subscription?session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "http://localhost:3000/subscription?status=cancelled",
    });
    assert.strictEqual(resNoKey.url, null);
    assert.match(resNoKey.error || "", /STRIPE_SECRET_KEY/);
    assert.match(resNoKey.error || "", /Payment configuration is currently unavailable/);

    if (origKey) {
      process.env.STRIPE_SECRET_KEY = origKey;
    }
  });
});

describe("Stage 6A — Subscription Status Mapping & Lifecycle Logic", () => {
  function createMockSupabaseWithSub(subscription: any) {
    return {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: subscription, error: null }),
              }),
            }),
          }),
        }),
      }),
    } as any;
  }

  test("returns false for user with no subscription record", async () => {
    const client = createMockSupabaseWithSub(null);
    const isActive = await hasActiveSubscription("user-no-sub", client);
    assert.strictEqual(isActive, false);
  });

  test("returns true for active subscription", async () => {
    const client = createMockSupabaseWithSub({
      id: "sub-1",
      user_id: "user-active",
      status: "active",
      cancel_at_period_end: false,
    });
    const isActive = await hasActiveSubscription("user-active", client);
    assert.strictEqual(isActive, true);
  });

  test("returns true for trialing subscription", async () => {
    const client = createMockSupabaseWithSub({
      id: "sub-trial",
      user_id: "user-trial",
      status: "trialing",
      cancel_at_period_end: false,
    });
    const isActive = await hasActiveSubscription("user-trial", client);
    assert.strictEqual(isActive, true);
  });

  test("cancellation scheduled: remains active during paid period before current_period_end", async () => {
    // Period ends tomorrow
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const client = createMockSupabaseWithSub({
      id: "sub-cancel-scheduled",
      user_id: "user-grace",
      status: "active",
      cancel_at_period_end: true,
      current_period_end: futureDate,
    });

    const isActive = await hasActiveSubscription("user-grace", client);
    assert.strictEqual(isActive, true, "User must retain access while current_period_end is in the future");
  });

  test("cancellation scheduled: lapses after current_period_end has passed", async () => {
    // Period ended yesterday
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const client = createMockSupabaseWithSub({
      id: "sub-expired",
      user_id: "user-lapsed",
      status: "active",
      cancel_at_period_end: true,
      current_period_end: pastDate,
    });

    const isActive = await hasActiveSubscription("user-lapsed", client);
    assert.strictEqual(isActive, false, "User must lose subscriber access once current_period_end has passed");
  });

  test("returns false for cancelled or past_due subscriptions", async () => {
    for (const status of ["cancelled", "canceled", "past_due", "inactive", "lapsed"]) {
      const client = createMockSupabaseWithSub({
        id: `sub-${status}`,
        user_id: "user-1",
        status,
      });
      const isActive = await hasActiveSubscription("user-1", client);
      assert.strictEqual(isActive, false, `Status ${status} must not be considered active`);
    }
  });
});

describe("Stage 6A — Subscriber Access Gating & Admin Invariant", () => {
  test("administrators bypass subscriber requirement and have full access", async () => {
    const adminUser = {
      user: { id: "admin-id", email: "admin@test.com" } as any,
      profile: { id: "admin-id", role: "admin" } as any,
      role: "admin" as const,
    };

    const res = await verifyActiveSubscription(adminUser);
    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.reason, undefined);
  });
});

describe("Stage 6A — Idempotent Webhook Upsert Service", () => {
  test("creates new subscription on checkout completed event", async () => {
    let insertedPayload: any = null;

    const mockAdminClient = {
      from: (table: string) => {
        if (table === "subscriptions") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }), // None existing
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
            }),
            insert: (payload: any) => ({
              select: () => ({
                single: async () => {
                  insertedPayload = payload;
                  return { data: { id: "sub-new", ...payload }, error: null };
                },
              }),
            }),
          };
        }
        return {};
      },
    } as any;

    const res = await upsertSubscriptionFromStripe(
      {
        userId: "user-123",
        stripeCustomerId: "cus_test_123",
        stripeSubscriptionId: "sub_test_123",
        stripePriceId: "price_test_monthly",
        plan: "monthly",
        status: "active",
        price: 1499,
        currency: "INR",
        currentPeriodStart: "2026-09-21T00:00:00Z",
        currentPeriodEnd: "2026-10-21T00:00:00Z",
      },
      mockAdminClient
    );

    assert.strictEqual(res.success, true);
    assert.ok(insertedPayload);
    assert.strictEqual(insertedPayload.user_id, "user-123");
    assert.strictEqual(insertedPayload.price, 1499);
    assert.strictEqual(insertedPayload.currency, "INR");
    assert.strictEqual(insertedPayload.status, "active");
    assert.strictEqual(insertedPayload.stripe_customer_id, "cus_test_123");
    assert.strictEqual(insertedPayload.stripe_subscription_id, "sub_test_123");
  });

  test("idempotently updates existing subscription record on webhook retry", async () => {
    const existing = {
      id: "sub-db-1",
      user_id: "user-123",
      stripe_subscription_id: "sub_test_123",
      status: "active",
      price: 1499,
    };

    let updatedPayload: any = null;

    const mockAdminClient = {
      from: (table: string) => {
        if (table === "subscriptions") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: existing, error: null }),
              }),
            }),
            update: (payload: any) => ({
              eq: () => ({
                select: () => ({
                  single: async () => {
                    updatedPayload = payload;
                    return { data: { ...existing, ...payload }, error: null };
                  },
                }),
              }),
            }),
          };
        }
        return {};
      },
    } as any;

    const res = await upsertSubscriptionFromStripe(
      {
        userId: "user-123",
        stripeSubscriptionId: "sub_test_123",
        plan: "monthly",
        status: "active",
        price: 1499,
        currency: "INR",
        cancelAtPeriodEnd: true,
      },
      mockAdminClient
    );

    assert.strictEqual(res.success, true);
    assert.ok(updatedPayload);
    assert.strictEqual(updatedPayload.cancel_at_period_end, true);
  });
});
