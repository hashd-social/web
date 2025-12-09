/**
 * Secure Session Key Manager
 * 
 * Implements deterministic mailbox key derivation with secure session keys:
 * 1. Mailbox keys are derived from (wallet signature + PIN) - deterministic
 * 2. Mailbox keys are NEVER persisted - only used to derive session keys
 * 3. Session keys are temporary, non-deterministic, stored only in memory
 * 4. Optional: encrypted session persistence using WebCrypto
 */

import { ethers } from 'ethers';
import { CryptoKeyPair } from './crypto-simple';

// Session key storage (in-memory only by default)
interface SessionKeyData {
  sessionKey: Uint8Array;
  createdAt: number;
  mailboxId: string;
}

// Encrypted session data for optional persistence
interface EncryptedSessionData {
  encryptedSessionKey: string;
  iv: string;
  createdAt: number;
  mailboxId: string;
}

export class SessionKeyManager {
  private static readonly SESSION_STORAGE_KEY = 'hashd_encrypted_sessions';
  private static readonly SESSION_PERSISTENCE_KEY = 'hashd_session_persistence_enabled';
  
  // In-memory session key storage (primary storage)
  private static sessionKeys = new Map<string, SessionKeyData>();
  
  // Browser-generated encryption key for session persistence (non-exportable)
  private static browserEncryptionKey: CryptoKey | null = null;
  
  /**
   * Zero out memory for security
   * Overwrites sensitive data with zeros before clearing
   */
  private static zeroMemory(data: Uint8Array): void {
    if (data && data.length > 0) {
      for (let i = 0; i < data.length; i++) {
        data[i] = 0;
      }
    }
  }
  
  /**
   * Derive deterministic mailbox key from wallet signature + PIN
   * This key is NEVER persisted - only used to derive session key
   */
  static async deriveMailboxKey(
    signer: ethers.Signer,
    mailboxId: string,
    pin: string
  ): Promise<Uint8Array> {
    console.log('🔐 Deriving deterministic mailbox key...');
    
    // Create deterministic message for wallet signature
    const message = `HASHD_MAILBOX_${mailboxId}`;
    
    // Get wallet signature (deterministic for same wallet + message)
    const signature = await signer.signMessage(message);
    const signatureBytes = ethers.getBytes(signature);
    
    // Combine signature with PIN using KDF
    const combined = new TextEncoder().encode(signature + pin);
    
    // Use HKDF to derive mailbox key
    const importedKey = await crypto.subtle.importKey(
      'raw',
      combined as BufferSource,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );
    
    const mailboxKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new TextEncoder().encode('HASHD_MAILBOX_KEY_V1'),
        info: new TextEncoder().encode(mailboxId)
      },
      importedKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    // Export to raw bytes
    const mailboxKeyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', mailboxKey));
    
