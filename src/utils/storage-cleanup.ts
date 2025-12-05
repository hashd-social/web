/**
 * Storage Cleanup Utility
 * 
 * Removes all insecure storage of PINs and keys from localStorage and sessionStorage.
 * This should be run once on app initialization to clean up any old insecure data.
 */

export class StorageCleanup {
  private static readonly CLEANUP_FLAG = 'hashd_cleanup_completed';
  
  /**
   * Check if cleanup has already been performed
   */
  static hasCleanupRun(): boolean {
    return sessionStorage.getItem(this.CLEANUP_FLAG) === 'true';
  }
  
  /**
   * Mark cleanup as completed
   */
  private static markCleanupComplete(): void {
    sessionStorage.setItem(this.CLEANUP_FLAG, 'true');
  }
  
  /**
   * Remove all insecure PIN and key storage
   * This clears any data that violates the security model
   */
  static cleanupInsecureStorage(): void {
    // Only run once per browser session
    if (this.hasCleanupRun()) {
      console.log('✅ Storage cleanup already completed this session');
      return;
    }
    
    console.log('🧹 Starting storage cleanup...');
    
    let removedCount = 0;
    
    // Clean localStorage
    const localStorageKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        localStorageKeys.push(key);
      }
    }
    
    localStorageKeys.forEach(key => {
      // Remove any key storage (hashd_keys_*)
      if (key.includes('hashd_keys_')) {
        localStorage.removeItem(key);
        removedCount++;
        console.log(`🗑️  Removed insecure key storage: ${key}`);
      }
      
      // Remove current mailbox PIN storage
      if (key.includes('hashd_current_mailbox')) {
        localStorage.removeItem(key);
        removedCount++;
        console.log(`🗑️  Removed PIN storage: ${key}`);
      }
    });
    
    // Clean sessionStorage
    const sessionStorageKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        sessionStorageKeys.push(key);
      }
    }
    
    sessionStorageKeys.forEach(key => {
      // Remove any unencrypted key storage
      // Keep only hashd_encrypted_sessions (which is properly encrypted)
      if (key.startsWith('0x') || key.includes('_0x')) {
        // This looks like a wallet address key - likely contains unencrypted keys
        try {
          const data = sessionStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            // If it has publicKey/privateKey fields, it's unencrypted keys
            if (parsed.publicKey && parsed.privateKey) {
              sessionStorage.removeItem(key);
              removedCount++;
              console.log(`🗑️  Removed unencrypted keys from sessionStorage: ${key}`);
            }
          }
        } catch {
          // Not JSON, skip
        }
      }
    });
    
    if (removedCount > 0) {
      console.log(`✅ Storage cleanup complete: ${removedCount} insecure items removed`);
    } else {
      console.log('✅ Storage cleanup complete: No insecure data found');
    }
    
    // Mark cleanup as complete so it doesn't run again this session
    this.markCleanupComplete();
  }
  
  /**
   * Clean up mailbox metadata that contains PINs
   * Updates mailbox list to remove PIN field
   */
  static cleanupMailboxMetadata(): void {
    console.log('🧹 Cleaning mailbox metadata...');
    
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('hashd_mailboxes')) {
        keys.push(key);
      }
    }
    
    keys.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const mailboxes = JSON.parse(data);
          
          // Check if any mailbox has a PIN stored
          let needsUpdate = false;
          const cleaned = mailboxes.map((mailbox: any) => {
            if (mailbox.pin && mailbox.pin !== '') {
              needsUpdate = true;
              return { ...mailbox, pin: '' };
            }
            return mailbox;
          });
          
          if (needsUpdate) {
            localStorage.setItem(key, JSON.stringify(cleaned));
            console.log(`✅ Cleaned PINs from mailbox metadata: ${key}`);
          }
        }
      } catch (error) {
        console.warn(`⚠️  Failed to clean mailbox metadata: ${key}`, error);
      }
    });
  }
  
  /**
   * Remove duplicate mailboxes (same publicKeyHash)
   */
  static cleanupDuplicateMailboxes(): void {
    console.log('🔍 Checking for duplicate mailboxes...');
    
    // Get all wallet addresses from localStorage
    const walletAddresses = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('hashd_mailboxes_')) {
        const address = key.replace('hashd_mailboxes_', '');
        walletAddresses.add(address);
      }
    }
    
    // Also check non-namespaced key
    if (localStorage.getItem('hashd_mailboxes')) {
      walletAddresses.add('');
    }
    
    walletAddresses.forEach(address => {
      const key = address ? `hashd_mailboxes_${address}` : 'hashd_mailboxes';
      const stored = localStorage.getItem(key);
      if (!stored) return;
      
      try {
        const mailboxes = JSON.parse(stored);
        const seen = new Map<string, any>();
        const unique: any[] = [];
        
        mailboxes.forEach((mailbox: any) => {
          const hash = mailbox.publicKeyHash;
          if (!seen.has(hash)) {
            // Keep the first occurrence, but remove PIN field if it exists
            const cleaned = { ...mailbox };
            delete cleaned.pin;
            seen.set(hash, cleaned);
            unique.push(cleaned);
          } else {
            console.log(`🗑️ Removing duplicate mailbox: ${mailbox.name} (hash: ${hash})`);
          }
        });
        
        if (unique.length !== mailboxes.length) {
          localStorage.setItem(key, JSON.stringify(unique));
          console.log(`✅ Cleaned up ${mailboxes.length - unique.length} duplicate mailboxes for ${address || 'default'}`);
        }
      } catch (error) {
        console.warn(`Failed to cleanup mailboxes for ${address}:`, error);
      }
    });
  }
  
  /**
   * Perform full cleanup of insecure storage
   */
  static performFullCleanup(): void {
    // Check if cleanup has already been performed this session
    if (sessionStorage.getItem(this.CLEANUP_FLAG)) {
      console.log('✅ Cleanup already completed this session - skipping');
      return;
    }

    console.log('🧹 Starting storage cleanup...');
    this.cleanupInsecureStorage();
    this.cleanupMailboxMetadata();
    this.cleanupDuplicateMailboxes();
    
    // Mark cleanup as complete for this session
    sessionStorage.setItem(this.CLEANUP_FLAG, 'true');
    console.log('✅ Storage cleanup complete');
  }
  
  /**
   * Get a report of what's currently stored
   * Useful for debugging and security audits
   */
  static getStorageReport(): {
    localStorage: { key: string; size: number; sensitive: boolean }[];
    sessionStorage: { key: string; size: number; sensitive: boolean }[];
  } {
    const report = {
      localStorage: [] as { key: string; size: number; sensitive: boolean }[],
      sessionStorage: [] as { key: string; size: number; sensitive: boolean }[]
    };
    
    // Check localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        const isSensitive = 
          key.includes('hashd_keys_') || 
          key.includes('hashd_current_mailbox') ||
          value.includes('privateKey') ||
          value.includes('"pin":');
        
        report.localStorage.push({
          key,
          size: value.length,
          sensitive: isSensitive
        });
      }
    }
    
    // Check sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key) || '';
        const isSensitive = 
          value.includes('privateKey') ||
          value.includes('"pin":') ||
          (key.startsWith('0x') && value.includes('publicKey'));
        
        report.sessionStorage.push({
          key,
          size: value.length,
          sensitive: isSensitive
        });
      }
    }
    
    return report;
  }
  
  /**
   * Log storage report to console
   */
  static logStorageReport(): void {
    const report = this.getStorageReport();
    
    console.log('📊 Storage Security Report');
    console.log('==========================');
    
    console.log('\n📦 localStorage:');
    report.localStorage.forEach(item => {
      const flag = item.sensitive ? '🔴 SENSITIVE' : '✅ Safe';
      console.log(`  ${flag} ${item.key} (${item.size} bytes)`);
    });
    
    console.log('\n📦 sessionStorage:');
    report.sessionStorage.forEach(item => {
      const flag = item.sensitive ? '🔴 SENSITIVE' : '✅ Safe';
      console.log(`  ${flag} ${item.key} (${item.size} bytes)`);
    });
    
    const sensitiveCount = 
      report.localStorage.filter(i => i.sensitive).length +
      report.sessionStorage.filter(i => i.sensitive).length;
    
    if (sensitiveCount > 0) {
      console.log(`\n⚠️  WARNING: ${sensitiveCount} sensitive items found in storage!`);
      console.log('Run StorageCleanup.performFullCleanup() to remove them.');
    } else {
      console.log('\n✅ No sensitive data found in storage');
    }
  }
}

// Expose globally for debugging
if (typeof window !== 'undefined') {
  (window as any).StorageCleanup = StorageCleanup;
  (window as any).checkStorage = () => StorageCleanup.logStorageReport();
}
