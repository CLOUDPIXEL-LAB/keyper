import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readSql(file: string): string {
  return readFileSync(file, 'utf8');
}

describe('neon setup schema', () => {
  it('keeps the Neon setup script aligned with required Keyper Postgres tables and columns', () => {
    const neonSql = readSql('neon-setup.sql');
    const supabaseSql = readSql('supabase-setup.sql');

    const requiredFragments = [
      'CREATE TABLE IF NOT EXISTS credentials',
      'CREATE TABLE IF NOT EXISTS vault_config',
      'CREATE TABLE IF NOT EXISTS categories',
      'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
      'user_id TEXT NOT NULL DEFAULT',
      'credential_type TEXT NOT NULL DEFAULT',
      'priority TEXT NOT NULL DEFAULT',
      'tags TEXT[] DEFAULT',
      'secret_blob JSONB NOT NULL',
      'encrypted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
      'wrapped_dek JSONB',
      'raw_dek TEXT',
      'bcrypt_hash TEXT',
      'UNIQUE(user_id)',
      'UNIQUE(user_id, name)',
      'CREATE INDEX IF NOT EXISTS idx_credentials_tags ON credentials USING GIN(tags)',
      'ALTER TABLE credentials ENABLE ROW LEVEL SECURITY',
      'CREATE POLICY "credentials_select_policy"',
      'CREATE OR REPLACE FUNCTION public.update_updated_at_column()',
      'CREATE OR REPLACE FUNCTION public.get_credential_stats()',
      'CREATE OR REPLACE FUNCTION public.check_rls_status()',
    ];

    for (const fragment of requiredFragments) {
      expect(neonSql).toContain(fragment);
      expect(supabaseSql).toContain(fragment);
    }

    expect(neonSql).toContain('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
  });
});
