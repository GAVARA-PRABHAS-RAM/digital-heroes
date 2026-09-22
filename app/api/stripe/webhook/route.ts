import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { upsertSubscriptionFromStripe } from "@/services/subscriptions/subscriptionService";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

/**
 * STRIPE WEBHOOK HANDLER (TEST MODE)
 * 
 * Cryptographically verifies incoming webhook signatures using STRIPE_WEBHOOK_SECRET.
 * Synchronizes subscription state in Supabase using the service-role admin client.
 */
export async function POST(req: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.error("[Stripe Webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET.");
    return NextResponse.json(
      { error: "Stripe webhook is unconfigured on the server." },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : "Invalid signature"}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      // 1. Checkout session completed
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;
        const plan = (session.metadata?.plan as "monthly" | "yearly") || "monthly";

        if (!userId) {
          console.warn("[Stripe Webhook] checkout.session.completed missing userId metadata.");
          break;
        }

        let stripeSubscriptionId: string | null = null;
        let currentPeriodStart: string | null = null;
        let currentPeriodEnd: string | null = null;
        let price = plan === "yearly" ? 14999 : 1499;
        let currency = "INR";
        let stripePriceId: string | null = null;

        if (session.subscription) {
          stripeSubscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;

          // Fetch full subscription details from Stripe
          try {
            const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
            const subAny = sub as any;
            const itemPrice = sub.items?.data?.[0]?.price;
            const periodStart = sub.items?.data?.[0]?.current_period_start ?? subAny.current_period_start;
            const periodEnd = sub.items?.data?.[0]?.current_period_end ?? subAny.current_period_end;

            if (periodStart) {
              currentPeriodStart = new Date(periodStart * 1000).toISOString();
            }
            if (periodEnd) {
              currentPeriodEnd = new Date(periodEnd * 1000).toISOString();
            }
            if (itemPrice?.unit_amount) {
              price = itemPrice.unit_amount / 100;
            }
            if (itemPrice?.currency) {
              currency = itemPrice.currency.toUpperCase();
            }
            stripePriceId = itemPrice?.id || null;
          } catch (fetchErr) {
            console.warn("[Stripe Webhook] Could not retrieve subscription details:", fetchErr);
          }
        }

        await upsertSubscriptionFromStripe({
          userId,
          stripeCustomerId: session.customer as string | null,
          stripeSubscriptionId,
          stripePriceId,
          plan,
          status: "active",
          price,
          currency,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd: false,
        });

        break;
      }

      // 2. Subscription created or updated
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        let userId = subscription.metadata?.userId;

        // If userId not in subscription metadata, query Supabase for customer mapping
        if (!userId && subscription.customer) {
          const adminClient = createAdminClient();
          const { data: matchedSub } = await adminClient
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", subscription.customer as string)
            .limit(1)
            .maybeSingle();

          userId = matchedSub?.user_id;
        }

        if (!userId) {
          console.warn("[Stripe Webhook] Subscription update event has no associated userId.");
          break;
        }

        const interval = subscription.items.data[0]?.price?.recurring?.interval;
        const plan: "monthly" | "yearly" = interval === "year" ? "yearly" : "monthly";
        const unitAmount = subscription.items.data[0]?.price?.unit_amount;
        const price = unitAmount ? unitAmount / 100 : plan === "yearly" ? 14999 : 1499;
        const currency = (subscription.items.data[0]?.price?.currency || "INR").toUpperCase();
        const stripePriceId = subscription.items.data[0]?.price?.id || null;

        // Map Stripe status
        let mappedStatus: "active" | "past_due" | "cancelled" | "incomplete" | "trialing" = "active";
        if (subscription.status === "past_due" || subscription.status === "unpaid") {
          mappedStatus = "past_due";
        } else if (subscription.status === "canceled") {
          mappedStatus = "cancelled";
        } else if (subscription.status === "trialing") {
          mappedStatus = "trialing";
        } else if (subscription.status === "incomplete" || subscription.status === "incomplete_expired") {
          mappedStatus = "incomplete";
        }

        const subAny = subscription as any;
        const item0 = subscription.items?.data?.[0];
        const periodStart = item0?.current_period_start ?? subAny.current_period_start;
        const periodEnd = item0?.current_period_end ?? subAny.current_period_end;

        await upsertSubscriptionFromStripe({
          userId,
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          stripePriceId,
          plan,
          status: mappedStatus,
          price,
          currency,
          currentPeriodStart: periodStart
            ? new Date(periodStart * 1000).toISOString()
            : new Date().toISOString(),
          currentPeriodEnd: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : new Date(Date.now() + 30 * 86400000).toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          canceledAt: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
        });

        break;
      }

      // 3. Subscription deleted / canceled
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const adminClient = createAdminClient();
        const now = new Date().toISOString();

        await adminClient
          .from("subscriptions")
          .update({
            status: "cancelled",
            canceled_at: now,
            cancelled_at: now,
            cancel_at_period_end: false,
          })
          .eq("stripe_subscription_id", subscription.id);

        break;
      }

      // 4. Invoice payment failed
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const invAny = invoice as any;
        const subId =
          typeof invAny.subscription === "string"
            ? invAny.subscription
            : invAny.subscription?.id ||
              (typeof invAny.parent?.subscription_details?.subscription === "string"
                ? invAny.parent.subscription_details.subscription
                : invAny.parent?.subscription_details?.subscription?.id);

        if (subId) {
          const adminClient = createAdminClient();
          await adminClient
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subId);
        }
        break;
      }

      // 5. Invoice payment succeeded
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const invAny = invoice as any;
        const subId =
          typeof invAny.subscription === "string"
            ? invAny.subscription
            : invAny.subscription?.id ||
              (typeof invAny.parent?.subscription_details?.subscription === "string"
                ? invAny.parent.subscription_details.subscription
                : invAny.parent?.subscription_details?.subscription?.id);

        if (subId) {
          const adminClient = createAdminClient();
          await adminClient
            .from("subscriptions")
            .update({ status: "active" })
            .eq("stripe_subscription_id", subId);
        }
        break;
      }

      default:
        // Other events ignored
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Error processing event:", err);
    return NextResponse.json(
      { error: "Webhook event processing failed" },
      { status: 500 }
    );
  }
}
