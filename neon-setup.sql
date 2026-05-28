-- =====================================================
-- 🔐 KEYPER NEON POSTGRES SETUP
-- =====================================================
--
-- Complete database setup for Keyper on Neon Postgres.
-- Run this entire script in the Neon SQL Editor or any Postgres client
-- connected to your Neon Cloud or Neon Local database.
--
-- Made with ❤️ by Pink Pixel ✨
-- Date: May 28, 2026
-- =====================================================

-- ============================================================================
-- 0. REQUIRED EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'self-hosted-user',
  title TEXT NOT NULL,
  description TEXT,
  credential_type TEXT NOT NULL DEFAULT 'secret' CHECK (credential_type IN ('api_key', 'login', 'secret', 'token', 'certificate', 'document', 'misc')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  username TEXT,
  url TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  notes TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_accessed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  secret_blob JSONB NOT NULL,
  encrypted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vault_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'self-hosted-user',
  wrapped_dek JSONB,
  raw_dek TEXT,
  bcrypt_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'self-hosted-user',
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'folder',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_type ON credentials(credential_type);
CREATE INDEX IF NOT EXISTS idx_credentials_category ON credentials(category);
CREATE INDEX IF NOT EXISTS idx_credentials_priority ON credentials(priority);
CREATE INDEX IF NOT EXISTS idx_credentials_expires ON credentials(expires_at);
CREATE INDEX IF NOT EXISTS idx_credentials_tags ON credentials USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_credentials_created_at ON credentials(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credentials_updated_at ON credentials(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_credentials_encrypted ON credentials ((secret_blob IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_vault_config_user_id ON vault_config(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- ============================================================================
-- 3. UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_credentials_updated_at ON credentials;
CREATE TRIGGER update_credentials_updated_at
  BEFORE UPDATE ON credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vault_config_updated_at ON vault_config;
CREATE TRIGGER update_vault_config_updated_at
  BEFORE UPDATE ON vault_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'credentials' AND schemaname = 'public')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON credentials';
  END LOOP;

  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'vault_config' AND schemaname = 'public')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON vault_config';
  END LOOP;

  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'categories' AND schemaname = 'public')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON categories';
  END LOOP;
END $$;

CREATE POLICY "credentials_select_policy" ON credentials FOR SELECT USING (true);
CREATE POLICY "credentials_insert_policy" ON credentials FOR INSERT WITH CHECK (true);
CREATE POLICY "credentials_update_policy" ON credentials FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "credentials_delete_policy" ON credentials FOR DELETE USING (true);

CREATE POLICY "vault_config_select_policy" ON vault_config FOR SELECT USING (true);
CREATE POLICY "vault_config_insert_policy" ON vault_config FOR INSERT WITH CHECK (true);
CREATE POLICY "vault_config_update_policy" ON vault_config FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "vault_config_delete_policy" ON vault_config FOR DELETE USING (true);

CREATE POLICY "categories_select_policy" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_insert_policy" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "categories_update_policy" ON categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "categories_delete_policy" ON categories FOR DELETE USING (true);

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_credential_stats()
RETURNS TABLE(
  total_credentials BIGINT,
  encrypted_credentials BIGINT,
  credentials_by_type JSONB,
  expiring_soon BIGINT,
  expired BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_credentials,
    COUNT(CASE WHEN c.secret_blob IS NOT NULL THEN 1 END)::BIGINT AS encrypted_credentials,
    jsonb_object_agg(type_counts.credential_type, type_counts.count) AS credentials_by_type,
    COUNT(CASE WHEN c.expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days' THEN 1 END)::BIGINT AS expiring_soon,
    COUNT(CASE WHEN c.expires_at < NOW() THEN 1 END)::BIGINT AS expired
  FROM public.credentials c
  CROSS JOIN (
    SELECT credential_type, COUNT(*) AS count
    FROM public.credentials
    GROUP BY credential_type
  ) type_counts;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_rls_status()
RETURNS TABLE(
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tablename::TEXT AS table_name,
    t.rowsecurity AS rls_enabled,
    COUNT(p.policyname)::BIGINT AS policy_count
  FROM pg_tables t
  LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
  WHERE t.schemaname = 'public'
    AND t.tablename IN ('credentials', 'vault_config', 'categories')
  GROUP BY t.tablename, t.rowsecurity
  ORDER BY t.tablename;
END;
$$;

-- ============================================================================
-- 6. DEFAULT CATEGORIES
-- ============================================================================

INSERT INTO categories (user_id, name, color, icon, description) VALUES
  ('self-hosted-user', 'Development', '#3b82f6', 'code', 'Development tools and APIs'),
  ('self-hosted-user', 'Personal', '#10b981', 'user', 'Personal accounts and services'),
  ('self-hosted-user', 'Work', '#f59e0b', 'briefcase', 'Work-related credentials'),
  ('self-hosted-user', 'Social Media', '#ec4899', 'users', 'Social media accounts'),
  ('self-hosted-user', 'Finance', '#06b6d4', 'credit-card', 'Banking and financial services'),
  ('self-hosted-user', 'Cloud Services', '#8b5cf6', 'cloud', 'Cloud platforms and services'),
  ('self-hosted-user', 'Security', '#ef4444', 'shield', 'Security tools and certificates')
ON CONFLICT (user_id, name) DO NOTHING;

-- ============================================================================
-- 7. COMMENTS
-- ============================================================================

COMMENT ON TABLE credentials IS 'Encrypted credential storage for Keyper on Neon Postgres';
COMMENT ON TABLE vault_config IS 'Vault configuration and encrypted key material';
COMMENT ON TABLE categories IS 'User-defined credential categories';
COMMENT ON COLUMN credentials.secret_blob IS 'Encrypted JSON blob containing all secret data';
COMMENT ON COLUMN vault_config.raw_dek IS 'Raw data encryption key for simplified bcrypt-only architecture';
COMMENT ON COLUMN vault_config.bcrypt_hash IS 'Bcrypt hash of master passphrase for secure reset';
COMMENT ON FUNCTION get_credential_stats IS 'Get comprehensive statistics about stored credentials';
COMMENT ON FUNCTION check_rls_status IS 'Check Row Level Security configuration status';

-- =====================================================
-- ✅ NEON POSTGRES SETUP COMPLETE
-- =====================================================
--
-- Next steps:
-- 1. Return to Keyper
-- 2. Paste your Neon Cloud or Neon Local connection string
-- 3. Click Test Connection
-- 4. Save and continue into your vault
--
-- Security reminders:
-- - Your Neon connection string contains a database role password
-- - Keyper stores that connection string locally in your browser/Electron profile
-- - All sensitive credential values are still encrypted client-side before storage
-- =====================================================
