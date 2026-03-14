/**
 * SecureVault - Simplified encryption system with bcrypt-only passphrase validation
 * 
 * Simplified architecture:
 * - DEK (Data Encryption Key): Random 256-bit key that encrypts all secrets
 * - Master passphrase: Verified via bcrypt hash only (no key derivation)
 * - Server sees: ciphertexts + raw DEK + bcrypt hash
 * - Unlock: bcrypt verify passphrase → load DEK → decrypt secrets
 * - Lock: immediately zeroize DEK from memory
 * 
 * Made with ❤️ by Pink Pixel ✨
 */

import { encryptString, decryptString, deriveKey } from '@/crypto/crypto';
import type { SecretBlobV1, VaultStatus, CryptoMetrics } from '@/crypto/types';
import { CryptoError, CryptoErrorType } from '@/crypto/types';
import { securityLogger, logVaultUnlock, logEncryptionOperation } from '@/security/SecurityAuditLogger';

/**
 * Wrapped DEK structure stored on server (for legacy support)
 */
export interface WrappedDEK {
  v: 1;
  kdf: 'argon2id' | 'pbkdf2';
  salt: string; // base64
  iv: string;   // base64
  ct: string;   // base64 - encrypted DEK
}

/**
 * Event types for vault state changes
 */
export type VaultEvent = 'locked' | 'unlocked' | 'auto-locked';

/**
 * Vault event listener function
 */
export type VaultEventListener = (event: VaultEvent) => void;

class SecureVault {
  private dek: CryptoKey | null = null; // Data Encryption Key (in memory only)
  private rawDEK: string | null = null; // Stored raw DEK (base64) - new format
  private wrappedDEK: WrappedDEK | null = null; // Stored wrapped DEK - legacy format
  private autoLockTimeoutMs: number = 15 * 60 * 1000; // 15 minutes
  private autoLockTimer: NodeJS.Timeout | null = null;
  private lastActivity: Date | null = null;
  private listeners: VaultEventListener[] = [];
  private metrics: CryptoMetrics[] = [];

  /**
   * Initialize with existing raw DEK (for new format users)
   */
  async initializeWithRawDEK(rawDEK: string): Promise<void> {
    console.log('🔧 Initializing SecureVault with raw DEK (length):', rawDEK.length);
    this.rawDEK = rawDEK;
  }

  /**
   * Initialize with existing wrapped DEK (for legacy format users)
   */
  async initializeWithWrappedDEK(wrappedDEK: WrappedDEK): Promise<void> {
    console.log('🔧 Initializing SecureVault with wrapped DEK:', {
      version: wrappedDEK.v,
      kdf: wrappedDEK.kdf,
      hasSalt: !!wrappedDEK.salt,
      hasIv: !!wrappedDEK.iv,
      hasCt: !!wrappedDEK.ct
    });
    this.wrappedDEK = wrappedDEK;
  }

