/**
 * Current Mailbox Component
 * 
 * Displays the active mailbox details and action buttons
 */

import React, { useState } from 'react';
import { User, Shield, Inbox, Edit2, Check, X } from 'lucide-react';
import { MailboxInfo, SimpleCryptoUtils } from '../../utils/crypto-simple';

interface BlockchainAccount {
  name: string;
  type: 'named' | 'bare';
  publicKey?: string;
  hasHashdTagAttached?: boolean;
}

interface CurrentMailboxProps {
  currentMailbox: MailboxInfo | null;
  isKeyRegistered: boolean;
  loading: boolean;
  keyPair: any;
  blockchainAccounts: BlockchainAccount[];
  onSetupMailbox: () => void;
  onCompleteSetup: () => void;
  onSwitchOrCreate: () => void;
  onRename: (publicKeyHash: string, newName: string) => void;
}

export const CurrentMailbox: React.FC<CurrentMailboxProps> = ({
  currentMailbox,
  isKeyRegistered,
  loading,
  keyPair,
  blockchainAccounts,
  onSetupMailbox,
  onCompleteSetup,
  onSwitchOrCreate,
  onRename,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  // Find the current account in blockchain accounts to get HashdTag info
  // Try full public key first, then fall back to publicKeyHash comparison
  const currentBlockchainAccount = blockchainAccounts.find(acc => {
    if (!acc.publicKey) return false;
    
    // Try direct public key comparison
    if (currentMailbox?.publicKey) {
      return acc.publicKey.toLowerCase() === currentMailbox.publicKey.toLowerCase();
    }
    
    // Fall back to hash comparison
    if (currentMailbox?.publicKeyHash) {
      const publicKeyBytes = SimpleCryptoUtils.publicKeyFromHex(acc.publicKey);
      const accountHash = SimpleCryptoUtils.bytesToHex(publicKeyBytes.slice(0, 16));
      return currentMailbox.publicKeyHash === accountHash;
    }
    
    return false;
  }) || null;
  
  // Use HashdTag name if attached, otherwise use local mailbox name
  const displayName = currentBlockchainAccount?.hasHashdTagAttached 
    ? currentBlockchainAccount.name 
    : currentMailbox?.name || 'Unknown';
  
  const hasHashdTag = currentBlockchainAccount?.hasHashdTagAttached || false;

  const handleStartRename = () => {
    if (currentMailbox) {
      setEditName(currentMailbox.name);
      setEditingName(true);
    }
  };

  const handleRename = () => {
    if (currentMailbox && editName.trim()) {
      onRename(currentMailbox.publicKeyHash, editName.trim());
      setEditingName(false);
      setEditName('');
    }
  };

  const handleCancelRename = () => {
    setEditingName(false);
    setEditName('');
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-cyan-500/10 rounded-lg">
          <User className="w-6 h-6 neon-text-cyan" />
        </div>
        <div>
          <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider font-mono">
            Current Mailbox
          </h3>
          <p className="text-sm text-gray-400">
            Your active messaging identity
          </p>
        </div>
      </div>

      {currentMailbox ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400 font-mono">NAME:</span>
            <div className="flex items-center gap-2">
              {editingName ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter custom name"
                    className="px-3 py-1.5 bg-gray-900 border border-cyan-500/50 rounded text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename();
                      else if (e.key === 'Escape') handleCancelRename();
                    }}
                  />
                  <button
                    onClick={handleRename}
                    className="p-1.5 text-green-400 hover:text-green-300 transition-colors"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelRename}
                    className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm font-bold text-white font-mono">
                    {displayName}
                  </span>
                  {hasHashdTag && (
                    <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-xs font-mono neon-text-cyan">
                      HASHDTAG
                    </span>
                  )}
                  {!hasHashdTag && (
                    <button
                      onClick={handleStartRename}
                      className="p-1.5 text-gray-400 hover:text-cyan-400 transition-colors"
                      title="Rename mailbox"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
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
  );
};
