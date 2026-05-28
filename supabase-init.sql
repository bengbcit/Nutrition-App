-- ============================================
-- Supabase Initialization SQL (Execute in Supabase SQL Editor)
-- ============================================

-- 1. Create analysis record table
CREATE TABLE IF NOT EXISTS analyses (
  id         TEXT PRIMARY KEY,                  -- Client-generated unique ID (e.g. Date.now().toString())
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Creation timestamp
  foods      JSONB NOT NULL DEFAULT '[]',        -- Array of food names ["rice", "chicken"]
  calories   INTEGER NOT NULL DEFAULT 0,         -- Total calories
  protein    INTEGER NOT NULL DEFAULT 0,         -- Protein (g)
  carbs      INTEGER NOT NULL DEFAULT 0,         -- Carbohydrates (g)
  fat        INTEGER NOT NULL DEFAULT 0,         -- Fat (g)
  image_url  TEXT                                 -- Supabase Storage public URL (optional)
);

-- 2. Index: Sort by creation time descending (commonly used for history lists)
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses (created_at DESC);

-- 3. Index: Query by date (used for daily statistics)
CREATE INDEX IF NOT EXISTS idx_analyses_date ON analyses ((created_at::date));

-- ============================================
-- 2. Create Storage Bucket (for image storage)
-- ============================================
-- Create via Supabase Dashboard → Storage → New Bucket:
--   Bucket name: food-photos
--   Public bucket: ✅ ON (enable public access)
--
-- Or create via SQL:
-- (Note: It is recommended to create Storage buckets via Dashboard UI for better visibility)
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-photos', 'food-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage public access policy
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'food-photos');

-- Allow upload operations (service_role bypasses automatically; also open to anon for easier development)
CREATE POLICY "Allow Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'food-photos');

-- Allow delete operations
CREATE POLICY "Allow Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'food-photos');

-- ============================================
-- 3. RLS Policy (Row Level Security)
-- ============================================
-- Enable Row Level Security
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Allow all operations (service_role key bypasses RLS automatically)
-- Refine policies later if you need direct client-side access
CREATE POLICY "Allow all for service_role"
ON analyses FOR ALL
USING (true)
WITH CHECK (true);