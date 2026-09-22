"use server";

import { requireAuth } from "@/lib/auth/session";
import {
  createStripeCheckoutSession,
  createStripeCustomerPortalSession,
} from "@/lib/stripe";
import {
  getUserSubscription,
  cancelUserSubscription,
} from "@/services/subscriptions/subscriptionService";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

function getBaseUrl(): string {
  const headersList = headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

/**
 * Initiates a Stripe Checkout Session for Monthly or Annual subscription.
 */
export async function createCheckoutSessionAction(plan: "monthly" | "yearly") {
  try {
    const auth = await requireAuth();
    const baseUrl = getBaseUrl();

    const successUrl = `${baseUrl}/subscription?session_id={CHECKOUT_SESSION_ID}&status=success`;
    const cancelUrl = `${baseUrl}/subscription?status=cancelled`;

    const result = await createStripeCheckoutSession({
      userId: auth.user.id,
      userEmail: auth.user.email || "",
      userName: auth.profile?.full_name || null,
      plan,
      successUrl,
      cancelUrl,
    });

    if (result.error || !result.url) {
      return {
        success: false,
        error: result.error || "Failed to create Stripe Checkout session.",
      };
    }

    return {
      success: true,
      url: result.url,
    };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to initiate subscription checkout.",
    };
  }
}

/**
 * Opens Stripe Customer Billing Portal for payment method updates.
 */
export async function createCustomerPortalAction() {
  try {
    const auth = await requireAuth();
    const sub = await getUserSubscription(auth.user.id);

    if (!sub?.stripe_customer_id) {
      return {
        success: false,
        error: "No active Stripe customer profile found for this account.",
      };
    }

    const baseUrl = getBaseUrl();
    const returnUrl = `${baseUrl}/subscription`;

    const result = await createStripeCustomerPortalSession(sub.stripe_customer_id, returnUrl);

    if (result.error || !result.url) {
      return {
        success: false,
        error: result.error || "Failed to open billing portal.",
      };
    }

    return {
      success: true,
      url: result.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to open customer portal.",
    };
  }
}

/**
 * Schedules cancellation of the active subscription at the end of the billing period.
 */
export async function cancelSubscriptionAction() {
  try {
    const auth = await requireAuth();
    const result = await cancelUserSubscription(auth.user.id);

    if (result.success) {
      revalidatePath("/subscription");
      revalidatePath("/dashboard");
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel subscription.",
    };
  }
}
