/**
 * Global app reset utility
 * 
 * resetApp() - FULL nuclear reset, clears EVERYTHING including mailbox data
 * Only called when user explicitly chooses "Delete all session data" or clicks reset button
 */

import { SimpleKeyManager } from './crypto-simple';
import { useSettingsStore } from '../store/settingsStore';
import { useConnectionStore } from '../store/connectionStore';

/**
 * FULL app reset - clears ALL data including mailbox metadata
 * Use this only when user explicitly wants to delete everything
 */
export const resetApp = () => {
  console.log('🔄 FULL app reset - clearing ALL data...');
  
  // Clear session keys from memory
  SimpleKeyManager.clearKeys();
  
  // Clear ALL sessionStorage
  sessionStorage.clear();
  
  // Clear ALL hashd-related localStorage keys (including mailbox data)
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (key.startsWith('hashd_') || 
        key.startsWith('megamail_') || // Legacy keys
        key.startsWith('airdrop_') ||
        key.includes('_cid_mapping') ||
        key === 'threadCIDCache') {
      localStorage.removeItem(key);
    }
  });
  console.log('✅ Cleared ALL localStorage data');
  
  // Clear connection store (Zustand)
  useConnectionStore.getState().setDisconnected();
  
  // Reset settings to defaults
  useSettingsStore.persist.clearStorage();
  useSettingsStore.getState().resetToDefaults();
  
  console.log('✅ FULL app reset complete');
};

/**
 * Reset and reload the page
 */
export const resetAndReload = () => {
  resetApp();
  window.location.reload();
};
