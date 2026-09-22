import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DIGITAL HEROES — STRIPE SERVER INTEGRATION (TEST MODE - INR)
 * 
 * SECURITY INVARIANT:
 * - This module MUST only run on the server.
 * - STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are never exposed to client code.
 */
if (typeof window !== "undefined") {
  throw new Error("CRITICAL SECURITY VIOLATION: lib/stripe.ts imported in client context.");
}

// Configured INR test pricing amounts (Display and Calculation)
export const STRIPE_PLAN_CONFIG = {
  monthly: {
    plan: "monthly" as const,
    name: "Monthly Plan",
    amount: 1499, // ₹1,499
    amountPaise: 149900,
    currency: "inr",
    displayPrice: "₹1,499",
    interval: "month" as const,
    priceIdEnv: "STRIPE_MONTHLY_PRICE_ID",
  },
  yearly: {
    plan: "yearly" as const,
    name: "Annual Plan",
    amount: 14999, // ₹14,999 (Discounted: 12 × ₹1,499 = ₹17,988, saving ₹2,989)
    amountPaise: 1499900,
    currency: "inr",
    displayPrice: "₹14,999",
    interval: "year" as const,
    annualSaving: 2989,
    displaySaving: "₹2,989",
    priceIdEnv: "STRIPE_YEARLY_PRICE_ID",
  },
};

/**
 * Returns an initialized Stripe instance or null if secret key is missing.
 */
export function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }
  return new Stripe(secretKey, {
    apiVersion: "2026-08-26.dahlia",
    typescript: true,
  });
}

/**
 * Retrieves configured plan information including environment-specific Price IDs.
 */
export function getPlanDetails(plan: "monthly" | "yearly") {
  const config = STRIPE_PLAN_CONFIG[plan];
  const envPriceId =
    plan === "monthly"
      ? process.env.STRIPE_MONTHLY_PRICE_ID
      : process.env.STRIPE_YEARLY_PRICE_ID;

  return {
    ...config,
    priceId: envPriceId || null,
  };
}

/**
 * Creates or retrieves an existing Stripe Customer associated with the authenticated Supabase user.
 * Prevents creating duplicate customers for the same user.
 */
export async function createOrRetrieveStripeCustomer(
  userId: string,
  email: string,
  fullName?: string | null
): Promise<{ customerId: string | null; error?: string }> {
  const stripe = getStripeClient();
  if (!stripe) {
    return { customerId: null, error: "Stripe is not configured on the server." };
  }

  const supabaseAdmin = createAdminClient();

  // 1. Check if user already has a customer ID recorded in subscriptions
  const { data: existingSub } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingSub?.stripe_customer_id) {
    try {
      const customer = await stripe.customers.retrieve(existingSub.stripe_customer_id);
      if (!customer.deleted) {
        return { customerId: customer.id };
      }
    } catch {
      // Customer was deleted or invalid in Stripe; continue to create a new one
    }
  }

  // 2. Search Stripe directly by user ID metadata
  try {
    const search = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 1,
    });
    if (search.data.length > 0) {
      const found = search.data[0];
      return { customerId: found.id };
    }
  } catch {
    // Search API might not be indexed yet in test environment; proceed to search by email or create
  }

  // 3. Create new Stripe Customer
  try {
    const newCustomer = await stripe.customers.create({
      email,
      name: fullName || undefined,
      metadata: {
        userId,
      },
    });

    return { customerId: newCustomer.id };
  } catch (err) {
    console.error("Failed to create Stripe Customer:", err);
    return {
      customerId: null,
      error: err instanceof Error ? err.message : "Failed to create customer in Stripe",
    };
  }
}

/**
 * Creates a Stripe Checkout Session for subscription enrollment in Test Mode.
 */
export async function createStripeCheckoutSession({
  userId,
  userEmail,
  userName,
  plan,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  userEmail: string;
  userName?: string | null;
  plan: "monthly" | "yearly";
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string | null; sessionId?: string; error?: string }> {
  const stripe = getStripeClient();
  if (!stripe) {
    return {
      url: null,
      error: "Payment configuration is currently unavailable: Stripe payment gateway is not configured (STRIPE_SECRET_KEY missing).",
    };
  }

  // 1. Get or create Stripe Customer
  const { customerId, error: custErr } = await createOrRetrieveStripeCustomer(
    userId,
    userEmail,
    userName
  );

  if (custErr || !customerId) {
    return { url: null, error: custErr || "Could not link Stripe customer." };
  }

  const planInfo = getPlanDetails(plan);

  // 2. Validate Stripe Price ID from environment variables (Source of Truth)
  if (!planInfo.priceId) {
    return {
      url: null,
      error: `Payment configuration is currently unavailable: Stripe ${plan === "yearly" ? "Yearly" : "Monthly"} Price ID is not configured (${planInfo.priceIdEnv} missing). Please configure ${planInfo.priceIdEnv} in environment variables.`,
    };
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: planInfo.priceId, quantity: 1 },
  ];

  // 3. Create Checkout Session
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        userId,
        plan,
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
        },
      },
    });

    return { url: session.url, sessionId: session.id };
  } catch (err) {
    console.error("Stripe Checkout Session creation error:", err);
    return {
      url: null,
      error: err instanceof Error ? err.message : "Failed to create Checkout session",
    };
  }
}

/**
 * Creates a Stripe Customer Portal session for managing billing or canceling subscriptions.
 */
export async function createStripeCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url: string | null; error?: string }> {
  const stripe = getStripeClient();
  if (!stripe) {
    return { url: null, error: "Stripe is not configured." };
  }

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return { url: portal.url };
  } catch (err) {
    console.error("Stripe Portal session error:", err);
    return {
      url: null,
      error: err instanceof Error ? err.message : "Failed to open billing portal",
    };
  }
}

/**
 * Schedules cancellation of a subscription at the end of its current billing period.
 * Does NOT immediately revoke access; user remains active until period end.
 */
export async function cancelStripeSubscriptionAtPeriodEnd(
  stripeSubscriptionId: string
): Promise<{ success: boolean; subscription?: Stripe.Subscription; error?: string }> {
  const stripe = getStripeClient();
  if (!stripe) {
    return { success: false, error: "Stripe is not configured." };
  }

  try {
    const updated = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    return { success: true, subscription: updated };
  } catch (err) {
    console.error("Failed to cancel Stripe subscription at period end:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to schedule cancellation in Stripe",
    };
  }
}
