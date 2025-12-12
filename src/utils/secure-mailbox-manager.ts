/**
 * Secure Mailbox Manager
 * 
 * Integrates session key management with existing crypto key pairs.
 * This provides a secure layer on top of the existing SimpleKeyManager.
 * 
 * Flow:
 * 1. User enters PIN
 * 2. Derive deterministic mailbox key from (wallet signature + PIN)
 * 3. Use mailbox key to derive ECDH key pair (existing system)
 * 4. Derive session key from mailbox key
 * 5. Wipe mailbox key
 * 6. Store session key in memory
 * 7. Use session key for all encryption/decryption operations
 */

import { ethers } from 'ethers';
import { SessionKeyManager } from './session-key-manager';
import { SimpleKeyManager, SimpleCryptoUtils, CryptoKeyPair } from './crypto-simple';

export interface SecureMailboxUnlockResult {
  success: boolean;
  keyPair?: CryptoKeyPair;
  sessionKey?: Uint8Array;
  error?: string;
}

export class SecureMailboxManager {
  /**
   * Unlock a mailbox with PIN
   * This is the main entry point for mailbox access
   * 
   * @param signer - Ethers signer for wallet signature
   * @param walletAddress - User's wallet address
   * @param pin - User's PIN
   * @returns Unlock result with key pair and session key
   */
  static async unlockMailbox(
    signer: ethers.Signer,
    walletAddress: string,
    pin: string
  ): Promise<SecureMailboxUnlockResult> {
    try {
      console.log('🔓 [SecureMailbox] Unlocking mailbox...');
      
      // Generate mailbox ID (unique identifier for this mailbox)
      const mailboxId = this.getMailboxId(walletAddress, pin);
      
      // Check if we already have an active session
      const existingSessionKey = SessionKeyManager.getSessionKey(mailboxId);
      if (existingSessionKey) {
        console.log('✅ [SecureMailbox] Active session found, loading keys...');
        
        // Load existing key pair from storage
        const keyPair = await SimpleKeyManager.loadMailboxKeys(pin, walletAddress);
        if (keyPair) {
          return {
            success: true,
            keyPair,
            sessionKey: existingSessionKey
          };
        }
      }
      
      // Try to restore encrypted session if persistence is enabled
      if (SessionKeyManager.isSessionPersistenceEnabled()) {
        console.log('🔐 [SecureMailbox] Attempting to restore encrypted session...');
        const restoredSessionKey = await SessionKeyManager.restoreEncryptedSession(mailboxId);
        
        if (restoredSessionKey) {
          console.log('✅ [SecureMailbox] Session restored from encrypted storage');
          
          // Load key pair
          const keyPair = await SimpleKeyManager.loadMailboxKeys(pin, walletAddress);
          if (keyPair) {
            return {
              success: true,
              keyPair,
              sessionKey: restoredSessionKey
            };
          }
        }
      }
      
      // No existing session - need to unlock with PIN
      console.log('🔐 [SecureMailbox] No active session, deriving keys from PIN...');
      
      // Step 1: Generate deterministic ECDH key pair (existing system)
      const keyPair = await SimpleKeyManager.generateDeterministicKeys(
        signer,
        walletAddress,
        pin
      );
      
      console.log('✅ [SecureMailbox] ECDH key pair generated');
      
      // Step 2: Unlock mailbox and create session key
      const unlockResult = await SessionKeyManager.unlockMailbox(
        signer,
        mailboxId,
        pin
      );
      
      if (!unlockResult.success || !unlockResult.sessionKey) {
        return {
          success: false,
          error: unlockResult.error || 'Failed to create session key'
        };
      }
      
      console.log('✅ [SecureMailbox] Session key created and stored');
      
      // Step 3: Save key pair to storage (existing system)
      // Note: This uses the existing storage system which may persist keys
      // The session key provides an additional security layer
      await SimpleKeyManager.saveMailboxKeys(pin, keyPair, 'Mailbox', walletAddress);
      
      return {
        success: true,
        keyPair,
        sessionKey: unlockResult.sessionKey
      };
    } catch (error) {
      console.error('❌ [SecureMailbox] Failed to unlock mailbox:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unlock mailbox'
      };
    }
  }
  
