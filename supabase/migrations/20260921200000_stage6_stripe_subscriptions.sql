-- ==============================================================================
-- DIGITAL HEROES — STAGE 6A MIGRATION: STRIPE SUBSCRIPTIONS (INR CURRENCY)
-- ==============================================================================

-- 1. Add Stripe tracking columns to public.subscriptions if not present
DO $$
BEGIN
    -- stripe_price_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'stripe_price_id'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN stripe_price_id TEXT;
    END IF;

    -- current_period_start
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'current_period_start'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN current_period_start TIMESTAMPTZ;
    END IF;

    -- current_period_end
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'current_period_end'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN current_period_end TIMESTAMPTZ;
    END IF;

    -- cancel_at_period_end
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'cancel_at_period_end'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- canceled_at (supports both canceled_at and cancelled_at)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'canceled_at'
    ) THEN
        ALTER TABLE public.subscriptions ADD COLUMN canceled_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Update default currency to INR for Indian market
ALTER TABLE public.subscriptions ALTER COLUMN currency SET DEFAULT 'INR';

-- 3. Expand status check constraint to support Stripe subscription lifecycle states
DO $$
BEGIN
    ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check 
        CHECK (status IN ('active', 'inactive', 'cancelled', 'canceled', 'past_due', 'lapsed', 'incomplete', 'trialing'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 4. Add performant indexes for webhook lookups and user subscription status checks
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_cust ON public.subscriptions(stripe_customer_id);

-- 5. Row Level Security policies for subscriptions
-- Subscribers only have SELECT permissions on their own subscription
-- Direct browser writes/updates are strictly prevented; activations occur only via server/webhook
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Subscribers view own subscription or admin view all" ON public.subscriptions;
CREATE POLICY "Subscribers view own subscription or admin view all"
ON public.subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert or update subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can insert or update subscriptions"
ON public.subscriptions FOR ALL
TO authenticated
USING (public.is_admin());
