/**
 * IPFS Gateway Setting Component
 * 
 * Allows users to configure the IPFS gateway for fetching content
 */

import React, { useState } from 'react';
import { Cloud, Check } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

export const IpfsGatewaySetting: React.FC = () => {
  const { ipfsGateway, setIPFSGateway } = useSettingsStore();
  const [ipfsGatewayInput, setIpfsGatewayInput] = useState(ipfsGateway);
  const [ipfsGatewaySaved, setIpfsGatewaySaved] = useState(false);

  const handleSaveIPFSGateway = () => {
    setIPFSGateway(ipfsGatewayInput);
    setIpfsGatewaySaved(true);
    setTimeout(() => setIpfsGatewaySaved(false), 2000);
  };

  const handleQuickSelect = (url: string) => {
    setIpfsGatewayInput(url);
    setIPFSGateway(url);
    setIpfsGatewaySaved(true);
    setTimeout(() => setIpfsGatewaySaved(false), 2000);
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Cloud className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider font-mono">
            IPFS Gateway
          </h3>
        </div>
        <p className="text-sm text-gray-400">
          Gateway used to fetch content from IPFS. Change this if you prefer a different gateway.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={ipfsGatewayInput}
          onChange={(e) => setIpfsGatewayInput(e.target.value)}
          placeholder="https://ipfs.io/ipfs"
          className="flex-1 px-4 py-3 bg-gray-900/50 rounded-lg text-white font-mono text-sm focus:border-cyan-500 focus:outline-none transition-colors"
        />
        <button
          onClick={handleSaveIPFSGateway}
          className={`px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all font-mono text-sm ${
            ipfsGatewaySaved
              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
              : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30'
          }`}
        >
          {ipfsGatewaySaved ? <Check className="w-5 h-5" /> : 'SAVE'}
        </button>
      </div>
      
      <div className="mt-4 pt-4 border-t border-cyan-500/10">
        <p className="text-xs text-gray-400 font-mono">
          <strong className="neon-text-cyan">CURRENT:</strong> {ipfsGateway}
        </p>
        <p className="text-xs text-gray-400 font-mono mt-1">
          <strong className="neon-text-cyan">DEFAULT:</strong> {process.env.REACT_APP_IPFS_GATEWAY || 'https://3oh.myfilebase.com/ipfs'}
        </p>
        <div className="mt-3">
          <p className="text-xs text-gray-500 font-mono mb-2">Quick select:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickSelect(process.env.REACT_APP_IPFS_GATEWAY || 'https://3oh.myfilebase.com/ipfs')}
              className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-400 rounded text-xs font-mono transition-all font-bold"
            >
              SET DEFAULT
            </button>
            {[
              { name: 'ipfs.io', url: 'https://ipfs.io/ipfs' },
              { name: 'cloudflare-ipfs.com', url: 'https://cloudflare-ipfs.com/ipfs' },
              { name: 'dweb.link', url: 'https://dweb.link/ipfs' }
            ].map((gateway) => (
              <button
                key={gateway.name}
                onClick={() => handleQuickSelect(gateway.url)}
                className="px-3 py-1.5 bg-gray-700/50 hover:bg-cyan-500/20 border border-gray-600 hover:border-cyan-500/50 text-gray-400 hover:text-cyan-400 rounded text-xs font-mono transition-all"
              >
                {gateway.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
