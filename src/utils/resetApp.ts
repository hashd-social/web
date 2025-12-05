/**
 * Global app reset utility
 * Clears all session data, keys, and resets to factory defaults
 */

import { SimpleKeyManager } from './crypto-simple';
import { useSettingsStore } from '../store/settingsStore';
import { useConnectionStore } from '../store/connectionStore';

/**
 * Reset the entire app to factory defaults
 * Clears all keys, session data, and settings
 */
export const resetApp = () => {
  console.log('🔄 Resetting app to factory defaults...');
  
  // Clear all encryption keys (session memory + sessionStorage + localStorage)
  SimpleKeyManager.clearKeys();
  console.log('✅ Cleared encryption keys');
  
  // Clear ALL sessionStorage
  sessionStorage.clear();
  console.log('✅ Cleared sessionStorage');
  
  // Clear specific localStorage keys
  const keysToRemove = [
    'hashd_wallet_address',
    'hashd_security_mode',
    'hashd_mailboxes',
    'hashd_current_mailbox',
    'threadCIDCache', // IPFS thread CID cache
  ];
  
  // Clear session keys for all addresses (pattern: hashd_session_*)
  // Also clear legacy megamail_ keys
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (key.startsWith('hashd_session_') || 
        key.startsWith('hashd_keys_') ||
        key.startsWith('hashd_mailboxes_') ||
        key.startsWith('hashd_current_mailbox_') ||
        key === 'hashd_key_version' ||
        key.startsWith('megamail_') || // Legacy keys from old branding
        key.startsWith('airdrop_') ||
        key.includes('_cid_mapping') ||
        key === 'threadCIDCache') {
      localStorage.removeItem(key);
    }
  });
  
  // Remove specific keys
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log('✅ Cleared localStorage keys');
  
  // Clear connection store (Zustand)
  useConnectionStore.getState().setDisconnected();
  console.log('✅ Cleared connection store');
  
  // Clear settings store
  useSettingsStore.persist.clearStorage();
  
  // Reset settings to defaults
  useSettingsStore.getState().resetToDefaults();
  console.log('✅ Reset settings to defaults');
  
  console.log('✅ App reset complete');
};

/**
 * Reset and reload the page
 */
export const resetAndReload = () => {
  resetApp();
  window.location.reload();
};
