-- ==============================================================================
-- DIGITAL HEROES — STAGE 5 MIGRATION: WINNER VERIFICATION & PROOFS
-- ==============================================================================

-- 1. Add status column to winner_proofs table with check constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'winner_proofs' 
          AND column_name = 'status'
    ) THEN
        ALTER TABLE public.winner_proofs 
        ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

-- 2. Indexes for performant filtering on status and uploaded_at
CREATE INDEX IF NOT EXISTS idx_winner_proofs_status ON public.winner_proofs(status);
CREATE INDEX IF NOT EXISTS idx_winner_proofs_winner_id_uploaded ON public.winner_proofs(winner_id, uploaded_at DESC);

-- 3. Configure Private Storage Bucket 'winner-proofs'
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'winner-proofs',
        'winner-proofs',
        false,
        5242880,
        ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE SET
        public = false,
        file_size_limit = 5242880,
        allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 4. Storage Objects Least-Privilege Policies for 'winner-proofs'
-- Drop any existing or broad policies
DROP POLICY IF EXISTS "Users can upload own winner proof files" ON storage.objects;
DROP POLICY IF EXISTS "Users and admin can read winner proof files" ON storage.objects;
DROP POLICY IF EXISTS "Subscribers upload own winner proofs" ON storage.objects;
DROP POLICY IF EXISTS "Subscribers and admins read winner proofs" ON storage.objects;

-- INSERT: Subscriber can ONLY upload to their own user folder (userId/...)
CREATE POLICY "Subscribers upload own winner proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'winner-proofs' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- SELECT: Subscriber can access only their own proofs; Admin can inspect all proofs
CREATE POLICY "Subscribers and admins read winner proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'winner-proofs' AND (
        (storage.foldername(name))[1] = auth.uid()::text OR
        public.is_admin()
    )
);

-- NOTE: No UPDATE or DELETE policies on storage.objects.
-- Scorecard uploads are immutable and cannot be deleted or overwritten via client API.

-- 5. Row Level Security for public.winner_proofs
ALTER TABLE public.winner_proofs ENABLE ROW LEVEL SECURITY;

-- Drop any broad or legacy policies
DROP POLICY IF EXISTS "Admins have full access to winner proofs" ON public.winner_proofs;
DROP POLICY IF EXISTS "Users view own winner proofs or admin view all" ON public.winner_proofs;
DROP POLICY IF EXISTS "Subscribers view own winner proofs or admin view all" ON public.winner_proofs;
DROP POLICY IF EXISTS "Users insert own winner proofs" ON public.winner_proofs;
DROP POLICY IF EXISTS "Subscribers insert own winner proofs" ON public.winner_proofs;
DROP POLICY IF EXISTS "Admins review winner proofs" ON public.winner_proofs;

-- SELECT: Subscribers can view only their own proofs; Admins can view all proofs
CREATE POLICY "Subscribers view own winner proofs or admin view all"
ON public.winner_proofs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.winners w
        WHERE w.id = winner_proofs.winner_id 
          AND (w.user_id = auth.uid() OR public.is_admin())
    )
);

-- INSERT: Subscribers can only insert proofs for winning tickets they own (match_count >= 3)
CREATE POLICY "Subscribers insert own winner proofs"
ON public.winner_proofs FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.winners w
        WHERE w.id = winner_proofs.winner_id 
          AND w.user_id = auth.uid()
          AND w.match_count >= 3
    )
);

-- UPDATE: Only Administrators can review and transition proof status/notes
CREATE POLICY "Admins review winner proofs"
ON public.winner_proofs FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- NOTE: No DELETE policy is granted on winner_proofs.
-- All proof submissions (including rejected proofs) remain immutably preserved in the audit log.
