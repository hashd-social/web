/**
 * How Mailboxes Work Component
 * 
 * Educational info section explaining mailbox security and portability
 */

import React from 'react';
import { Shield, Key, Hash, Wallet } from 'lucide-react';

export const HowMailboxesWork: React.FC = () => {
  return (
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
                Your PIN is <strong className="text-cyan-400">never stored</strong> anywhere. With session persistence enabled, your encryption key is stored encrypted in sessionStorage using a non-exportable browser key. Without persistence, keys exist only in memory.
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
              <h4 className="text-sm font-bold text-white mb-1 font-mono">HashID Identity</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                Your HashID (like @username) is your human-readable identity on-chain. It's linked to your public key and provides a consistent identity across all Hashd services.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
          <p className="text-xs text-cyan-300 leading-relaxed">
            <strong className="text-cyan-400">Tip:</strong> Enable "Session Persistence" in Settings to stay logged in until browser close. Your PIN is never stored—only the encrypted session key.
          </p>
        </div>
      </div>
    </div>
  );
};