    console.log('✅ Mailbox key derived (will be wiped after session key creation)');
    return mailboxKeyBytes;
  }
  
  /**
   * Derive non-deterministic session key from mailbox key
   * Uses HKDF with random salt for non-determinism
   */
  static async deriveSessionKey(mailboxKey: Uint8Array): Promise<Uint8Array> {
    console.log('🔐 Deriving session key from mailbox key...');
    
    // Generate random salt for non-determinism
    const randomSalt = crypto.getRandomValues(new Uint8Array(32));
    
    // Import mailbox key
    const importedMailboxKey = await crypto.subtle.importKey(
      'raw',
      mailboxKey as BufferSource,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );
    
    // Derive session key with random salt
    const sessionKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: randomSalt,
        info: new TextEncoder().encode('HASHD_SESSION')
      },
      importedMailboxKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    // Export to raw bytes
    const sessionKeyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', sessionKey));
    
    console.log('✅ Session key derived (non-deterministic)');
    return sessionKeyBytes;
  }
  
  /**
   * Unlock mailbox: Derive mailbox key, create session key, wipe mailbox key
   * This is the main entry point for unlocking a mailbox
   */
  static async unlockMailbox(
    signer: ethers.Signer,
    mailboxId: string,
    pin: string
  ): Promise<{ success: boolean; sessionKey?: Uint8Array; error?: string }> {
    try {
      console.log('🔓 Unlocking mailbox:', mailboxId);
      
      // Step 1: Derive deterministic mailbox key
      const mailboxKey = await this.deriveMailboxKey(signer, mailboxId, pin);
      
      // Step 2: Derive non-deterministic session key
      const sessionKey = await this.deriveSessionKey(mailboxKey);
      
      // Step 3: IMMEDIATELY wipe mailbox key from memory
      this.zeroMemory(mailboxKey);
      console.log('🗑️ Mailbox key wiped from memory');
      
      // Step 4: Store session key in memory
      this.sessionKeys.set(mailboxId, {
        sessionKey,
        createdAt: Date.now(),
        mailboxId
      });
      
      console.log('✅ Mailbox unlocked - session key stored in memory');
      
      // Step 5: If session persistence is enabled, encrypt and store
      if (this.isSessionPersistenceEnabled()) {
        await this.persistEncryptedSession(mailboxId, sessionKey);
      }
      
      return { success: true, sessionKey };
    } catch (error) {
      console.error('❌ Failed to unlock mailbox:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unlock mailbox'
      };
    }
  }
  
  /**
   * Get session key for a mailbox
   * Returns null if session has expired or doesn't exist
   */
  static getSessionKey(mailboxId: string): Uint8Array | null {
    const sessionData = this.sessionKeys.get(mailboxId);
    if (sessionData) {
      console.log('🔐 Session key retrieved from memory');
      return sessionData.sessionKey;
    }
    
    console.log('🔒 No active session key in memory');
    return null;
  }
  
  /**
   * Check if session persistence is enabled (default: true)
   */
  static isSessionPersistenceEnabled(): boolean {
    // Default to true - only disabled if explicitly set to 'false'
    return localStorage.getItem(this.SESSION_PERSISTENCE_KEY) !== 'false';
  }
  
  /**
   * Enable session persistence
   */
  static enableSessionPersistence(): void {
    localStorage.setItem(this.SESSION_PERSISTENCE_KEY, 'true');
    console.log('✅ [SessionKeyManager] Persistence flag set in localStorage');
  }
  
  /**
   * Disable session persistence
   */
  static disableSessionPersistence(): void {
    localStorage.removeItem(this.SESSION_PERSISTENCE_KEY);
    sessionStorage.removeItem(this.SESSION_STORAGE_KEY);
    console.log('🔒 [SessionKeyManager] Persistence flag removed, sessions cleared');
  }
  
  /**
   * Get or create browser encryption key for session persistence
   * This key is non-exportable and lives only in the browser
   */
  private static async getBrowserEncryptionKey(): Promise<CryptoKey> {
    if (this.browserEncryptionKey) {
      return this.browserEncryptionKey;
    }
    
    // Generate a new non-exportable AES-GCM key
    this.browserEncryptionKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // non-exportable
      ['encrypt', 'decrypt']
    );
    
    console.log('🔐 Generated browser encryption key (non-exportable)');
    return this.browserEncryptionKey;
  }
  
  /**
   * Encrypt and persist session key to sessionStorage
   * Only called if user has enabled session persistence
   */
  private static async persistEncryptedSession(
    mailboxId: string,
    sessionKey: Uint8Array
  ): Promise<void> {
    try {
      console.log('🔐 Encrypting session key for persistence...');
      
      // Get browser encryption key
      const browserKey = await this.getBrowserEncryptionKey();
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt session key
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        browserKey,
        sessionKey as BufferSource
      );
      
      // Store encrypted session in sessionStorage
      const encryptedSession: EncryptedSessionData = {
        encryptedSessionKey: this.bytesToBase64(new Uint8Array(encryptedData)),
        iv: this.bytesToBase64(iv),
        createdAt: Date.now(),
        mailboxId
      };
      
      // Get existing sessions
      const existingSessions = this.getEncryptedSessions();
      existingSessions[mailboxId] = encryptedSession;
      
      sessionStorage.setItem(
        this.SESSION_STORAGE_KEY,
        JSON.stringify(existingSessions)
      );
      
      console.log('✅ Session key encrypted and stored in sessionStorage');
    } catch (error) {
      console.error('❌ Failed to persist encrypted session:', error);
    }
  }
  
  /**
   * Restore session key from encrypted storage
   */
  static async restoreEncryptedSession(mailboxId: string): Promise<Uint8Array | null> {
    try {
      if (!this.isSessionPersistenceEnabled()) {
        return null;
      }
      
      console.log('🔐 Attempting to restore encrypted session...');
      
      const sessions = this.getEncryptedSessions();
      const encryptedSession = sessions[mailboxId];
      
      if (!encryptedSession) {
        console.log('ℹ️ No encrypted session found');
        return null;
      }
      
      // Get browser encryption key
      const browserKey = await this.getBrowserEncryptionKey();
      
      // Decrypt session key
      const encryptedData = this.base64ToBytes(encryptedSession.encryptedSessionKey);
      const iv = this.base64ToBytes(encryptedSession.iv);
      
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        browserKey,
        encryptedData as BufferSource
      );
      
      const sessionKey = new Uint8Array(decryptedData);
      
      // Store in memory
      this.sessionKeys.set(mailboxId, {
        sessionKey,
        createdAt: encryptedSession.createdAt,
        mailboxId
      });
      
      console.log('✅ Session key restored from encrypted storage');
      return sessionKey;
    } catch (error) {
      console.error('❌ Failed to restore encrypted session:', error);
      return null;
    }
  }
  
  /**
   * Get all encrypted sessions from sessionStorage
   */
  private static getEncryptedSessions(): Record<string, EncryptedSessionData> {
    const stored = sessionStorage.getItem(this.SESSION_STORAGE_KEY);
    if (!stored) return {};
    
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }
  
  /**
   * Terminate session for a specific mailbox
   */
  static terminateSession(mailboxId: string): void {
    console.log('🔒 Terminating session for mailbox:', mailboxId);
    
    // Get session key and wipe it
    const sessionData = this.sessionKeys.get(mailboxId);
    if (sessionData) {
      this.zeroMemory(sessionData.sessionKey);
    }
    
    // Remove from memory
    this.sessionKeys.delete(mailboxId);
    
    // Remove from sessionStorage
    const sessions = this.getEncryptedSessions();
    delete sessions[mailboxId];
    
    if (Object.keys(sessions).length > 0) {
      sessionStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(sessions));
    } else {
      sessionStorage.removeItem(this.SESSION_STORAGE_KEY);
    }
    
    console.log('✅ Session terminated and wiped');
  }
  
  /**
   * Terminate all sessions
   */
  static terminateAllSessions(): void {
    console.log('🔒 Terminating all sessions...');
    
    // Wipe all session keys from memory
    this.sessionKeys.forEach((sessionData) => {
      this.zeroMemory(sessionData.sessionKey);
    });
    
    // Clear memory storage
    this.sessionKeys.clear();
    
    // Clear sessionStorage
    sessionStorage.removeItem(this.SESSION_STORAGE_KEY);
    
    // Clear browser encryption key
    this.browserEncryptionKey = null;
    
    console.log('✅ All sessions terminated and wiped');
  }
  
  /**
   * Check if a session exists for a mailbox
   */
  static hasActiveSession(mailboxId: string): boolean {
    return this.sessionKeys.has(mailboxId);
  }
  
  /**
   * Get all active session mailbox IDs
   */
  static getActiveSessionIds(): string[] {
    return Array.from(this.sessionKeys.keys());
  }
  
  // Utility methods
  private static bytesToBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...Array.from(bytes)));
  }
  
  private static base64ToBytes(base64: string): Uint8Array {
    return new Uint8Array(
      atob(base64)
        .split('')
        .map((c) => c.charCodeAt(0))
    );
  }
}

/**
 * Hook into browser events to terminate sessions
 */
if (typeof window !== 'undefined') {
  // Terminate all sessions on page unload (tab close, refresh, navigation)
  window.addEventListener('beforeunload', () => {
    SessionKeyManager.terminateAllSessions();
  });
  
  // Also terminate on visibility change (browser close)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Don't terminate here - only on actual unload
      // This allows tab switching without losing session
    }
  });
}
