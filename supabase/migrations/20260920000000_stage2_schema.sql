-- ==============================================================================
-- Digital Heroes - Stage 2 Database Schema & Migrations
-- Single Source of Truth: Digital Heroes PRD (Level 1)
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. PROFILES TABLE
-- Extends auth.users with golfer profile information and role-based permissions.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'subscriber' CHECK (role IN ('subscriber', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 2. SUBSCRIPTIONS TABLE
-- Tracks membership tier, Stripe identifiers, and billing cycles.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due')),
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    start_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    renewal_date TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. SCORES TABLE
-- Stableford format golf scores (1 to 45). Exactly one score per user per date.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),
    score_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_score_date UNIQUE (user_id, score_date)
);

-- ==============================================================================
-- 4. CHARITIES TABLE
-- Verified non-profit organizations supported by Digital Heroes subscribers.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.charities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    website_url TEXT,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 5. CHARITY EVENTS TABLE
-- Upcoming charity initiatives, fundraising events, and golf days.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.charity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    charity_id UUID NOT NULL REFERENCES public.charities(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_date DATE NOT NULL,
    location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 6. USER CHARITIES TABLE
-- Subscriber charity selection and percentage allocation (minimum 10%).
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_charities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    charity_id UUID NOT NULL REFERENCES public.charities(id) ON DELETE CASCADE,
    contribution_percentage INTEGER NOT NULL CHECK (contribution_percentage >= 10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 7. DRAWS TABLE
-- Monthly prize draws with random or algorithmic weighted logic.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.draws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_month DATE NOT NULL,
    draw_type TEXT NOT NULL CHECK (draw_type IN ('random', 'algorithmic')),
    status TEXT NOT NULL CHECK (status IN ('draft', 'simulated', 'published', 'completed')),
    draw_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    simulated_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ
);

-- ==============================================================================
-- 8. DRAW ENTRIES TABLE
-- Individual tickets allocated to users for a monthly draw.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.draw_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    numbers INTEGER[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 9. DRAW RESULTS TABLE
-- Generated winning numbers and execution audit log.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.draw_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    winning_numbers INTEGER[] NOT NULL,
    generated_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 10. PRIZES TABLE
-- Defined prize tiers (5-match = 40%, 4-match = 35%, 3-match = 25%).
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    tier INTEGER NOT NULL CHECK (tier IN (5, 4, 3)),
    pool_percentage NUMERIC(5, 2) NOT NULL,
    pool_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    winner_count INTEGER NOT NULL DEFAULT 0,
    amount_per_winner NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    rollover_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00
);

-- ==============================================================================
-- 11. WINNERS TABLE
-- Verified winners matching prize tiers and verification/payment states.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    prize_id UUID NOT NULL REFERENCES public.prizes(id) ON DELETE CASCADE,
    match_count INTEGER NOT NULL,
    prize_amount NUMERIC(10, 2) NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 12. WINNER PROOFS TABLE
-- Uploaded proof documentation (scorecard screenshots, verification files).
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.winner_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    winner_id UUID NOT NULL REFERENCES public.winners(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    review_notes TEXT
);

-- ==============================================================================
-- 13. PAYOUTS TABLE
-- Cash disbursements to verified draw winners.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    winner_id UUID NOT NULL REFERENCES public.winners(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 14. DONATIONS TABLE
-- Financial distributions and direct donations to partner charities.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    charity_id UUID NOT NULL REFERENCES public.charities(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    percentage INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('subscription', 'independent')),
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE & LOOKUP OPTIMIZATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON public.scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_score_date ON public.scores(score_date);
CREATE INDEX IF NOT EXISTS idx_charities_active ON public.charities(active);
CREATE INDEX IF NOT EXISTS idx_charity_events_charity_id ON public.charity_events(charity_id);
CREATE INDEX IF NOT EXISTS idx_user_charities_user_id ON public.user_charities(user_id);
CREATE INDEX IF NOT EXISTS idx_draws_status ON public.draws(status);
CREATE INDEX IF NOT EXISTS idx_draws_draw_month ON public.draws(draw_month);
CREATE INDEX IF NOT EXISTS idx_draw_entries_draw_id ON public.draw_entries(draw_id);
CREATE INDEX IF NOT EXISTS idx_draw_entries_user_id ON public.draw_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_prizes_draw_id ON public.prizes(draw_id);
CREATE INDEX IF NOT EXISTS idx_winners_draw_id ON public.winners(draw_id);
CREATE INDEX IF NOT EXISTS idx_winners_user_id ON public.winners(user_id);
CREATE INDEX IF NOT EXISTS idx_winners_status ON public.winners(verification_status, payment_status);
CREATE INDEX IF NOT EXISTS idx_winner_proofs_winner_id ON public.winner_proofs(winner_id);
CREATE INDEX IF NOT EXISTS idx_payouts_winner_id ON public.payouts(winner_id);
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON public.donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_charity_id ON public.donations(charity_id);

-- ==============================================================================
-- SECURITY FUNCTIONS & ROLE RESTRICTIONS
-- ==============================================================================

-- Helper function: Check whether current user is an administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
    jwt_claims text;
BEGIN
    -- 1. Check if running as superuser or database owner (e.g. Supabase SQL Editor, migrations)
    IF current_user IN ('postgres', 'supabase_admin') THEN
        RETURN true;
    END IF;

    -- 2. Check if caller is using service_role key (server-side administrative scripts)
    jwt_claims := current_setting('request.jwt.claims', true);
    IF jwt_claims IS NOT NULL AND jwt_claims <> '' THEN
        IF (jwt_claims::jsonb ->> 'role') = 'service_role' THEN
            RETURN true;
        END IF;
    END IF;

    -- 3. Check if authenticated user has admin role in profiles
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function: Automatically create subscriber profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'subscriber'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if already exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger function: Prevent users from escalating their own role to admin
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger AS $$
BEGIN
    -- If role is unchanged, allow the update
    IF NEW.role = OLD.role THEN
        RETURN NEW;
    END IF;

    -- Bootstrap exception: If no admin currently exists, permit first-admin bootstrapping
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
        RETURN NEW;
    END IF;

    -- Otherwise, strictly require administrator privileges
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can modify user roles';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_role_update ON public.profiles;
CREATE TRIGGER on_profile_role_update
    BEFORE UPDATE OF role ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- Dedicated procedure for promoting a user to admin safely
CREATE OR REPLACE FUNCTION public.promote_to_admin(target_email text)
RETURNS boolean AS $$
DECLARE
    target_id uuid;
BEGIN
    -- Only allow if called by postgres/supabase_admin, service_role, existing admin, or bootstrap
    IF NOT (
        current_user IN ('postgres', 'supabase_admin')
        OR (COALESCE(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'service_role'
        OR public.is_admin()
        OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can promote users';
    END IF;

    SELECT id INTO target_id FROM public.profiles WHERE lower(email) = lower(trim(target_email));
    
    IF target_id IS NULL THEN
        -- If profile doesn't exist yet, check auth.users and create it
        SELECT id INTO target_id FROM auth.users WHERE lower(email) = lower(trim(target_email));
        IF target_id IS NULL THEN
            RAISE EXCEPTION 'User with email % not found in auth.users or profiles', target_email;
        END IF;
        
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (
            target_id,
            trim(target_email),
            (SELECT coalesce(raw_user_meta_data->>'full_name', split_part(trim(target_email), '@', 1)) FROM auth.users WHERE id = target_id),
            'admin'
        )
        ON CONFLICT (id) DO UPDATE SET role = 'admin';
    ELSE
        UPDATE public.profiles SET role = 'admin' WHERE id = target_id;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all 14 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view own profile or admin can view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admin can view all"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile or admin can update all" ON public.profiles;
CREATE POLICY "Users can update own profile or admin can update all"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Profiles insert allowed for authenticated users" ON public.profiles;
CREATE POLICY "Profiles insert allowed for authenticated users"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- 2. SUBSCRIPTIONS POLICIES
DROP POLICY IF EXISTS "Subscribers view own subscription or admin view all" ON public.subscriptions;
CREATE POLICY "Subscribers view own subscription or admin view all"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert or update subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can insert or update subscriptions"
    ON public.subscriptions FOR ALL
    USING (public.is_admin());

-- 3. SCORES POLICIES
DROP POLICY IF EXISTS "Users manage own scores or admin view all" ON public.scores;
CREATE POLICY "Users manage own scores or admin view all"
    ON public.scores FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users insert own scores" ON public.scores;
CREATE POLICY "Users insert own scores"
    ON public.scores FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own scores or admin update" ON public.scores;
CREATE POLICY "Users update own scores or admin update"
    ON public.scores FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users delete own scores or admin delete" ON public.scores;
CREATE POLICY "Users delete own scores or admin delete"
    ON public.scores FOR DELETE
    USING (auth.uid() = user_id OR public.is_admin());

-- 4. CHARITIES POLICIES
DROP POLICY IF EXISTS "Active charities viewable by everyone" ON public.charities;
CREATE POLICY "Active charities viewable by everyone"
    ON public.charities FOR SELECT
    USING (active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage charities" ON public.charities;
CREATE POLICY "Admins can manage charities"
    ON public.charities FOR ALL
    USING (public.is_admin());

-- 5. CHARITY EVENTS POLICIES
DROP POLICY IF EXISTS "Charity events viewable by everyone" ON public.charity_events;
CREATE POLICY "Charity events viewable by everyone"
    ON public.charity_events FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage charity events" ON public.charity_events;
CREATE POLICY "Admins can manage charity events"
    ON public.charity_events FOR ALL
    USING (public.is_admin());

-- 6. USER CHARITIES POLICIES
DROP POLICY IF EXISTS "Users manage own charity selections" ON public.user_charities;
CREATE POLICY "Users manage own charity selections"
    ON public.user_charities FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own charity selections" ON public.user_charities;
CREATE POLICY "Users can insert own charity selections"
    ON public.user_charities FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own charity selections" ON public.user_charities;
CREATE POLICY "Users can update own charity selections"
    ON public.user_charities FOR UPDATE
    USING (auth.uid() = user_id);

-- 7. DRAWS POLICIES
DROP POLICY IF EXISTS "Published draws viewable by all, drafts viewable by admin" ON public.draws;
CREATE POLICY "Published draws viewable by all, drafts viewable by admin"
    ON public.draws FOR SELECT
    USING (status IN ('published', 'completed') OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage draws" ON public.draws;
CREATE POLICY "Admins can manage draws"
    ON public.draws FOR ALL
    USING (public.is_admin());

-- 8. DRAW ENTRIES POLICIES
DROP POLICY IF EXISTS "Users view own draw entries or admin view all" ON public.draw_entries;
CREATE POLICY "Users view own draw entries or admin view all"
    ON public.draw_entries FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage draw entries" ON public.draw_entries;
CREATE POLICY "Admins manage draw entries"
    ON public.draw_entries FOR ALL
    USING (public.is_admin());

-- 9. DRAW RESULTS POLICIES
DROP POLICY IF EXISTS "Draw results viewable by everyone" ON public.draw_results;
CREATE POLICY "Draw results viewable by everyone"
    ON public.draw_results FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Admins manage draw results" ON public.draw_results;
CREATE POLICY "Admins manage draw results"
    ON public.draw_results FOR ALL
    USING (public.is_admin());

-- 10. PRIZES POLICIES
DROP POLICY IF EXISTS "Prizes viewable by everyone" ON public.prizes;
CREATE POLICY "Prizes viewable by everyone"
    ON public.prizes FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Admins manage prizes" ON public.prizes;
CREATE POLICY "Admins manage prizes"
    ON public.prizes FOR ALL
    USING (public.is_admin());

-- 11. WINNERS POLICIES
DROP POLICY IF EXISTS "Users view own winning records or admin view all" ON public.winners;
CREATE POLICY "Users view own winning records or admin view all"
    ON public.winners FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage winners" ON public.winners;
CREATE POLICY "Admins manage winners"
    ON public.winners FOR ALL
    USING (public.is_admin());

-- 12. WINNER PROOFS POLICIES
DROP POLICY IF EXISTS "Users view own winner proofs or admin view all" ON public.winner_proofs;
CREATE POLICY "Users view own winner proofs or admin view all"
    ON public.winner_proofs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.winners w
            WHERE w.id = winner_proofs.winner_id AND (w.user_id = auth.uid() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Users insert own winner proofs" ON public.winner_proofs;
CREATE POLICY "Users insert own winner proofs"
    ON public.winner_proofs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.winners w
            WHERE w.id = winner_proofs.winner_id AND w.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins review winner proofs" ON public.winner_proofs;
CREATE POLICY "Admins review winner proofs"
    ON public.winner_proofs FOR UPDATE
    USING (public.is_admin());

-- 13. PAYOUTS POLICIES
DROP POLICY IF EXISTS "Users view own payouts or admin view all" ON public.payouts;
CREATE POLICY "Users view own payouts or admin view all"
    ON public.payouts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.winners w
            WHERE w.id = payouts.winner_id AND (w.user_id = auth.uid() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Admins manage payouts" ON public.payouts;
CREATE POLICY "Admins manage payouts"
    ON public.payouts FOR ALL
    USING (public.is_admin());

-- 14. DONATIONS POLICIES
DROP POLICY IF EXISTS "Users view own donations or admin view all" ON public.donations;
CREATE POLICY "Users view own donations or admin view all"
    ON public.donations FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage donations" ON public.donations;
CREATE POLICY "Admins manage donations"
    ON public.donations FOR ALL
    USING (public.is_admin());

-- ==============================================================================
-- PERMISSIONS & PRIVILEGES
-- Ensures anon, authenticated, and service_role can interact with public schema
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

