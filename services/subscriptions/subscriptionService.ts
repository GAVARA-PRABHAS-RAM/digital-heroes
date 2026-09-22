import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelStripeSubscriptionAtPeriodEnd } from "@/lib/stripe";
import type { Subscription, SubscriptionPlan, SubscriptionStatus } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

function getClient(client?: SupabaseClient) {
  return client || createServerClient();
}

/**
 * Retrieves the latest subscription record for a user.
 * Returns null if the user has no subscription yet.
 */
export async function getUserSubscription(
  userId: string,
  client?: SupabaseClient
): Promise<Subscription | null> {
  const supabase = getClient(client);

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user subscription:", error);
    return null;
  }

  return (data as Subscription) || null;
}

/**
 * Validates whether a user holds a valid, active subscription.
 * Handles the period-end grace period if cancellation has been scheduled.
 */
export async function hasActiveSubscription(
  userId: string,
  client?: SupabaseClient
): Promise<boolean> {
  if (!userId) return false;

  const subscription = await getUserSubscription(userId, client);
  if (!subscription) return false;

  const status = subscription.status?.toLowerCase();

  // If status is not active or trialing, user is not an active subscriber
  if (status !== "active" && status !== "trialing") {
    return false;
  }

  // If cancellation is scheduled at period end, check if the paid period has expired
  if (subscription.cancel_at_period_end) {
    const periodEnd = subscription.current_period_end || subscription.renewal_date;
    if (periodEnd) {
      const expiryDate = new Date(periodEnd).getTime();
      const now = Date.now();
      // If now has passed expiryDate, access has lapsed
      if (now > expiryDate) {
        return false;
      }
    }
  }

  return true;
}

export interface UpsertSubscriptionData {
  userId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  price: number;
  currency: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string | null;
}

/**
 * Idempotently creates or updates a subscription record based on Stripe webhook events.
 * Uses the Supabase admin client to ensure write permissions under strict RLS.
 */
export async function upsertSubscriptionFromStripe(
  data: UpsertSubscriptionData,
  client?: SupabaseClient
): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
  const supabaseAdmin = client || createAdminClient();

  const payload: Record<string, any> = {
    user_id: data.userId,
    stripe_customer_id: data.stripeCustomerId || null,
    stripe_subscription_id: data.stripeSubscriptionId || null,
    stripe_price_id: data.stripePriceId || null,
    plan: data.plan,
    status: data.status,
    price: data.price,
    currency: data.currency || "INR",
    current_period_start: data.currentPeriodStart || null,
    current_period_end: data.currentPeriodEnd || null,
    renewal_date: data.currentPeriodEnd || null,
    cancel_at_period_end: Boolean(data.cancelAtPeriodEnd),
  };

  if (data.canceledAt) {
    payload.canceled_at = data.canceledAt;
    payload.cancelled_at = data.canceledAt;
  }

  // 1. Check if a subscription with this stripe_subscription_id already exists
  if (data.stripeSubscriptionId) {
    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("stripe_subscription_id", data.stripeSubscriptionId)
      .maybeSingle();

    if (existingSub) {
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("subscriptions")
        .update(payload)
        .eq("id", existingSub.id)
        .select()
        .single();

      if (updateErr) {
        console.error("Error updating existing subscription:", updateErr);
        return { success: false, error: updateErr.message };
      }

      return { success: true, subscription: updated as Subscription };
    }
  }

  // 2. Otherwise, check if user has an existing active or inactive subscription to update
  const { data: userLatestSub } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("user_id", data.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (userLatestSub) {
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("subscriptions")
      .update(payload)
      .eq("id", userLatestSub.id)
      .select()
      .single();

    if (updateErr) {
      // Fallback: if new columns don't exist yet, retry without new columns
      if (updateErr.message.includes("stripe_price_id") || updateErr.message.includes("cancel_at_period_end")) {
        const fallbackPayload = {
          user_id: data.userId,
          stripe_customer_id: data.stripeCustomerId || null,
          stripe_subscription_id: data.stripeSubscriptionId || null,
          plan: data.plan,
          status: data.status === "trialing" ? "active" : data.status,
          price: data.price,
          currency: data.currency || "INR",
          renewal_date: data.currentPeriodEnd || null,
        };
        const { data: fallbackUpdated, error: fallbackErr } = await supabaseAdmin
          .from("subscriptions")
          .update(fallbackPayload)
          .eq("id", userLatestSub.id)
          .select()
          .single();

        if (fallbackErr) return { success: false, error: fallbackErr.message };
        return { success: true, subscription: fallbackUpdated as Subscription };
      }
      return { success: false, error: updateErr.message };
    }

    return { success: true, subscription: updated as Subscription };
  }

  // 3. Insert new subscription record
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("subscriptions")
    .insert(payload)
    .select()
    .single();

  if (insertErr) {
    // Fallback: retry without new columns if schema migration not yet applied
    if (insertErr.message.includes("stripe_price_id") || insertErr.message.includes("cancel_at_period_end")) {
      const fallbackPayload = {
        user_id: data.userId,
        stripe_customer_id: data.stripeCustomerId || null,
        stripe_subscription_id: data.stripeSubscriptionId || null,
        plan: data.plan,
        status: data.status === "trialing" ? "active" : data.status,
        price: data.price,
        currency: data.currency || "INR",
        renewal_date: data.currentPeriodEnd || null,
      };
      const { data: fallbackInserted, error: fallbackErr } = await supabaseAdmin
        .from("subscriptions")
        .insert(fallbackPayload)
        .select()
        .single();

      if (fallbackErr) return { success: false, error: fallbackErr.message };
      return { success: true, subscription: fallbackInserted as Subscription };
    }
    console.error("Error inserting subscription:", insertErr);
    return { success: false, error: insertErr.message };
  }

  return { success: true, subscription: inserted as Subscription };
}

/**
 * Requests cancellation of a subscription at the end of the current billing period.
 * Does NOT immediately revoke subscriber access; access continues until current_period_end.
 */
export async function cancelUserSubscription(
  userId: string,
  client?: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  const supabase = getClient(client);

  const sub = await getUserSubscription(userId, supabase);
  if (!sub) {
    return { success: false, error: "No subscription found to cancel." };
  }

  if (sub.status !== "active" && sub.status !== "trialing") {
    return { success: false, error: "This subscription is not currently active." };
  }

  if (sub.cancel_at_period_end) {
    return { success: false, error: "Cancellation is already scheduled for this subscription." };
  }

  // 1. If connected to Stripe, update Stripe subscription
  if (sub.stripe_subscription_id) {
    const stripeRes = await cancelStripeSubscriptionAtPeriodEnd(sub.stripe_subscription_id);
    if (!stripeRes.success) {
      return { success: false, error: stripeRes.error };
    }
  }

  // 2. Update local database record using admin client
  const adminClient = createAdminClient();
  const now = new Date().toISOString();

  const { error: dbErr } = await adminClient
    .from("subscriptions")
    .update({
      cancel_at_period_end: true,
      canceled_at: now,
      cancelled_at: now,
    })
    .eq("id", sub.id);

  if (dbErr) {
    // Fallback if cancel_at_period_end column does not exist yet
    await adminClient
      .from("subscriptions")
      .update({
        cancelled_at: now,
      })
      .eq("id", sub.id);
  }

  return { success: true };
}
