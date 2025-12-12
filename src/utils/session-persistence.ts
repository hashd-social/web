/**
 * Session Persistence
 * 
 * Simple, self-contained session persistence for keyPair storage.
 * Stores keyPair in sessionStorage when persistence is enabled.
 */

import { CryptoKeyPair } from './crypto-simple';

const SESSION_KEYPAIR_KEY = 'hashd_session_keypair';
const SESSION_PERSISTENCE_KEY = 'hashd_session_persistence_enabled';

export class SessionPersistence {
  /**
   * Check if session persistence is enabled (default: true)
   */
  static isEnabled(): boolean {
    return localStorage.getItem(SESSION_PERSISTENCE_KEY) !== 'false';
  }

  /**
   * Enable session persistence
   */
  static enable(): void {
    localStorage.setItem(SESSION_PERSISTENCE_KEY, 'true');
    console.log('✅ [SessionPersistence] Enabled');
  }

  /**
   * Disable session persistence and clear stored session
   */
  static disable(): void {
    localStorage.setItem(SESSION_PERSISTENCE_KEY, 'false');
    sessionStorage.removeItem(SESSION_KEYPAIR_KEY);
    console.log('🔒 [SessionPersistence] Disabled and cleared');
  }

  /**
   * Save keyPair to sessionStorage (only if persistence is enabled)
   */
  static saveSession(walletAddress: string, keyPair: CryptoKeyPair): void {
    if (!this.isEnabled()) {
      console.log('📍 [SessionPersistence] Disabled - skipping save');
      return;
    }

    try {
      const sessionData = {
        walletAddress,
        publicKey: Array.from(keyPair.publicKey),
        privateKey: Array.from(keyPair.privateKey),
        timestamp: Date.now()
      };

      sessionStorage.setItem(SESSION_KEYPAIR_KEY, JSON.stringify(sessionData));
      console.log('✅ [SessionPersistence] Saved session for:', walletAddress.slice(0, 10) + '...');
    } catch (error) {
      console.error('❌ [SessionPersistence] Failed to save:', error);
    }
  }

  /**
   * Restore keyPair from sessionStorage
   */
  static restoreSession(): { walletAddress: string; keyPair: CryptoKeyPair } | null {
    console.log('🔍 [SessionPersistence] Attempting restore...');
    console.log('🔍 [SessionPersistence] isEnabled:', this.isEnabled());
    console.log('🔍 [SessionPersistence] sessionStorage key exists:', sessionStorage.getItem(SESSION_KEYPAIR_KEY) !== null);
    
    if (!this.isEnabled()) {
      console.log('📍 [SessionPersistence] Disabled - skipping restore');
      return null;
    }

    try {
      const stored = sessionStorage.getItem(SESSION_KEYPAIR_KEY);
      if (!stored) {
        console.log('📍 [SessionPersistence] No session data in sessionStorage');
        return null;
      }

      const sessionData = JSON.parse(stored);
      console.log('✅ [SessionPersistence] Restored session for:', sessionData.walletAddress?.slice(0, 10) + '...');
      return {
        walletAddress: sessionData.walletAddress,
        keyPair: {
          publicKey: new Uint8Array(sessionData.publicKey),
          privateKey: new Uint8Array(sessionData.privateKey)
        }
      };
    } catch (error) {
      console.error('❌ [SessionPersistence] Failed to restore:', error);
      return null;
    }
  }

  /**
   * Clear session from sessionStorage
   */
  static clearSession(): void {
    sessionStorage.removeItem(SESSION_KEYPAIR_KEY);
  }

  /**
   * Check if a session exists in storage
   */
  static hasSession(): boolean {
    return sessionStorage.getItem(SESSION_KEYPAIR_KEY) !== null;
  }
}
