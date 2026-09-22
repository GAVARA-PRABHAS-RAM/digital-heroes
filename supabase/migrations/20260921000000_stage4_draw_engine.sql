-- ==============================================================================
-- Digital Heroes - Stage 4 Database Schema Enhancements
-- Draw & Prize Engine: Rollover, Draw Date, Snapshots, RLS
-- ==============================================================================

-- 1. Enhance public.draws table
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS draw_date DATE;
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS winning_numbers INTEGER[];
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS prize_pool_percentage NUMERIC(5, 2) NOT NULL DEFAULT 50.00;
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS total_prize_pool NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS rollover_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00;

-- 2. Enhance public.draw_entries table
ALTER TABLE public.draw_entries ADD COLUMN IF NOT EXISTS score_snapshot JSONB;

-- 3. Ensure unique constraint on (draw_id, user_id) to prevent duplicate entries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_draw'
    ) THEN
        ALTER TABLE public.draw_entries ADD CONSTRAINT unique_user_draw UNIQUE (draw_id, user_id);
    END IF;
END $$;

-- 4. Refine RLS for unpublished draw results protection
-- Normal subscribers must never see winning numbers of draft or simulated draws
DROP POLICY IF EXISTS "Draw results viewable by everyone" ON public.draw_results;
DROP POLICY IF EXISTS "Published draw results viewable by all, drafts by admin" ON public.draw_results;
CREATE POLICY "Published draw results viewable by all, drafts by admin"
    ON public.draw_results FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.draws
            WHERE draws.id = draw_results.draw_id
            AND (draws.status IN ('published', 'completed') OR public.is_admin())
        )
    );

-- 5. Add RLS policy for subscribers to insert their own draw entries
DROP POLICY IF EXISTS "Users insert own draw entries" ON public.draw_entries;
CREATE POLICY "Users insert own draw entries"
    ON public.draw_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 6. Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
