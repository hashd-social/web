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
      
      const accounts: {name: string, type: 'named' | 'bare', publicKey?: string}[] = [];
      
      try {
        
        // Fetch HashdTags with their public keys (show all, attached or detached)
        const hashdTags = await contractService.getOwnerHashdTags(userAddress);
        console.log('📋 HashdTags for wallet:', hashdTags);
        
        for (const name of hashdTags) {
          try {
            // Check if the HashdTag is attached
            const isAttached = await contractService.isHashdTagAttached(name);
            console.log(`📎 ${name} attached:`, isAttached);
            
            if (isAttached) {
              // Get public key for attached named account
              const publicKey = await contractService.getPublicKeyByName(name);
              accounts.push({ 
                name, 
                type: 'named',
                publicKey: publicKey // Full public key, no truncation
              });
              console.log(`✅ Added attached named account: ${name} with public key`);
            } else {
              // Show detached named account without public key
              accounts.push({ 
                name, 
                type: 'named',
                publicKey: undefined // No public key when detached
              });
              console.log(`⚠️ Added detached named account: ${name} (no public key)`);
            }
          } catch (error) {
            console.warn(`Could not fetch info for ${name}:`, error);
            // Still add the account even if we can't get details
            accounts.push({ name, type: 'named' });
          }
        }
        
        // Fetch all accounts (including those without HashdTags)
        try {
          const accountCount = await contractService.getAccountCount(userAddress);
          console.log('📊 Total account count from contract:', accountCount);
          
          for (let i = 0; i < accountCount; i++) {
            const account = await contractService.getAccount(userAddress, i);
            console.log(`  [${i}] ${account.isActive ? '✅ ACTIVE' : '❌ INACTIVE'} - publicKey:`, account.publicKey);
            
            if (account.isActive && !account.hasHashdTagAttached) {
              // Account without HashdTag - match with localStorage mailbox to get custom name
              const publicKeyBytes = SimpleCryptoUtils.publicKeyFromHex(account.publicKey);
              const publicKeyHash = SimpleCryptoUtils.bytesToHex(publicKeyBytes.slice(0, 16));
              const localMailbox = mailboxes.find(m => m.publicKeyHash === publicKeyHash);
              
              const displayName = localMailbox?.name || `Account ${i + 1}`;
              
              accounts.push({ 
                name: displayName, 
                type: 'bare' as const,
                publicKey: account.publicKey
              });
              console.log(`  📝 Using name from localStorage: ${displayName}`);
            }
          }
        } catch (error) {
          console.error('❌ Error fetching accounts:', error);
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
  const syncMailboxes = async () => {
    if (!userAddress) return;
    
    console.log('🔄 Syncing localStorage mailboxes with blockchain...');
    const localMailboxes = SimpleKeyManager.getMailboxList(userAddress);
    console.log('📦 Local mailboxes:', localMailboxes.length);
    
    // Get all on-chain accounts using unified model
    const hashdTags = await contractService.getOwnerHashdTags(userAddress);
    const accountCount = await contractService.getAccountCount(userAddress);
    
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
    
    // Filter local mailboxes to only keep those that exist on-chain
    const syncedMailboxes = localMailboxes.filter(m => validHashes.has(m.publicKeyHash));
    
    if (syncedMailboxes.length !== localMailboxes.length) {
      console.log(`🧹 Removing ${localMailboxes.length - syncedMailboxes.length} orphaned mailboxes from localStorage`);
      const mailboxesKey = `hashd_mailboxes_${userAddress.toLowerCase()}`;
      localStorage.setItem(mailboxesKey, JSON.stringify(syncedMailboxes));
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
    const allMailboxes = SimpleKeyManager.getMailboxList(userAddress);
    const updated = allMailboxes.map(m => 
      m.publicKeyHash === publicKeyHash 
        ? { ...m, name: newName.trim() }
        : m
    );
    
    const mailboxesKey = userAddress ? `hashd_mailboxes_${userAddress.toLowerCase()}` : 'hashd_mailboxes';
    localStorage.setItem(mailboxesKey, JSON.stringify(updated));
    
    console.log('✅ Mailbox renamed in localStorage');
    
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

            <HashdTagNFTs userAddress={userAddress} />
          </div>

          {/* Right Column - How It Works */}
          <HowMailboxesWork />
        </div>
      </div>
    </div>
  );
};
