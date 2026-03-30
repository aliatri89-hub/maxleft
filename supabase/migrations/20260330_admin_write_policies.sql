-- ════════════════════════════════════════════════════════════════
-- Admin write policies for community content tables
-- community_miniseries and community_items were missing write
-- policies, causing admin shelf/item edits to silently no-op.
-- ════════════════════════════════════════════════════════════════

-- ── community_miniseries ─────────────────────────────────────
-- Enable RLS if not already on (safe to run if already enabled)
ALTER TABLE community_miniseries ENABLE ROW LEVEL SECURITY;

-- Public read (mirrors other tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'community_miniseries'
      AND policyname = 'Public read community_miniseries'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Public read community_miniseries"
        ON community_miniseries FOR SELECT USING (true)
    $policy$;
  END IF;
END $$;

-- Admin write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'community_miniseries'
      AND policyname = 'Admin write community_miniseries'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin write community_miniseries"
        ON community_miniseries FOR ALL
        USING (auth.uid() = '19410e64-d610-4fab-9c26-d24fafc94696')
        WITH CHECK (auth.uid() = '19410e64-d610-4fab-9c26-d24fafc94696')
    $policy$;
  END IF;
END $$;

-- ── community_items ───────────────────────────────────────────
ALTER TABLE community_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'community_items'
      AND policyname = 'Public read community_items'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Public read community_items"
        ON community_items FOR SELECT USING (true)
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'community_items'
      AND policyname = 'Admin write community_items'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin write community_items"
        ON community_items FOR ALL
        USING (auth.uid() = '19410e64-d610-4fab-9c26-d24fafc94696')
        WITH CHECK (auth.uid() = '19410e64-d610-4fab-9c26-d24fafc94696')
    $policy$;
  END IF;
END $$;
