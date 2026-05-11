-- ============================================================
-- 私廚晚宴報價系統 - Supabase 初始化
-- 步驟：在 Supabase Dashboard > SQL Editor 執行此檔案
-- ============================================================

-- 1. 啟用 pgvector 擴充套件
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 建立 packages 表格
CREATE TABLE IF NOT EXISTS packages (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL,
  description text        NOT NULL,
  image_url   text        NOT NULL,
  price_min   integer     NOT NULL,
  price_max   integer     NOT NULL,
  features    jsonb       DEFAULT '[]'::jsonb,
  embedding   vector(8)   NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- 3. 建立向量相似度搜尋 RPC 函數
CREATE OR REPLACE FUNCTION match_packages(
  query_embedding vector(8),
  match_count     int DEFAULT 5
)
RETURNS TABLE (
  id          uuid,
  name        text,
  description text,
  image_url   text,
  price_min   int,
  price_max   int,
  features    jsonb,
  similarity  float
)
LANGUAGE sql AS $$
  SELECT
    id, name, description, image_url, price_min, price_max, features,
    1 - (embedding <=> query_embedding) AS similarity
  FROM packages
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 4. 啟用 Row Level Security
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- 5. RLS 政策：允許所有人讀取（Demo 用）
DROP POLICY IF EXISTS "allow_public_read" ON packages;
CREATE POLICY "allow_public_read" ON packages
  FOR SELECT USING (true);

-- 6. RLS 政策：允許所有人寫入（Demo 用，正式版應加認證）
DROP POLICY IF EXISTS "allow_public_write" ON packages;
CREATE POLICY "allow_public_write" ON packages
  FOR ALL USING (true) WITH CHECK (true);