  /**
   * Create new vault with fresh DEK (for first-time users)
   * Passphrase validation is handled externally via bcrypt
   */
  async createNewVault(): Promise<string> {
    const startTime = performance.now();

    try {
      console.log('🔧 Creating new vault with fresh DEK...');

      // Generate fresh 256-bit DEK
      const dek = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true, // extractable for storage
        ["encrypt", "decrypt"]
      );

      // Export DEK as raw bytes and encode as base64
      const dekBytes = await crypto.subtle.exportKey("raw", dek);
      const rawDEK = this.bufToBase64(dekBytes);

      // Store DEK in memory and as raw data
      this.dek = dek;
      this.rawDEK = rawDEK;
      this.lastActivity = new Date();
      this.resetAutoLockTimer();

      const duration = performance.now() - startTime;
      logVaultUnlock(true, duration);
      this.notifyListeners('unlocked');

      console.log('✅ New vault created successfully');
      return rawDEK;

    } catch (error) {
      logVaultUnlock(false, performance.now() - startTime);
      throw error;
    }
  }

  /**
   * Unlock vault with stored DEK (passphrase validation handled externally)
   */
  async unlockWithStoredDEK(): Promise<void> {
    const startTime = performance.now();
    
    console.log('🔓 Starting vault unlock with stored DEK...');

    try {
      if (!this.rawDEK) {
        console.log('❌ No raw DEK found');
        throw new CryptoError(
          CryptoErrorType.VAULT_NOT_INITIALIZED,
          "Vault not initialized - no raw DEK found"
        );
      }

      console.log('🔄 Importing stored DEK...');
      // Convert base64 DEK back to bytes
      const dekBytes = this.base64ToBuf(this.rawDEK);
      
      // Import DEK for use
      this.dek = await crypto.subtle.importKey(
        "raw",
        dekBytes,
        { name: "AES-GCM" },
        false, // not extractable once imported
        ["encrypt", "decrypt"]
      );
      
      console.log('✅ DEK imported successfully');

      this.lastActivity = new Date();
      this.resetAutoLockTimer();

      const duration = performance.now() - startTime;
      logVaultUnlock(true, duration);
      this.notifyListeners('unlocked');
      console.log('🎉 Vault unlocked successfully!');

    } catch (error) {
      console.log('❌ Unlock process failed:', error.message);
      logVaultUnlock(false, performance.now() - startTime);
      throw error;
    }
  }

  /**
   * Check if vault is unlocked (DEK is in memory)
   */
  isUnlocked(): boolean {
    return this.dek !== null;
  }

  /**
   * Lock vault (zeroize DEK from memory)
   */
  lock(): void {
    if (this.dek) {
      // Clear DEK from memory (limited in JS, but we try)
      this.dek = null;
      this.clearAutoLockTimer();
      this.lastActivity = null;

      securityLogger.logEvent('vault_lock', 'info', 'Vault locked manually');
      this.notifyListeners('locked');
    }
  }

  /**
   * Clear all stored vault material so another user can be loaded safely.
   */
  resetConfiguration(): void {
    this.lock();
    this.rawDEK = null;
    this.wrappedDEK = null;
  }

  /**
   * Encrypt data using DEK
   */
  async encrypt(plaintext: string): Promise<SecretBlobV1> {
    if (!this.dek) {
      throw new CryptoError(CryptoErrorType.VAULT_LOCKED, "Vault is locked");
    }

    this.updateActivity();
    
    const startTime = performance.now();
    try {
      // Use DEK directly for encryption
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const plaintextBytes = new TextEncoder().encode(plaintext);
      
      const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        this.dek,
        plaintextBytes
      );

      const duration = performance.now() - startTime;
      logEncryptionOperation('encrypt', true, duration);

      // Return in SecretBlobV1 format for compatibility (simplified)
      return {
        v: 1,
        kdf: 'bcrypt', // Indicate bcrypt-based system
        salt: '', // No salt needed for data encryption
        iv: this.bufToBase64(iv.buffer),
        ct: this.bufToBase64(ciphertext)
      };

    } catch (error) {
      const duration = performance.now() - startTime;
      logEncryptionOperation('encrypt', false, duration);
      throw error;
    }
  }

  /**
   * Decrypt data using DEK
   */
  async decrypt(blob: SecretBlobV1): Promise<string> {
    if (!this.dek) {
      throw new CryptoError(CryptoErrorType.VAULT_LOCKED, "Vault is locked");
    }

    this.updateActivity();
    
    const startTime = performance.now();
    try {
      const iv = new Uint8Array(this.base64ToBuf(blob.iv));
      const ciphertext = this.base64ToBuf(blob.ct);
      
      const plaintextBytes = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        this.dek,
        ciphertext
      );

      const duration = performance.now() - startTime;
      logEncryptionOperation('decrypt', true, duration);

      return new TextDecoder().decode(plaintextBytes);

    } catch (error) {
      const duration = performance.now() - startTime;
      logEncryptionOperation('decrypt', false, duration);
      throw error;
    }
  }

  /**
   * Get raw DEK for storage
   */
  getRawDEK(): string | null {
    return this.rawDEK;
  }

  /**
   * Export current DEK as raw base64 string (for migration purposes)
   * Only works when vault is unlocked
   */
  async exportRawDEK(): Promise<string | null> {
    if (!this.dek) {
      console.warn('Cannot export DEK: vault is locked');
      return null;
    }

    try {
      // Export the current in-memory DEK as raw bytes
      const dekBytes = await crypto.subtle.exportKey("raw", this.dek);
      const rawDEK = this.bufToBase64(dekBytes);
      console.log('DEK exported for migration:', { length: rawDEK.length });
      return rawDEK;
    } catch (error) {
      console.error('Error exporting DEK:', error);
      return null;
    }
  }

  /**
   * Legacy unlock method for wrapped DEK format
   */
  async unlock(masterPassphrase: string): Promise<void> {
    const startTime = performance.now();
    
    console.log('🔓 Starting legacy vault unlock process...');
    console.log('🔍 Wrapped DEK details:', {
      version: this.wrappedDEK?.v,
      kdf: this.wrappedDEK?.kdf,
      saltLength: this.wrappedDEK?.salt.length,
      ivLength: this.wrappedDEK?.iv.length,
      ctLength: this.wrappedDEK?.ct.length
    });

    try {
      if (!this.wrappedDEK) {
        console.log('❌ No wrapped DEK found');
        throw new CryptoError(
          CryptoErrorType.VAULT_NOT_INITIALIZED,
          "Vault not initialized - no wrapped DEK found"
        );
      }

      if (!masterPassphrase || masterPassphrase.length < 8) {
        console.log('❌ Passphrase too short:', masterPassphrase.length);
        throw new CryptoError(
          CryptoErrorType.INVALID_PASSPHRASE,
          "Master passphrase must be at least 8 characters long"
        );
      }

      // Derive KEK from master passphrase using stored salt
      const salt = new Uint8Array(this.base64ToBuf(this.wrappedDEK.salt));
      const { key: kek } = await deriveKey(masterPassphrase, salt);

      // Attempt to unwrap DEK
      const iv = new Uint8Array(this.base64ToBuf(this.wrappedDEK.iv));
      const wrappedDekBytes = this.base64ToBuf(this.wrappedDEK.ct);

      try {
        const dekBytes = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          kek,
          wrappedDekBytes
        );

        // Import DEK
        this.dek = await crypto.subtle.importKey(
          "raw",
          dekBytes,
          { name: "AES-GCM" },
          false, // not extractable once imported
          ["encrypt", "decrypt"]
        );

        this.lastActivity = new Date();
        this.resetAutoLockTimer();

        const duration = performance.now() - startTime;
        logVaultUnlock(true, duration);
        this.notifyListeners('unlocked');
        console.log('🎉 Legacy vault unlocked successfully!');

      } catch (decryptError) {
        console.log('❌ AES decryption failed:', decryptError.message);
        throw new CryptoError(
          CryptoErrorType.INVALID_PASSPHRASE,
          "Invalid master passphrase"
        );
      }

    } catch (error) {
      console.log('❌ Legacy unlock process failed:', error.message);
      logVaultUnlock(false, performance.now() - startTime);
      throw error;
    }
  }

  /**
   * Legacy method to test passphrase against wrapped DEK
   */
  async testPassphrase(passphrase: string): Promise<boolean> {
    if (!this.wrappedDEK) {
      return false;
    }

    try {
      const salt = new Uint8Array(this.base64ToBuf(this.wrappedDEK.salt));
      const { key: kek } = await deriveKey(passphrase, salt);
      
      const iv = new Uint8Array(this.base64ToBuf(this.wrappedDEK.iv));
      const wrappedDekBytes = this.base64ToBuf(this.wrappedDEK.ct);

      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        kek,
        wrappedDekBytes
      );

      return true; // Decryption succeeded
    } catch {
      return false; // Decryption failed = wrong passphrase
    }
  }

  /**
   * Get wrapped DEK for legacy storage
   */
  getWrappedDEK(): WrappedDEK | null {
    return this.wrappedDEK;
  }

  // Helper methods
  private bufToBase64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  private base64ToBuf(base64: string): ArrayBuffer {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
  }

  private updateActivity(): void {
    this.lastActivity = new Date();
    this.resetAutoLockTimer();
  }

  private resetAutoLockTimer(): void {
    this.clearAutoLockTimer();
    
    if (this.autoLockTimeoutMs > 0) {
      this.autoLockTimer = setTimeout(() => {
        this.lock();
        this.notifyListeners('auto-locked');
      }, this.autoLockTimeoutMs);
    }
  }

  private clearAutoLockTimer(): void {
    if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer);
      this.autoLockTimer = null;
    }
  }

  private notifyListeners(event: VaultEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in vault event listener:', error);
      }
    });
  }

  // Event management
  addEventListener(listener: VaultEventListener): void {
    this.listeners.push(listener);
  }

  removeEventListener(listener: VaultEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Auto-lock configuration
  setAutoLockTimeout(timeoutMs: number): void {
    this.autoLockTimeoutMs = timeoutMs;
    if (this.isUnlocked()) {
      this.resetAutoLockTimer();
    }
  }

  getTimeUntilAutoLock(): number {
    if (!this.lastActivity || this.autoLockTimeoutMs <= 0) {
      return 0;
    }
    
    const elapsed = Date.now() - this.lastActivity.getTime();
    return Math.max(0, this.autoLockTimeoutMs - elapsed);
  }
}

// Export singleton instance
export const secureVault = new SecureVault();
export default secureVault;
