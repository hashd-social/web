/**
 * Dev Tools Drawer
 * 
 * A slide-out drawer with development utilities.
 * Only available in development mode.
 */

import React, { useState } from 'react';
import { X, Trash2, Info, Copy } from 'lucide-react';

// Hardhat default wallet addresses for reference
const HARDHAT_WALLETS = [
  { index: 0, address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' },
  { index: 1, address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' },
  { index: 2, address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' },
];

interface DevToolsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevToolsDrawer: React.FC<DevToolsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addLog(`📋 Copied ${label} to clipboard`);
  };

  const handleClearLocalStorage = () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('hashd_'));
    keys.forEach(k => localStorage.removeItem(k));
    addLog(`🗑️ Cleared ${keys.length} hashd_ localStorage items`);
  };

  const handleClearAllStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    addLog('🗑️ Cleared all localStorage and sessionStorage');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-cyan-500/30 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-500/30">
          <h2 className="text-lg font-bold neon-text-cyan font-mono">DEV TOOLS</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Hardhat Wallets */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3 font-mono flex items-center gap-2">
              <Info className="w-4 h-4" />
              Hardhat Wallets
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              Import these into MetaMask for testing on localhost:8545
            </p>
            <div className="space-y-2">
              {HARDHAT_WALLETS.map((wallet) => (
                <div key={wallet.index} className="p-2 bg-gray-900/50 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-cyan-400 font-bold text-xs">Wallet {wallet.index}</span>
                    <button
                      onClick={() => copyToClipboard(wallet.privateKey, `Wallet ${wallet.index} key`)}
                      className="text-gray-400 hover:text-cyan-400 transition-colors"
                      title="Copy private key"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-gray-400 text-xs font-mono truncate">
                    {wallet.address}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Storage Management */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3 font-mono flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Storage
            </h3>
            <div className="space-y-2">
              <button
                onClick={handleClearLocalStorage}
                className="w-full px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded text-yellow-400 font-mono text-sm hover:bg-yellow-500/30 transition-all"
              >
                Clear Hashd Storage
              </button>
              <button
                onClick={handleClearAllStorage}
                className="w-full px-4 py-2 bg-red-500/20 border border-red-500/50 rounded text-red-400 font-mono text-sm hover:bg-red-500/30 transition-all"
              >
                Clear ALL Storage
              </button>
            </div>
          </div>

          {/* Logs */}
          {logs.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider font-mono">
                  Logs
                </h3>
                <button
                  onClick={() => setLogs([])}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
              <div className="bg-black/50 rounded p-2 max-h-48 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className="text-xs text-gray-300 font-mono">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyan-500/30 text-center">
          <p className="text-xs text-gray-500 font-mono">
            Development Mode Only
          </p>
        </div>
      </div>
    </>
  );
};
