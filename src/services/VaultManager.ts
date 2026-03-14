/**
 * VaultManager - High-level vault management service
 * 
 * Integrates SecureVault with VaultStorage to provide a complete
 * Bitwarden-style encryption system with proper passphrase validation.
 * 
 * Made with ❤️ by Pink Pixel ✨
 */

import { secureVault } from './SecureVault';
import { getVaultConfig, saveVaultConfig, deleteVaultConfig, isVaultInitialized, isLegacyVaultConfig, isNewVaultConfig } from './VaultStorage';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUsername, saveCurrentUsername } from '@/integrations/supabase/client';
import type { VaultEvent } from './SecureVault';
import type { SecretBlobV1 } from '@/crypto/types';
import { CryptoError, CryptoErrorType } from '@/crypto/types';
import { hashPassphrase, verifyPassphrase } from '@/crypto/bcrypt';

export class VaultManager {
  private initialized = false;
  private initializedUserId: string | null = null;

  /**
   * Initialize vault manager - loads existing vault config if available
   */
  async initialize(): Promise<void> {
    const currentUsername = getCurrentUsername();

    if (this.initialized && this.initializedUserId === currentUsername) {
      return;
    }

    try {
      if (this.initializedUserId && this.initializedUserId !== currentUsername) {
        secureVault.resetConfiguration();
      }

      // Check if vault is initialized in database
      const vaultInitialized = await isVaultInitialized();
      
      if (vaultInitialized) {
        // Load vault configuration from database
        const config = await getVaultConfig();
        if (config) {
          if (isNewVaultConfig(config)) {
            // New format: raw_dek + bcrypt_hash
            console.log('🔧 Initializing with new vault format (raw DEK)');
            await secureVault.initializeWithRawDEK(config.raw_dek);
          } else if (isLegacyVaultConfig(config)) {
            // Legacy format: wrapped_dek
            console.log('🔧 Initializing with legacy vault format (wrapped DEK)');
            await secureVault.initializeWithWrappedDEK(config.wrapped_dek);
          }
        }
      } else {
        secureVault.resetConfiguration();
      }

      this.initialized = true;
      this.initializedUserId = currentUsername;
    } catch (error) {
      console.error('Error initializing vault manager:', error);
      throw error;
    }
  }

  /**
   * Check if this is a first-time user (no vault configured)
   */
  async isFirstTimeUser(): Promise<boolean> {
    try {
      await this.initialize();
      
      // Check only database for first-time user status
      const hasVaultConfig = await isVaultInitialized();
      
      // Treat lack of vault config as first-time user
      return !hasVaultConfig;
    } catch (error) {
      console.error('Error checking first-time user status:', error);
      // If we can't check database, assume first-time user for safety
      return true;
    }
  }

  /**
   * Create new vault with master passphrase (first-time setup)
   */
  async createVault(masterPassphrase: string): Promise<void> {
    await this.initialize();

    try {
      // Create bcrypt hash of master passphrase for secure reset
      const bcryptHash = await hashPassphrase(masterPassphrase);
      
      // Create new vault with fresh DEK (no passphrase needed for DEK creation)
      const rawDEK = await secureVault.createNewVault();
      
      // Save raw DEK and bcrypt hash to database
      await saveVaultConfig(rawDEK, bcryptHash);
      
    } catch (error) {
      console.error('Error creating vault:', error);
      throw error;
    }
  }

