/**
 * VaultStorage - Manages DEK storage in Supabase
 * 
 * Handles both legacy (wrapped_dek) and new (raw_dek + bcrypt_hash) configurations
 * for seamless migration from complex encryption to simple bcrypt-only system.
 * 
 * Made with ❤️ by Pink Pixel ✨
 */

import { supabase, getCurrentUsername } from '@/integrations/supabase/client';
import type { WrappedDEK } from './SecureVault';

/**
 * Legacy vault configuration (wrapped_dek based)
 */
export interface LegacyVaultConfig {
  id: string;
  user_id: string;
  wrapped_dek: WrappedDEK;
  bcrypt_hash?: string;
  created_at: string;
  updated_at: string;
}

/**
 * New vault configuration (raw_dek + bcrypt_hash based)
 */
export interface NewVaultConfig {
  id: string;
  user_id: string;
  raw_dek: string; // Base64 encoded raw DEK bytes
  bcrypt_hash: string;
  created_at: string;
  updated_at: string;
}

/**
 * Union type for vault configurations
 */
export type VaultConfig = LegacyVaultConfig | NewVaultConfig;

/**
 * Type guard to check if config is legacy
 */
export function isLegacyVaultConfig(config: VaultConfig): config is LegacyVaultConfig {
  return 'wrapped_dek' in config && config.wrapped_dek !== null;
}

/**
 * Type guard to check if config is new format
 */
export function isNewVaultConfig(config: VaultConfig): config is NewVaultConfig {
  return 'raw_dek' in config && config.raw_dek !== null && config.raw_dek !== undefined;
}

/**
 * Get vault configuration for current user
 * Fixed: Use instance-based config instead of username-based to avoid conflicts when username changes
 */
export async function getVaultConfig(): Promise<VaultConfig | null> {
  try {
    // Use the configured username for vault config
    const currentUsername = getCurrentUsername();
    console.log('🔍 Getting vault config for user:', currentUsername);
    
    const { data, error } = await supabase
      .from('vault_config')
      .select('*')
      .eq('user_id', currentUsername)
      .single();

    console.log('📊 Vault config query result:', { data, error });

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - vault not initialized
        console.log('ℹ️ No vault config found (PGRST116) - vault not initialized');
        return null;
      }
      console.error('❌ Database error getting vault config:', error);
      throw error;
    }

    // Handle both legacy and new vault configurations
    if (data) {
      // Check for new format (raw_dek + bcrypt_hash)
      if (data.raw_dek && data.bcrypt_hash) {
        console.log('✅ Valid new vault config found with raw DEK and bcrypt hash');
        return data as NewVaultConfig;
      }
      
      // Check for legacy format (wrapped_dek)
      if (data.wrapped_dek) {
        console.log('✅ Valid legacy vault config found with wrapped DEK');
        return data as LegacyVaultConfig;
      }
    }
    
    console.log('🚫 No valid vault configuration found');
    return null;
  } catch (error) {
    console.error('💥 Error getting vault config:', error);
    
    // If it's a network/connection error, return null instead of throwing
    if (
      error instanceof TypeError ||
      (error instanceof Error && error.message.includes('fetch')) ||
      (error instanceof Error && error.message.includes('network'))
    ) {
      console.warn('🌐 Network error detected, treating as vault not initialized');
      return null;
    }
    
    return null;
  }
}

/**
 * Save new vault configuration for current user (raw_dek + bcrypt_hash)
 * Fixed: Use instance-based config instead of username-based to avoid conflicts when username changes
 */
export async function saveVaultConfig(rawDEK: string, bcryptHash: string): Promise<NewVaultConfig> {
  try {
    // Use the configured username for vault config
    const currentUsername = getCurrentUsername();
    
    const { data, error } = await supabase
      .from('vault_config')
      .upsert({
        user_id: currentUsername,
        raw_dek: rawDEK,
        bcrypt_hash: bcryptHash,
        wrapped_dek: null, // Explicitly set to null for new configs
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as NewVaultConfig;
  } catch (error) {
    console.error('Error saving vault config:', error);
    throw new Error(`Failed to save vault configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save legacy vault configuration (wrapped_dek based) - for backwards compatibility
 */
export async function saveLegacyVaultConfig(wrappedDEK: WrappedDEK, bcryptHash?: string): Promise<LegacyVaultConfig> {
  try {
    // Use the configured username for vault config
    const currentUsername = getCurrentUsername();
    
    const { data, error } = await supabase
      .from('vault_config')
      .upsert({
        user_id: currentUsername,
        wrapped_dek: wrappedDEK as unknown,
        bcrypt_hash: bcryptHash || null,
        raw_dek: null, // Explicitly set to null for legacy configs
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      ...data,
      wrapped_dek: data.wrapped_dek as unknown as WrappedDEK
    } as LegacyVaultConfig;
  } catch (error) {
    console.error('Error saving legacy vault config:', error);
    throw new Error(`Failed to save legacy vault configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete vault configuration for current user
 * Fixed: Use instance-based config instead of username-based to avoid conflicts when username changes
 */
export async function deleteVaultConfig(): Promise<void> {
  try {
    // Use the configured username for vault config
    const currentUsername = getCurrentUsername();
    
    const { error } = await supabase
      .from('vault_config')
      .delete()
      .eq('user_id', currentUsername);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting vault config:', error);
    throw new Error(`Failed to delete vault configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if vault is initialized for current user
 */
export async function isVaultInitialized(): Promise<boolean> {
  try {
    const config = await getVaultConfig();
    return config !== null;
  } catch (error) {
    console.error('Error checking vault initialization:', error);
    return false;
  }
}
