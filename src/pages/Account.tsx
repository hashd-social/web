import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { MailboxInfo, SimpleKeyManager, SimpleCryptoUtils } from '../utils/crypto-simple';
import { contractService } from '../utils/contracts';
import {
  CurrentMailbox,
  LinkedMailboxes,
  HashdTagNFTs,
  HowMailboxesWork
} from '../components/account';

interface AccountProps {
  currentMailbox: MailboxInfo | null;
  mailboxes: MailboxInfo[];
  isKeyRegistered: boolean;
  loading: boolean;
  keyPair: any;
  userAddress: string;
  onSetupMailbox: () => void;
  onCompleteSetup: () => void;
  onSwitchOrCreate: () => void;
  onSwitchMailbox: (pin: string) => void;
  onRefreshMailboxes: () => void;
}

export const Account: React.FC<AccountProps> = ({
  currentMailbox,
  mailboxes,
  isKeyRegistered,
  loading,
  keyPair,
  userAddress,
  onSetupMailbox,
  onCompleteSetup,
  onSwitchOrCreate,
  onSwitchMailbox,
  onRefreshMailboxes,
}) => {
  const [blockchainAccounts, setBlockchainAccounts] = useState<{name: string, type: 'named' | 'bare', publicKey?: string, hasHashdTagAttached?: boolean}[]>([]);

  // Fetch named and bare accounts from blockchain
  const fetchAccounts = async () => {
      if (!userAddress) return;
      
      const accounts: {name: string, type: 'named' | 'bare', publicKey?: string, hasHashdTagAttached?: boolean}[] = [];
      
      try {
        // First, fetch all accounts from AccountRegistry (source of truth for active accounts)
        const accountCount = await contractService.getAccountCount(userAddress);
        console.log('📊 Total account count from contract:', accountCount);
        
        for (let i = 0; i < accountCount; i++) {
          const account = await contractService.getAccount(userAddress, i);
          console.log(`  [${i}] ${account.isActive ? '✅ ACTIVE' : '❌ INACTIVE'} hasHashdTag: ${account.hasHashdTagAttached} - publicKey:`, account.publicKey);
          
          if (account.isActive) {
            if (account.hasHashdTagAttached && account.hashdTagName) {
              // Named account with attached HashdTag
              accounts.push({ 
                name: account.hashdTagName, 
                type: 'named',
                publicKey: account.publicKey,
                hasHashdTagAttached: true
              });
              console.log(`✅ Added named account: ${account.hashdTagName}`);
            } else {
              // Bare account (no HashdTag attached)
              const publicKeyBytes = SimpleCryptoUtils.publicKeyFromHex(account.publicKey);
              const publicKeyHash = SimpleCryptoUtils.bytesToHex(publicKeyBytes.slice(0, 16));
              const localMailbox = mailboxes.find(m => m.publicKeyHash === publicKeyHash);
              
              // If localStorage has a HashdTag-style name (contains @) but blockchain says it's bare,
              // the HashdTag was detached - update localStorage to show "Bare Account"
              let displayName = localMailbox?.name || 'Bare Account';
              if (localMailbox?.name && localMailbox.name.includes('@')) {
                console.log(`🔄 Clearing stale HashdTag name "${localMailbox.name}" from localStorage`);
                displayName = 'Bare Account';
                // Update localStorage to clear the stale name
                SimpleKeyManager.renameMailbox(userAddress, publicKeyHash, 'Bare Account');
              }
              
              accounts.push({ 
                name: displayName, 
                type: 'bare',
                publicKey: account.publicKey,
                hasHashdTagAttached: false
              });
              console.log(`📝 Added bare account: ${displayName}`);
            }
          }
        }
        
      } catch (error) {
        console.error('Error fetching blockchain accounts:', error);
      }
      
      // Always set accounts, even if some fetches failed
      console.log('📦 Total accounts to display:', accounts.length, accounts);
      setBlockchainAccounts(accounts);
    };

  // Sync mailbox metadata (names, timestamps) with blockchain accounts
  // Note: This is UI metadata only, NOT encryption keys. Keys follow the persistence model.
  // IMPORTANT: This function only REMOVES orphaned mailboxes, never deletes all of them
  const syncMailboxes = async () => {
    if (!userAddress) return;
    
    console.log('🔄 Syncing localStorage mailboxes with blockchain...');
    const localMailboxes = SimpleKeyManager.getMailboxList(userAddress);
    console.log('📦 Local mailboxes:', localMailboxes.length);
    
    // Safety check: Don't sync if no local mailboxes (nothing to sync)
    if (localMailboxes.length === 0) {
      console.log('⏭️ No local mailboxes to sync');
      return;
    }
    
    // Get all on-chain accounts using unified model
    let hashdTags: string[] = [];
    let accountCount = 0;
    
    try {
      hashdTags = await contractService.getOwnerHashdTags(userAddress);
      accountCount = await contractService.getAccountCount(userAddress);
    } catch (error) {
      console.warn('⚠️ Could not fetch blockchain accounts, skipping sync:', error);
      return; // Don't sync if we can't read blockchain
    }
    
    // Build set of valid public key hashes from blockchain
    const validHashes = new Set<string>();
    
    // Add HashdTag accounts
    for (const name of hashdTags) {
      try {
        const publicKey = await contractService.getPublicKeyByName(name);
        const publicKeyBytes = SimpleCryptoUtils.publicKeyFromHex(publicKey);
        const publicKeyHash = SimpleCryptoUtils.bytesToHex(publicKeyBytes.slice(0, 16));
        validHashes.add(publicKeyHash);
      } catch (error) {
        console.warn(`Could not get public key for ${name}`);
      }
    }
    
    // Add all accounts (including those without HashdTags)
    for (let i = 0; i < accountCount; i++) {
      try {
        const account = await contractService.getAccount(userAddress, i);
        if (account.isActive) {
          const publicKeyBytes = SimpleCryptoUtils.publicKeyFromHex(account.publicKey);
          const publicKeyHash = SimpleCryptoUtils.bytesToHex(publicKeyBytes.slice(0, 16));
          validHashes.add(publicKeyHash);
        }
      } catch (error) {
        console.warn(`Could not get account at index ${i}:`, error);
      }
    }
    
    console.log('✅ Valid hashes from blockchain:', validHashes.size);
    
    // Safety check: Don't delete mailboxes if blockchain returned no accounts
    // This prevents accidental deletion due to RPC issues or timing problems
    if (validHashes.size === 0) {
      console.warn('⚠️ Blockchain returned 0 valid accounts - skipping sync to prevent data loss');
      return;
    }
    
    // Filter local mailboxes to only keep those that exist on-chain
    const syncedMailboxes = localMailboxes.filter(m => validHashes.has(m.publicKeyHash));
    
    // Safety check: Never delete ALL mailboxes - something is wrong if that happens
    if (syncedMailboxes.length === 0 && localMailboxes.length > 0) {
      console.warn('⚠️ Sync would delete all mailboxes - aborting to prevent data loss');
      return;
    }
    
    if (syncedMailboxes.length !== localMailboxes.length) {
      console.log(`🧹 Removing ${localMailboxes.length - syncedMailboxes.length} orphaned mailboxes from localStorage`);
      SimpleKeyManager.saveMailboxList(syncedMailboxes, userAddress, true);
      onRefreshMailboxes();
    } else {
      console.log('✅ All local mailboxes are synced with blockchain');
    }
  };

  // Fetch accounts on mount and when userAddress or keyPair changes (keyPair indicates full connection)
  useEffect(() => {
    if (userAddress && keyPair) {
      // Retry mechanism to wait for contracts to initialize
      let retryCount = 0;
      const maxRetries = 5;
      
      const attemptFetch = async () => {
        try {
          const accountCount = await contractService.getAccountCount(userAddress);
          console.log(`✅ Contracts ready, account count: ${accountCount}`);
          await fetchAccounts();
          await syncMailboxes(); // Sync after fetching
        } catch (error: any) {
          if (error.message.includes('not initialized') && retryCount < maxRetries) {
            retryCount++;
            console.log(`⏳ Contracts not ready yet, retry ${retryCount}/${maxRetries} in 1s...`);
            setTimeout(attemptFetch, 1000);
          } else {
            console.error('Failed to fetch accounts after retries:', error);
            // Fetch anyway to at least show named accounts
            fetchAccounts();
          }
        }
      };
      
      // Initial delay then start attempting
      const timer = setTimeout(attemptFetch, 500);
      return () => clearTimeout(timer);
    }
  }, [userAddress, keyPair]);

  const handleRename = (publicKeyHash: string, newName: string) => {
    if (!newName.trim()) return;
    
    console.log('🏷️ Renaming mailbox with hash:', publicKeyHash, 'to:', newName.trim());
    
    // Update mailbox name in localStorage
    if (!userAddress) return;
    
    SimpleKeyManager.renameMailbox(userAddress, publicKeyHash, newName.trim());
    console.log('✅ Mailbox renamed');
    
    onRefreshMailboxes();
    
    // Refetch accounts to show updated name
    fetchAccounts();
  };

  return (
    <div className="min-h-screen hex-grid bg-gray-900">
      <PageHeader
        icon={User}
        title="ACCOUNT"
        subtitle="MANAGE.YOUR.MAILBOXES"
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Mailbox Management */}
          <div className="space-y-6">
            <CurrentMailbox
              currentMailbox={currentMailbox}
              isKeyRegistered={isKeyRegistered}
              loading={loading}
              keyPair={keyPair}
              blockchainAccounts={blockchainAccounts}
              onSetupMailbox={onSetupMailbox}
              onCompleteSetup={onCompleteSetup}
              onSwitchOrCreate={onSwitchOrCreate}
              onRename={handleRename}
            />

            <LinkedMailboxes
              blockchainAccounts={blockchainAccounts}
              currentMailbox={currentMailbox}
              mailboxes={mailboxes}
              onSwitchOrCreate={onSwitchOrCreate}
              onRename={handleRename}
            />

            <HashdTagNFTs userAddress={userAddress} onAccountsChanged={fetchAccounts} />
          </div>

          {/* Right Column - How It Works */}
          <HowMailboxesWork />
        </div>
      </div>
    </div>
  );
};
