/**
 * Linked Mailboxes Component
 * 
 * Displays all blockchain accounts registered for the wallet
 */

import React, { useState } from 'react';
import { Check, X, Edit2, Copy } from 'lucide-react';
import { MailboxInfo, SimpleCryptoUtils } from '../../utils/crypto-simple';

interface BlockchainAccount {
  name: string;
  type: 'named' | 'bare';
  publicKey?: string;
  hasHashIDAttached?: boolean;
}

interface LinkedMailboxesProps {
  blockchainAccounts: BlockchainAccount[];
  currentMailbox: MailboxInfo | null;
  mailboxes: MailboxInfo[];
  onSwitchOrCreate: () => void;
  onRename: (publicKeyHash: string, newName: string) => void;
}

export const LinkedMailboxes: React.FC<LinkedMailboxesProps> = ({
  blockchainAccounts,
  currentMailbox,
  mailboxes,
  onSwitchOrCreate,
  onRename,
}) => {
  const [editingHash, setEditingHash] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const abbreviateKey = (key: string) => {
    if (key.length <= 20) return key;
    return `${key.slice(0, 10)}...${key.slice(-8)}`;
  };

  const copyToClipboard = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRename = (publicKeyHash: string) => {
    if (editName.trim()) {
      onRename(publicKeyHash, editName.trim());
      setEditingHash(null);
      setEditName('');
    }
  };

  if (blockchainAccounts.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-6">
      <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
        Linked Mailboxes ({blockchainAccounts.length})
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        All accounts registered on the blockchain for this wallet.
      </p>
      <div className="space-y-3">
        {blockchainAccounts.map((account) => {
          // Compare by public key to determine if this is the current account
          // Try full public key first, then fall back to publicKeyHash comparison
          let isCurrent = false;
          if (currentMailbox?.publicKey && account.publicKey) {
            isCurrent = currentMailbox.publicKey.toLowerCase() === account.publicKey.toLowerCase();
          } else if (currentMailbox?.publicKeyHash && account.publicKey) {
            // Derive hash from account public key and compare
            const publicKeyBytes = SimpleCryptoUtils.publicKeyFromHex(account.publicKey);
            const accountHash = SimpleCryptoUtils.bytesToHex(publicKeyBytes.slice(0, 16));
            isCurrent = currentMailbox.publicKeyHash === accountHash;
          }
          
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
                    {account.type === 'named' && (
                      <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-xs font-mono neon-text-cyan">
                        HASHDTAG
                      </span>
                    )}
                    {account.type === 'bare' && !account.hasHashIDAttached && (
                      <button
                        onClick={() => {
                          if (account.publicKey) {
                            setEditingHash(account.publicKey);
                            // Get current name from localStorage if available
                            const publicKeyBytes = SimpleCryptoUtils.publicKeyFromHex(account.publicKey);
                            const publicKeyHash = SimpleCryptoUtils.bytesToHex(publicKeyBytes.slice(0, 16));
                            const localMailbox = mailboxes.find(m => m.publicKeyHash === publicKeyHash);
                            setEditName(localMailbox?.name || account.name);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                        title="Rename mailbox"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
                {account.publicKey && (
                  <div className="flex items-center gap-2 mt-1">
                    <p 
                      className="text-xs text-gray-500 font-mono cursor-help" 
                      title={account.publicKey}
                    >
                      {abbreviateKey(account.publicKey)}
                    </p>
                    <button
                      onClick={() => copyToClipboard(account.publicKey!)}
                      className="p-1 text-gray-500 hover:text-cyan-400 transition-colors"
                      title={copiedKey === account.publicKey ? 'Copied!' : 'Copy public key'}
                    >
                      {copiedKey === account.publicKey ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isCurrent ? (
                  <span className="text-xs text-green-400 font-bold px-3 py-1.5 rounded bg-green-500/10 border border-green-500/30 font-mono">
                    ACTIVE
                  </span>
                ) : account.publicKey && (
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
  );
};
