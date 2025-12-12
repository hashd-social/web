/**
 * RPC Endpoint Setting Component
 * 
 * Allows users to configure the RPC endpoint for blockchain interactions
 */

import React, { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';

export const RpcEndpointSetting: React.FC = () => {
  const { rpcUrl, setRpcUrl } = useSettingsStore();
  const [rpcInput, setRpcInput] = useState(rpcUrl);
  const [rpcSaved, setRpcSaved] = useState(false);

  const handleSaveRpc = () => {
    setRpcUrl(rpcInput);
    setRpcSaved(true);
    setTimeout(() => setRpcSaved(false), 2000);
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
          RPC Endpoint
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Configure the RPC endpoint for blockchain interactions. 
          Changes will take effect on next wallet connection.
        </p>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
            RPC URL
          </label>
          <input
            type="text"
            value={rpcInput}
            onChange={(e) => setRpcInput(e.target.value)}
            placeholder="https://carrot.megaeth.com/rpc"
            className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white font-mono text-sm focus:border-cyan-500 focus:outline-none transition-colors"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleSaveRpc}
            disabled={rpcInput === rpcUrl}
            className="px-6 py-2.5 bg-cyan-500/10 hover:border-cyan-500/50 neon-text-cyan rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold font-mono"
          >
            {rpcSaved ? '✓ SAVED' : 'SAVE'}
          </button>
          <button
            onClick={() => setRpcInput(rpcUrl)}
            disabled={rpcInput === rpcUrl}
            className="px-6 py-2.5 bg-gray-700/50 hover:border-gray-500/50 text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold font-mono"
          >
            CANCEL
          </button>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-cyan-500/10">
        <p className="text-xs text-gray-400 font-mono">
          <strong className="neon-text-cyan">CURRENT:</strong> {rpcUrl}
        </p>
        <p className="text-xs text-gray-400 font-mono mt-1">
          <strong className="neon-text-cyan">DEFAULT:</strong> {process.env.REACT_APP_RPC_URL || 'http://localhost:8545'}
        </p>
      </div>
    </div>
  );
};
