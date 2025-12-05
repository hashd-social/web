import React, { useState, useEffect } from 'react';
import { User, Shield, Key, Wallet, Inbox, Info, Hash, Edit2, Check, X } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { MailboxInfo, SimpleKeyManager } from '../utils/crypto-simple';
import { contractService } from '../utils/contracts';

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

  // Fetch named and bare accounts from blockchain on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!userAddress) return;
      try {
        const accounts: {name: string, type: 'named' | 'bare', publicKey?: string}[] = [];
        
        // Fetch named accounts
        const named = await contractService.getOwnerNamedAccounts(userAddress);
        console.log('📋 Named accounts for wallet:', named);
        named.forEach(name => accounts.push({ name, type: 'named' }));
        
        // Fetch all bare accounts
        try {
          const bareAccounts = await contractService.getBareAccounts(userAddress);
          console.log('📋 Bare accounts for wallet:', bareAccounts);
          
          bareAccounts.publicKeys.forEach((publicKey, index) => {
            if (bareAccounts.isActives[index]) {
              accounts.push({ 
                name: `Bare Account ${index + 1}`, 
                type: 'bare',
                publicKey: publicKey.slice(0, 20) + '...'
              });
            }
          });
        } catch (error) {
          console.warn('Could not fetch bare accounts:', error);
        }
        
        setBlockchainAccounts(accounts);
      } catch (error) {
        console.error('Error fetching blockchain accounts:', error);
      }
    };
    fetchAccounts();
  }, [userAddress]);

  const handleRename = (mailbox: MailboxInfo) => {
    if (!editName.trim()) return;
    
    // Update mailbox name in localStorage
    const allMailboxes = SimpleKeyManager.getMailboxList(userAddress);
    const updated = allMailboxes.map(m => 
      m.publicKeyHash === mailbox.publicKeyHash 
        ? { ...m, name: editName.trim() }
        : m
    );
    localStorage.setItem(
      userAddress ? `hashd_mailboxes_${userAddress.toLowerCase()}` : 'hashd_mailboxes',
      JSON.stringify(updated)
    );
    
    setEditingHash(null);
    setEditName('');
    onRefreshMailboxes();
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
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400 font-mono">ACTIVE MAILBOX:</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {currentMailbox.name}
                    </span>
                  </div>
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
            </div>

            {/* Mailbox Actions */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
                Mailbox Actions
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Create, switch, or manage your mailboxes.
              </p>
              <div className="space-y-4">
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
                  Registered Accounts ({blockchainAccounts.length})
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  All accounts registered on the blockchain for this wallet.
                </p>
                <div className="space-y-3">
                  {blockchainAccounts.map((account) => {
                    const isCurrent = currentMailbox?.name === account.name;
                    return (
                      <div
                        key={account.name}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          isCurrent
                            ? 'bg-cyan-900/20 border-cyan-500/50'
                            : 'bg-gray-900/50 border-gray-700/30'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white font-mono">
                              {account.name}
                            </h4>
                            {account.type === 'bare' && (
                              <span className="text-xs bg-gray-600 text-gray-200 px-2 py-0.5 rounded font-mono">
                                BARE
                              </span>
                            )}
                            {isCurrent && (
                              <span className="text-xs bg-cyan-500 text-white px-2 py-0.5 rounded font-mono font-bold">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          {account.publicKey && (
                            <div className="text-xs text-gray-500 mt-1 font-mono flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              <span>{account.publicKey}</span>
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
