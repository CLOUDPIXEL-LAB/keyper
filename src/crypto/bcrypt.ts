/**
 * Bcrypt utilities for secure master passphrase hashing
 * 
 * This module provides bcrypt-based hashing for master passphrases,
 * enabling secure user-controlled password resets without backdoors.
 * 
 * Made with ❤️ by Pink Pixel ✨
 */

import bcrypt from 'bcryptjs';

/**
 * Default number of bcrypt rounds (cost factor)
 * Higher values are more secure but slower
 * 12 rounds is recommended for 2025 security standards
 */
const DEFAULT_ROUNDS = 12;

/**
 * Hash a master passphrase using bcrypt
 * @param passphrase - The plaintext passphrase to hash
 * @param rounds - Optional bcrypt rounds (cost factor), defaults to 12
 * @returns Promise resolving to the bcrypt hash
 */
export async function hashPassphrase(passphrase: string, rounds: number = DEFAULT_ROUNDS): Promise<string> {
  if (!passphrase || passphrase.length < 8) {
    throw new Error('Passphrase must be at least 8 characters long');
  }
  
  try {
    const salt = await bcrypt.genSalt(rounds);
    const hash = await bcrypt.hash(passphrase, salt);
    return hash;
  } catch (error) {
    throw new Error(`Failed to hash passphrase: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify a passphrase against a bcrypt hash
 * @param passphrase - The plaintext passphrase to verify
 * @param hash - The bcrypt hash to verify against
 * @returns Promise resolving to true if passphrase matches, false otherwise
 */
export async function verifyPassphrase(passphrase: string, hash: string): Promise<boolean> {
  if (!passphrase || !hash) {
    return false;
  }
  
  try {
    return await bcrypt.compare(passphrase, hash);
  } catch (error) {
    console.error('Error verifying passphrase:', error);
    return false;
  }
}

/**
 * Check if a string is a valid bcrypt hash
 * @param hash - The string to check
 * @returns True if the string appears to be a valid bcrypt hash
 */
export function isBcryptHash(hash: string): boolean {
  if (!hash || typeof hash !== 'string') {
    return false;
  }
  
  // Bcrypt hashes start with $2a$, $2b$, $2x$, or $2y$ and are 60 characters long
  const bcryptPattern = /^\$2[abxy]\$\d{2}\$[A-Za-z0-9./]{53}$/;
  return bcryptPattern.test(hash);
}

/**
 * Get the cost factor (rounds) from a bcrypt hash
 * @param hash - The bcrypt hash
 * @returns The cost factor, or null if invalid hash
 */
export function getCostFactor(hash: string): number | null {
  if (!isBcryptHash(hash)) {
    return null;
  }
  
  try {
    const costMatch = hash.match(/^\$2[abxy]\$(\d{2})\$/);
    return costMatch ? parseInt(costMatch[1], 10) : null;
  } catch (error) {
    return null;
  }
}
