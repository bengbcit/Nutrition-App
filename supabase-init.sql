-- ============================================
-- Supabase All-in-One SQL: Init + Queries
-- ============================================

-- ============================================
-- PART 1: INITIALIZATION (RUN ONCE ONLY)
-- ============================================

-- 1. Create analysis record table
CREATE TABLE IF NOT EXISTS analyses (
  id         TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  foods      JSONB NOT NULL DEFAULT '[]',
  calories   INTEGER NOT NULL DEFAULT 0,
  protein    INTEGER NOT NULL DEFAULT 0,
  carbs      INTEGER NOT NULL DEFAULT 0,
  fat        INTEGER NOT NULL DEFAULT 0,
  image_url  TEXT
);

-- 2. Index: Sort by creation time descending
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses (created_at DESC);

-- 3. Index for date range queries (simpler & reliable)
CREATE INDEX IF NOT EXISTS idx_analyses_created_at_regular ON analyses (created_at);

-- ============================================
-- Create Storage Bucket (for image storage)
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-photos', 'food-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage public access policy
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'food-photos');

-- Allow upload operations
CREATE POLICY "Allow Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'food-photos');

-- Allow delete operations
CREATE POLICY "Allow Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'food-photos');

-- ============================================
-- RLS Policy (Row Level Security)
-- ============================================
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service_role"
ON analyses FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================
-- PART 2: COMMON OPERATIONS (FOR DAILY USE)
-- ============================================

-- Insert example
-- INSERT INTO analyses (id, foods, calories, protein, carbs, fat, image_url)
-- VALUES (
--   'unique-id-123',
--   '["rice", "chicken", "vegetable"]',
--   650,
--   35,
--   80,
--   12,
--   'https://xxx.supabase.co/storage/v1/object/public/food-photos/xxx.jpg'
-- );

-- Get today's records (use index correctly)
-- SELECT * 
-- FROM analyses 
-- WHERE created_at >= DATE_TRUNC('day', NOW())
--   AND created_at < DATE_TRUNC('day', NOW()) + INTERVAL '1 day'
-- ORDER BY created_at DESC;

-- Get all history
-- SELECT * FROM analyses ORDER BY created_at DESC;

-- Get single record by ID
-- SELECT * FROM analyses WHERE id = 'unique-id-123';

-- Update record by ID
-- UPDATE analyses
-- SET foods = '["rice", "fish"]', calories = 580, protein = 40
-- WHERE id = 'unique-id-123';

-- Delete record by ID
-- DELETE FROM analyses WHERE id = 'unique-id-123';

-- Today's statistics using range
-- SELECT 
--   SUM(calories) AS total_calories,
--   SUM(protein) AS total_protein,
--   SUM(carbs) AS total_carbs,
--   SUM(fat) AS total_fat
-- FROM analyses 
-- WHERE created_at >= DATE_TRUNC('day', NOW())
--   AND created_at < DATE_TRUNC('day', NOW()) + INTERVAL '1 day';