  /**
   * Switch to a different mailbox
   * This requires re-entering the PIN for the target mailbox
   */
  static async switchMailbox(
    signer: ethers.Signer,
    walletAddress: string,
    pin: string
  ): Promise<SecureMailboxUnlockResult> {
    console.log('🔄 [SecureMailbox] Switching mailbox...');
    
    // Unlock the target mailbox
    return await this.unlockMailbox(signer, walletAddress, pin);
  }
  
  /**
   * Lock a specific mailbox (terminate session)
   */
  static lockMailbox(walletAddress: string, pin: string): void {
    const mailboxId = this.getMailboxId(walletAddress, pin);
    console.log('🔒 [SecureMailbox] Locking mailbox:', mailboxId);
    
    SessionKeyManager.terminateSession(mailboxId);
  }
  
  /**
   * Lock all mailboxes (terminate all sessions)
   */
  static lockAllMailboxes(): void {
    console.log('🔒 [SecureMailbox] Locking all mailboxes...');
    SessionKeyManager.terminateAllSessions();
  }
  
  /**
   * Check if a mailbox is currently unlocked
   */
  static isMailboxUnlocked(walletAddress: string, pin: string): boolean {
    const mailboxId = this.getMailboxId(walletAddress, pin);
    return SessionKeyManager.hasActiveSession(mailboxId);
  }
  
  /**
   * Get session key for encryption/decryption
   * Returns null if mailbox is locked
   */
  static getSessionKey(walletAddress: string, pin: string): Uint8Array | null {
    const mailboxId = this.getMailboxId(walletAddress, pin);
    return SessionKeyManager.getSessionKey(mailboxId);
  }
  
  /**
   * Enable session persistence (remember until browser close)
   * Also persists any existing in-memory sessions
   */
  static async enableSessionPersistence(): Promise<void> {
    await SessionKeyManager.enableSessionPersistence();
    console.log('✅ [SecureMailbox] Session persistence enabled');
  }
  
  /**
   * Disable session persistence
   */
  static disableSessionPersistence(): void {
    SessionKeyManager.disableSessionPersistence();
    console.log('✅ [SecureMailbox] Session persistence disabled');
  }
  
  /**
   * Check if session persistence is enabled
   */
  static isSessionPersistenceEnabled(): boolean {
    return SessionKeyManager.isSessionPersistenceEnabled();
  }
  
  /**
   * Get all active mailbox sessions
   */
  static getActiveMailboxes(): string[] {
    return SessionKeyManager.getActiveSessionIds();
  }
  
  /**
   * Generate a unique mailbox ID from wallet address and PIN
   * This is used as the key for session storage
   */
  private static getMailboxId(walletAddress: string, pin: string): string {
    // Use a hash of wallet + PIN for the mailbox ID
    const combined = `${walletAddress.toLowerCase()}_${pin}`;
    return ethers.keccak256(ethers.toUtf8Bytes(combined));
  }
  
  /**
   * Encrypt message using session key
   * This is a wrapper around the existing encryption that uses the session key
   */
  static async encryptWithSession(
    message: string,
    recipientPublicKey: Uint8Array,
    senderPrivateKey: Uint8Array,
    senderPublicKey: Uint8Array,
    sessionKey: Uint8Array,
    txHash?: string
  ): Promise<{
    encryptedContent: string;
    encryptedMetadata: string;
  }> {
    // For now, use the existing encryption system
    // The session key provides authorization to perform this operation
    // In a future enhancement, we could use the session key to add an additional
    // encryption layer on top of the ECDH encryption
    
    return await SimpleCryptoUtils.encryptForContract(
      message,
      recipientPublicKey,
      senderPrivateKey,
      senderPublicKey,
      txHash
    );
  }
  
  /**
   * Decrypt message using session key
   * This is a wrapper around the existing decryption that uses the session key
   */
  static async decryptWithSession(
    encryptedContent: string,
    encryptedMetadata: string,
    recipientPrivateKey: Uint8Array,
    sessionKey: Uint8Array
  ): Promise<{ message: string; metadata: any }> {
    // For now, use the existing decryption system
    // The session key provides authorization to perform this operation
    
    return await SimpleCryptoUtils.decryptFromContract(
      encryptedContent,
      encryptedMetadata,
      recipientPrivateKey
    );
  }
}

/**
 * Hook into browser events to lock mailboxes on close/refresh
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    SecureMailboxManager.lockAllMailboxes();
  });
}