  /**
   * Unlock existing vault with master passphrase
   */
  async unlockVault(masterPassphrase: string): Promise<void> {
    await this.initialize();

    try {
      // Get vault config
      const config = await getVaultConfig();
      if (!config) {
        throw new CryptoError(
          CryptoErrorType.VAULT_NOT_INITIALIZED,
          'Vault not initialized. Please set up encryption first.'
        );
      }

      if (isNewVaultConfig(config)) {
        // New format: use bcrypt verification only
        console.log('🔓 Unlocking new format vault (bcrypt-only)');
        
        const isValidPassphrase = await verifyPassphrase(masterPassphrase, config.bcrypt_hash);
        if (!isValidPassphrase) {
          throw new CryptoError(
            CryptoErrorType.INVALID_PASSPHRASE,
            'Invalid master passphrase. Please try again.'
          );
        }
        
        // Passphrase is valid, unlock vault with stored DEK
        await secureVault.unlockWithStoredDEK();
        
      } else if (isLegacyVaultConfig(config)) {
        // Legacy format: use the old wrapped DEK system
        console.log('🔓 Unlocking legacy format vault (wrapped DEK)');
        
        // For legacy vaults, use the original unlock method
        await secureVault.unlock(masterPassphrase);
      } else {
        throw new CryptoError(
          CryptoErrorType.VAULT_NOT_INITIALIZED,
          'Invalid vault configuration found.'
        );
      }
      
    } catch (error) {
      console.error('Error unlocking vault:', error);
      
      // Provide user-friendly error messages
      if (error instanceof CryptoError) {
        if (error.type === CryptoErrorType.INVALID_PASSPHRASE) {
          throw new Error('Invalid master passphrase. Please try again.');
        } else if (error.type === CryptoErrorType.VAULT_NOT_INITIALIZED) {
          throw new Error('Vault not initialized. Please set up encryption first.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Test if a passphrase is correct without unlocking
   */
  async testPassphrase(passphrase: string): Promise<boolean> {
    await this.initialize();
    
    try {
      // Get vault config
      const config = await getVaultConfig();
      if (!config) {
        return false;
      }

      if (isNewVaultConfig(config)) {
        // New format: test against bcrypt hash
        return await verifyPassphrase(passphrase, config.bcrypt_hash);
      } else if (isLegacyVaultConfig(config)) {
        // Legacy format: test against wrapped DEK (if bcrypt_hash exists, prefer it)
        if (config.bcrypt_hash) {
          return await verifyPassphrase(passphrase, config.bcrypt_hash);
        } else {
          // Fall back to testing wrapped DEK decryption
          return await secureVault.testPassphrase(passphrase);
        }
      }
      
      return false;
      
    } catch (error) {
      console.error('Error testing passphrase:', error);
      return false;
    }
  }

  /**
   * Lock the vault
   */
  lockVault(): void {
    secureVault.lock();
  }

  /**
   * Check if vault is unlocked
   */
  isUnlocked(): boolean {
    return secureVault.isUnlocked();
  }

  /**
   * Encrypt data
   */
  async encrypt(plaintext: string): Promise<SecretBlobV1> {
    return await secureVault.encrypt(plaintext);
  }

  /**
   * Decrypt data
   */
  async decrypt(blob: SecretBlobV1): Promise<string> {
    return await secureVault.decrypt(blob);
  }

  /**
   * Reset vault (delete all vault data)
   */
  async resetVault(): Promise<void> {
    try {
      // Lock vault first
      secureVault.resetConfiguration();
      
      // Delete vault config from database
      await deleteVaultConfig();
      
      // Reset initialization flag
      this.initialized = false;
      this.initializedUserId = null;
      
    } catch (error) {
      console.error('Error resetting vault:', error);
      throw error;
    }
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: VaultEvent) => void): void {
    secureVault.addEventListener(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: VaultEvent) => void): void {
    secureVault.removeEventListener(listener);
  }

  /**
   * Set auto-lock timeout
   */
  setAutoLockTimeout(timeoutMs: number): void {
    secureVault.setAutoLockTimeout(timeoutMs);
  }

  /**
   * Get time until auto-lock
   */
  getTimeUntilAutoLock(): number {
    return secureVault.getTimeUntilAutoLock();
  }

  /**
   * Register a new user with their own encrypted vault
   * This is a self-service registration - no admin required
   */
  async registerNewUser(username: string, passphrase: string): Promise<void> {
    try {
      const normalizedUsername = username.trim();

      // 1. Check if username already exists
      const { data: existing, error: checkError } = await supabase
        .from('vault_config')
        .select('user_id')
        .eq('user_id', normalizedUsername)
        .limit(1);

      if (checkError) {
        throw checkError;
      }

      if (Array.isArray(existing) && existing.length > 0) {
        throw new Error('Username already exists. Please choose a different username.');
      }

      // 2. Set the username in localStorage (this will be used by createVault)
      this.switchUserContext(normalizedUsername);

      // 3. Create new vault for this user (uses existing createVault method)
      await this.createVault(passphrase);

      // 4. Create default categories for new user
      await this.createDefaultCategories(normalizedUsername);

      console.log('✅ New user registered successfully:', normalizedUsername);
    } catch (error) {
      console.error('❌ User registration failed:', error);
      throw error;
    }
  }

  /**
   * Create default categories for a new user
   */
  private async createDefaultCategories(username: string): Promise<void> {
    const defaultCategories = [
      { name: 'Development', color: '#3b82f6', icon: 'code', description: 'Development tools and APIs' },
      { name: 'Personal', color: '#10b981', icon: 'user', description: 'Personal accounts and services' },
      { name: 'Work', color: '#f59e0b', icon: 'briefcase', description: 'Work-related credentials' },
      { name: 'Social Media', color: '#ec4899', icon: 'users', description: 'Social media accounts' },
      { name: 'Finance', color: '#06b6d4', icon: 'credit-card', description: 'Banking and financial services' },
      { name: 'Cloud Services', color: '#8b5cf6', icon: 'cloud', description: 'Cloud platforms and services' },
      { name: 'Security', color: '#ef4444', icon: 'shield', description: 'Security tools and certificates' }
    ];

    try {
      for (const category of defaultCategories) {
        await supabase.from('categories').insert({
          user_id: username,
          ...category
        });
      }
      console.log('✅ Default categories created for user:', username);
    } catch (error) {
      console.error('⚠️ Error creating default categories:', error);
      // Don't throw - categories are nice to have but not critical
    }
  }

  /**
   * Switch the active in-browser user context and clear any cached vault state.
   */
  switchUserContext(username: string): void {
    saveCurrentUsername(username);
    secureVault.resetConfiguration();
    this.initialized = false;
    this.initializedUserId = null;
  }

  /**
   * Diagnostic method to check database connectivity and table existence
   */
  async debugDatabase(): Promise<void> {
    try {
      console.log('🔧 Running database diagnostics...');
      
      // Test basic connectivity
      console.log('📡 Testing Supabase connectivity...');
      const { data: testData, error: testError } = await supabase
        .from('credentials')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('❌ Credentials table test failed:', testError);
      } else {
        console.log('✅ Credentials table accessible');
      }
      
      // Test vault_config table specifically
      console.log('🗄️ Testing vault_config table...');
      const { data: vaultData, error: vaultError } = await supabase
        .from('vault_config')
        .select('*')
        .limit(1);
        
      if (vaultError) {
        console.error('❌ Vault config table test failed:', vaultError);
        console.log('💡 This suggests the vault_config table may not exist in your database');
        console.log('📝 Please run the updated SQL setup script to create the vault_config table');
      } else {
        console.log('✅ Vault config table accessible');
      }
      
    } catch (error) {
      console.error('💥 Database diagnostic failed:', error);
    }
  }
}

// Export singleton instance
export const vaultManager = new VaultManager();
export default vaultManager;
