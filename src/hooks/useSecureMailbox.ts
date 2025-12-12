/**
 * React Hook for Secure Mailbox Management
 * 
 * Provides a simple interface for components to interact with the secure mailbox system.
 */

import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { SecureMailboxManager, SecureMailboxUnlockResult } from '../utils/secure-mailbox-manager';
import { CryptoKeyPair } from '../utils/crypto-simple';

interface UseSecureMailboxReturn {
  // State
  isUnlocking: boolean;
  error: string | null;
  keyPair: CryptoKeyPair | null;
  sessionKey: Uint8Array | null;
  isSessionPersistenceEnabled: boolean;
  
  // Actions
  unlockMailbox: (signer: ethers.Signer, walletAddress: string, pin: string) => Promise<SecureMailboxUnlockResult>;
  switchMailbox: (signer: ethers.Signer, walletAddress: string, pin: string) => Promise<SecureMailboxUnlockResult>;
  lockMailbox: (walletAddress: string, pin: string) => void;
  lockAllMailboxes: () => void;
  enableSessionPersistence: () => void;
  disableSessionPersistence: () => void;
  clearError: () => void;
  
  // Queries
  isMailboxUnlocked: (walletAddress: string, pin: string) => boolean;
  getActiveMailboxes: () => string[];
}

export const useSecureMailbox = (): UseSecureMailboxReturn => {
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyPair, setKeyPair] = useState<CryptoKeyPair | null>(null);
  const [sessionKey, setSessionKey] = useState<Uint8Array | null>(null);
  const [isSessionPersistenceEnabled, setIsSessionPersistenceEnabled] = useState(
    SecureMailboxManager.isSessionPersistenceEnabled()
  );
  
  /**
   * Unlock a mailbox with PIN
   */
  const unlockMailbox = useCallback(async (
    signer: ethers.Signer,
    walletAddress: string,
    pin: string
  ): Promise<SecureMailboxUnlockResult> => {
    setIsUnlocking(true);
    setError(null);
    
    try {
      const result = await SecureMailboxManager.unlockMailbox(signer, walletAddress, pin);
      
      if (result.success && result.keyPair && result.sessionKey) {
        setKeyPair(result.keyPair);
        setSessionKey(result.sessionKey);
        console.log('✅ [useSecureMailbox] Mailbox unlocked successfully');
      } else {
        setError(result.error || 'Failed to unlock mailbox');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to unlock mailbox';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsUnlocking(false);
    }
  }, []);
  
  /**
   * Switch to a different mailbox
   */
  const switchMailbox = useCallback(async (
    signer: ethers.Signer,
    walletAddress: string,
    pin: string
  ): Promise<SecureMailboxUnlockResult> => {
    setIsUnlocking(true);
    setError(null);
    
    try {
      const result = await SecureMailboxManager.switchMailbox(signer, walletAddress, pin);
      
      if (result.success && result.keyPair && result.sessionKey) {
        setKeyPair(result.keyPair);
        setSessionKey(result.sessionKey);
        console.log('✅ [useSecureMailbox] Switched mailbox successfully');
      } else {
        setError(result.error || 'Failed to switch mailbox');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to switch mailbox';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsUnlocking(false);
    }
  }, []);
  
  /**
   * Lock a specific mailbox
   */
  const lockMailbox = useCallback((walletAddress: string, pin: string) => {
    SecureMailboxManager.lockMailbox(walletAddress, pin);
    setKeyPair(null);
    setSessionKey(null);
    console.log('🔒 [useSecureMailbox] Mailbox locked');
  }, []);
  
  /**
   * Lock all mailboxes
   */
  const lockAllMailboxes = useCallback(() => {
    SecureMailboxManager.lockAllMailboxes();
    setKeyPair(null);
    setSessionKey(null);
    console.log('🔒 [useSecureMailbox] All mailboxes locked');
  }, []);
  
  /**
   * Enable session persistence (also persists any existing in-memory sessions)
   */
  const enableSessionPersistence = useCallback(async () => {
    await SecureMailboxManager.enableSessionPersistence();
    setIsSessionPersistenceEnabled(true);
    console.log('✅ [useSecureMailbox] Session persistence enabled');
  }, []);
  
  /**
   * Disable session persistence
   */
  const disableSessionPersistence = useCallback(() => {
    SecureMailboxManager.disableSessionPersistence();
    setIsSessionPersistenceEnabled(false);
    console.log('✅ [useSecureMailbox] Session persistence disabled');
  }, []);
  
  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  /**
   * Check if a mailbox is unlocked
   */
  const isMailboxUnlocked = useCallback((walletAddress: string, pin: string): boolean => {
    return SecureMailboxManager.isMailboxUnlocked(walletAddress, pin);
  }, []);
  
  /**
   * Get all active mailboxes
   */
  const getActiveMailboxes = useCallback((): string[] => {
    return SecureMailboxManager.getActiveMailboxes();
  }, []);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Don't lock on unmount - let the browser events handle it
      // This prevents losing session when component remounts
    };
  }, []);
  
  return {
    // State
    isUnlocking,
    error,
    keyPair,
    sessionKey,
    isSessionPersistenceEnabled,
    
    // Actions
    unlockMailbox,
    switchMailbox,
    lockMailbox,
    lockAllMailboxes,
    enableSessionPersistence,
    disableSessionPersistence,
    clearError,
    
    // Queries
    isMailboxUnlocked,
    getActiveMailboxes
  };
};
