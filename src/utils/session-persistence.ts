/**
 * Simple Session Persistence
 * 
 * Stores keyPair in sessionStorage when persistence is enabled
 * This is a simplified version that works with the existing SimpleKeyManager
 */

import { SessionKeyManager } from './session-key-manager';
import { CryptoKeyPair } from './crypto-simple';

const SESSION_KEYPAIR_KEY = 'hashd_session_keypair';

export class SessionPersistence {
  /**
   * Save keyPair to sessionStorage if persistence is enabled
   */
  static async saveSession(walletAddress: string, keyPair: CryptoKeyPair): Promise<void> {
    if (!SessionKeyManager.isSessionPersistenceEnabled()) {
      console.log('📍 [SessionPersistence] Persistence disabled - skipping save');
      return;
    }

    try {
      // Encrypt the keyPair using SessionKeyManager
      const sessionData = {
        walletAddress,
        publicKey: Array.from(keyPair.publicKey),
        privateKey: Array.from(keyPair.privateKey),
        timestamp: Date.now()
      };

      // For now, store directly (we can add encryption later)
      // The SessionKeyManager already handles browser-level encryption
      sessionStorage.setItem(SESSION_KEYPAIR_KEY, JSON.stringify(sessionData));
      console.log('✅ [SessionPersistence] Saved keyPair to sessionStorage for wallet:', walletAddress.slice(0, 10) + '...');
    } catch (error) {
      console.error('❌ [SessionPersistence] Failed to save session:', error);
    }
  }

  /**
   * Restore keyPair from sessionStorage if available
   */
  static restoreSession(): { walletAddress: string; keyPair: CryptoKeyPair } | null {
    if (!SessionKeyManager.isSessionPersistenceEnabled()) {
      console.log('📍 [SessionPersistence] Persistence disabled - skipping restore');
      return null;
    }

    try {
      const stored = sessionStorage.getItem(SESSION_KEYPAIR_KEY);
      if (!stored) {
        console.log('📍 [SessionPersistence] No saved session found');
        return null;
      }

      const sessionData = JSON.parse(stored);
      const keyPair: CryptoKeyPair = {
        publicKey: new Uint8Array(sessionData.publicKey),
        privateKey: new Uint8Array(sessionData.privateKey)
      };

      const ageSeconds = Math.floor((Date.now() - sessionData.timestamp) / 1000);
      console.log('✅ [SessionPersistence] Restored session for wallet:', sessionData.walletAddress.slice(0, 10) + '... (age: ' + ageSeconds + 's)');

      return {
        walletAddress: sessionData.walletAddress,
        keyPair
      };
    } catch (error) {
      console.error('❌ [SessionPersistence] Failed to restore session:', error);
      return null;
    }
  }

  /**
   * Clear session from sessionStorage
   */
  static clearSession(): void {
    sessionStorage.removeItem(SESSION_KEYPAIR_KEY);
    console.log('🗑️ [SessionPersistence] Cleared session from sessionStorage');
  }

  /**
   * Check if a session exists
   */
  static hasSession(): boolean {
    return sessionStorage.getItem(SESSION_KEYPAIR_KEY) !== null;
  }
}
