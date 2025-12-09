import React, { useState, useEffect } from 'react';
import { User, Shield, Key, Wallet, Inbox, Info, Hash, Edit2, Check, X, Image as ImageIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { MailboxInfo, SimpleKeyManager, SimpleCryptoUtils } from '../utils/crypto-simple';
import { contractService } from '../utils/contracts';
import { HashdTagNFTCard } from '../components/HashdTagNFTCard';

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
  const [editingHash, setEditingHash] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [blockchainAccounts, setBlockchainAccounts] = useState<{name: string, type: 'named' | 'bare', publicKey?: string}[]>([]);
  const [hashdTagNFTs, setHashdTagNFTs] = useState<Array<{
    tokenId: string;
    fullName: string;
    domain: string;
    tokenURI: string;
  }>>([]);
  const [nftsLoading, setNftsLoading] = useState(false);

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

  // Sync localStorage mailboxes with blockchain accounts
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

  // Fetch HashdTag NFTs
  const fetchNFTs = async () => {
    if (!userAddress) return;
    try {
      setNftsLoading(true);
      const nfts = await contractService.getHashdTagNFTs(userAddress);
      console.log('🎨 HashdTag NFTs for wallet:', nfts);
      setHashdTagNFTs(nfts);
    } catch (error) {
      console.error('Error fetching HashdTag NFTs:', error);
    } finally {
      setNftsLoading(false);
    }
  };

  useEffect(() => {
    fetchNFTs();
  }, [userAddress]);

  const handleRename = (publicKeyHash: string) => {
    if (!editName.trim()) return;
    
    console.log('🏷️ Renaming mailbox with hash:', publicKeyHash, 'to:', editName.trim());
    
    // Update mailbox name in localStorage
    const allMailboxes = SimpleKeyManager.getMailboxList(userAddress);
    const updated = allMailboxes.map(m => 
      m.publicKeyHash === publicKeyHash 
        ? { ...m, name: editName.trim() }
        : m
    );
    
    const mailboxesKey = userAddress ? `hashd_mailboxes_${userAddress.toLowerCase()}` : 'hashd_mailboxes';
    localStorage.setItem(mailboxesKey, JSON.stringify(updated));
    
    console.log('✅ Mailbox renamed in localStorage');
    
    setEditingHash(null);
    setEditName('');
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
            {/* Current Mailbox Status */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
                Current Mailbox
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Your active mailbox for sending and receiving encrypted messages.
              </p>
              {currentMailbox ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-400 font-mono">ACTIVE MAILBOX:</span>
                    <div className="flex items-center gap-2">
                      {editingHash === 'current' ? (
                        <>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Enter custom name"
                            className="px-2 py-1 bg-gray-900 border border-cyan-500/50 rounded text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRename(currentMailbox.publicKeyHash);
                              } else if (e.key === 'Escape') {
                                setEditingHash(null);
                                setEditName('');
                              }
                            }}
                          />
                          <button
                            onClick={() => handleRename(currentMailbox.publicKeyHash)}
                            className="p-1 text-green-400 hover:text-green-300 transition-colors"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingHash(null);
                              setEditName('');
                            }}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-bold text-white font-mono">
                            {currentMailbox.name}
                          </span>
                          <button
                            onClick={() => {
                              setEditingHash('current');
                              setEditName(currentMailbox.name);
                            }}
                            className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                            title="Rename mailbox"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {currentMailbox.publicKey && (
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-gray-400 font-mono">PUBLIC KEY:</span>
                      <div className="text-xs text-gray-500 font-mono break-all max-w-md text-right">
                        {currentMailbox.publicKey}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400 font-mono">CREATED:</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {new Date(currentMailbox.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400 font-mono">STATUS:</span>
                    <span className={`text-sm font-bold font-mono ${isKeyRegistered ? 'neon-text-green' : 'text-red-400'}`}>
                      {isKeyRegistered ? '✓ READY' : '⚠️ SETUP REQUIRED'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 font-mono">NO.ACTIVE.MAILBOX</p>
              )}
       <div className="space-y-4 pt-8">
                {!keyPair && (
                  <button
                    onClick={onSetupMailbox}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-cyan-500/10 hover:border-cyan-500/50 neon-text-cyan rounded-lg disabled:opacity-50 transition-all font-bold font-mono flex items-center justify-center gap-2"
                  >
                    <Inbox className="w-5 h-5" />
                    {loading ? 'SETTING UP...' : 'SETUP FIRST MAILBOX'}
                  </button>
                )}
                
                {keyPair && !isKeyRegistered && (
                  <button
                    onClick={onCompleteSetup}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-cyan-500/10 hover:border-cyan-500/50 neon-text-cyan rounded-lg disabled:opacity-50 transition-all font-bold font-mono flex items-center justify-center gap-2"
                  >
                    <Shield className="w-5 h-5" />
                    {loading ? 'COMPLETING SETUP...' : 'COMPLETE MAILBOX SETUP'}
                  </button>
                )}

                {keyPair && (
                  <button
                    onClick={onSwitchOrCreate}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-cyan-500/10 hover:border-cyan-500/50 neon-text-cyan rounded-lg disabled:opacity-50 transition-all font-bold font-mono flex items-center justify-center gap-2"
                  >
                    <Inbox className="w-5 h-5" />
                    SWITCH / CREATE MAILBOX
                  </button>
                )}
              </div>              
            </div>

            {/* Stored Mailboxes - from blockchain */}
            {blockchainAccounts.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
                  Linked Mailboxes ({blockchainAccounts.length})
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  All accounts registered on the blockchain for this wallet.
                </p>
                <div className="space-y-3">
                  {blockchainAccounts.map((account) => {
                    // Compare by public key instead of name to handle renamed bare accounts
                    const isCurrent = currentMailbox?.publicKey && account.publicKey && 
                      currentMailbox.publicKey.toLowerCase() === account.publicKey.toLowerCase();
                    return (
                      <div
                        key={account.publicKey || account.name}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          isCurrent
                            ? 'bg-cyan-900/20 border-cyan-500/50'
                            : 'bg-gray-900/50 border-gray-700/30'
                        }`}
                      >
                        <div className="flex-1">
                          {editingHash === account.publicKey && account.type === 'bare' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Enter custom name"
                                className="flex-1 px-3 py-1.5 bg-gray-900 border border-cyan-500/50 rounded text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    // Derive publicKeyHash from publicKey
                                    if (account.publicKey) {
                                      const publicKeyBytes = SimpleCryptoUtils.publicKeyFromHex(account.publicKey);
                                      const publicKeyHash = SimpleCryptoUtils.bytesToHex(publicKeyBytes.slice(0, 16));
                                      handleRename(publicKeyHash);
                                    }
                                  } else if (e.key === 'Escape') {
                                    setEditingHash(null);
                                    setEditName('');
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  // Derive publicKeyHash from publicKey
                                  if (account.publicKey) {
                                    const publicKeyBytes = SimpleCryptoUtils.publicKeyFromHex(account.publicKey);
                                    const publicKeyHash = SimpleCryptoUtils.bytesToHex(publicKeyBytes.slice(0, 16));
                                    handleRename(publicKeyHash);
                                  }
                                }}
                                className="p-1.5 text-green-400 hover:text-green-300 transition-colors"
                                title="Save"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingHash(null);
                                  setEditName('');
                                }}
                                className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white font-mono">
                                {(() => {
                                  // For bare accounts, check if there's a custom name in localStorage
                                  if (account.type === 'bare' && account.publicKey) {
                                    const publicKeyBytes = SimpleCryptoUtils.publicKeyFromHex(account.publicKey);
                                    const publicKeyHash = SimpleCryptoUtils.bytesToHex(publicKeyBytes.slice(0, 16));
                                    const localMailbox = mailboxes.find(m => m.publicKeyHash === publicKeyHash);
                                    return localMailbox?.name || account.name;
                                  }
                                  return account.name;
                                })()}
                              </h4>
                              {account.type === 'bare' && (
                                <>
                                  <span className="text-xs bg-gray-600 text-gray-200 px-2 py-0.5 rounded font-mono">
                                    BARE
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingHash(account.publicKey || null);
                                      setEditName(account.name);
                                    }}
                                    className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                                    title="Rename mailbox"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              {account.type === 'named' && !account.publicKey && (
                                <span className="text-xs bg-orange-600 text-orange-200 px-2 py-0.5 rounded font-mono">
                                  DETACHED
                                </span>
                              )}
                              {isCurrent && (
                                <span className="text-xs bg-cyan-500 text-white px-2 py-0.5 rounded font-mono font-bold">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                          )}
                          {account.publicKey && (
                            <div className="text-xs text-gray-500 mt-1 font-mono flex items-start gap-1">
                              <Hash className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              <span className="break-all">{account.publicKey}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!isCurrent && (
                            <button
                              onClick={onSwitchOrCreate}
                              className="text-xs neon-text-cyan hover:text-cyan-300 font-bold px-3 py-1.5 rounded bg-cyan-500/10 hover:border-cyan-500/50 transition-all font-mono"
                            >
                              SWITCH
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* HashdTag NFTs */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                HashdTag NFTs ({hashdTagNFTs.length})
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Your HashdTag identity NFTs with on-chain metadata and SVG artwork.
              </p>
              
              {nftsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 animate-pulse">
                      <div className="aspect-square bg-gray-700/50 rounded-lg mb-3"></div>
                      <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : hashdTagNFTs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {hashdTagNFTs.map((nft) => (
                    <HashdTagNFTCard
                      key={nft.tokenId}
                      tokenId={nft.tokenId}
                      fullName={nft.fullName}
                      domain={nft.domain}
                      tokenURI={nft.tokenURI}
                      userAddress={userAddress}
                      onRefresh={fetchNFTs}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-mono">
                    No HashdTag NFTs found.
                  </p>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    Register a named account to mint your first HashdTag NFT!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - How It Works */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
              How Mailboxes Work
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Understanding the security and portability of your mailboxes.
            </p>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-start gap-3 mb-2">
                  <div className="p-2 bg-cyan-500/10 rounded-lg mt-1">
                    <Shield className="w-5 h-5 neon-text-cyan" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1 font-mono">Zero-Knowledge Security</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Your PIN and encryption keys are <strong className="text-cyan-400">never stored</strong> anywhere—not in localStorage, sessionStorage, or any database. Keys exist only in memory during your session.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-start gap-3 mb-2">
                  <div className="p-2 bg-cyan-500/10 rounded-lg mt-1">
                    <Key className="w-5 h-5 neon-text-cyan" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1 font-mono">Deterministic Key Derivation</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Your mailbox key is derived from your wallet signature + PIN using secure KDF. The same wallet + PIN always generates the same keys, making your mailbox portable and recoverable.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-start gap-3 mb-2">
                  <div className="p-2 bg-cyan-500/10 rounded-lg mt-1">
                    <Hash className="w-5 h-5 neon-text-cyan" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1 font-mono">Session-Based Access</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      After unlocking with your PIN, a temporary session key is created in memory. Your mailbox key is immediately wiped. Sessions end on refresh/close unless you enable persistence in Settings.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-start gap-3 mb-2">
                  <div className="p-2 bg-cyan-500/10 rounded-lg mt-1">
                    <Wallet className="w-5 h-5 neon-text-cyan" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1 font-mono">HashdTag Identity</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Your HashdTag (like @username) is your human-readable identity on-chain. It's linked to your public key and provides a consistent identity across all Hashd services.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-start gap-3 mb-2">
                  <div className="p-2 bg-cyan-500/10 rounded-lg mt-1">
                    <Inbox className="w-5 h-5 neon-text-cyan" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1 font-mono">Blockchain Storage</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      All encrypted messages are stored on-chain. No central server can access, censor, or delete your data. Your encryption keys ensure only you can read your messages.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
                <p className="text-xs text-cyan-300 leading-relaxed">
                  <strong className="text-cyan-400">Security Note:</strong> Enable "Session Persistence" in Settings to keep your session active until browser close. Your session key is encrypted using a non-exportable browser key—even with persistence, your PIN and mailbox keys are never stored.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
