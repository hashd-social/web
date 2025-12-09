/**
 * IPFS Upload Setting Component
 * 
 * Allows users to configure how encrypted messages are uploaded to IPFS
 */

import React, { useState } from 'react';
import { Cloud, Check, X, RefreshCw } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { IPFSProvider, ipfsUploadService } from '../../services/ipfs/userCredentials';

export const IpfsUploadSetting: React.FC = () => {
  const { ipfsCredentials, setIPFSCredentials } = useSettingsStore();
  const [ipfsProvider, setIpfsProvider] = useState<IPFSProvider>(ipfsCredentials?.provider || 'none');
  const [ipfsApiKey, setIpfsApiKey] = useState(ipfsCredentials?.apiKey || '');
  const [ipfsSaved, setIpfsSaved] = useState(false);
  const [ipfsTesting, setIpfsTesting] = useState(false);
  const [ipfsTestResult, setIpfsTestResult] = useState<'success' | 'error' | null>(null);

  const handleSaveIPFS = () => {
    if (ipfsProvider === 'none') {
      setIPFSCredentials(null);
    } else {
      setIPFSCredentials({
        provider: ipfsProvider,
        apiKey: ipfsApiKey
      });
    }
    setIpfsSaved(true);
    setTimeout(() => setIpfsSaved(false), 2000);
  };

  const handleTestIPFS = async () => {
    setIpfsTesting(true);
    setIpfsTestResult(null);
    
    try {
      // Test the connection using the testCredentials method
      const success = await ipfsUploadService.testCredentials({
        provider: ipfsProvider,
        apiKey: ipfsApiKey
      });
      
      if (success) {
        setIpfsTestResult('success');
      } else {
        setIpfsTestResult('error');
      }
    } catch (error) {
      console.error('IPFS test failed:', error);
      setIpfsTestResult('error');
    } finally {
      setIpfsTesting(false);
      setTimeout(() => setIpfsTestResult(null), 3000);
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Cloud className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider font-mono">
            IPFS Upload Method
          </h3>
        </div>
        <p className="text-sm text-gray-400">
          Configure how your encrypted messages are uploaded to IPFS. 
          Bring your own API keys for maximum privacy and control.
        </p>
      </div>

      <div className="space-y-4">
        {/* Provider Selection */}
        <div>
          <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
            Upload Provider
          </label>
          <select
            value={ipfsProvider}
            onChange={(e) => setIpfsProvider(e.target.value as IPFSProvider)}
            className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white font-mono text-sm focus:border-cyan-500 focus:outline-none transition-colors cursor-pointer"
          >
            <option value="none">Use Relayer (Default - Free)</option>
            <option value="pinata">Pinata (Bring Your Own Key)</option>
          </select>
          <p className="text-xs text-gray-400 mt-2 font-mono">
            {ipfsProvider === 'none' && '✓ Messages uploaded via Hashd relayer (easiest option)'}
            {ipfsProvider === 'pinata' && '🔒 Upload directly to your Pinata account (more private)'}
          </p>
        </div>

        {/* API Key Input (shown for Pinata) */}
        {ipfsProvider === 'pinata' && (
          <>
            <div>
              <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
                Pinata JWT Token
              </label>
              <input
                type="password"
                value={ipfsApiKey}
                onChange={(e) => setIpfsApiKey(e.target.value)}
                placeholder="Enter your Pinata JWT token"
                className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white font-mono text-sm focus:border-cyan-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Help Text */}
            <div className="p-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg">
              <p className="text-xs text-gray-300 font-mono">
                <strong className="neon-text-cyan">📝 How to get your Pinata JWT:</strong><br/>
                1. Sign up at <a href="https://pinata.cloud" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">pinata.cloud</a><br/>
                2. Go to API Keys → New Key<br/>
                3. Give it a name (e.g., "hashd")<br/>
                4. ⚠️ IMPORTANT: Toggle <strong>"Admin"</strong> ON<br/>
                &nbsp;&nbsp;&nbsp;(Or manually enable "pinFileToIPFS" under Legacy Endpoints)<br/>
                5. Click "Generate Key"<br/>
                6. Copy the <strong>JWT token</strong> (starts with "eyJ...") and paste above
              </p>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSaveIPFS}
            className="px-6 py-2.5 bg-cyan-500/10 hover:border-cyan-500/50 neon-text-cyan rounded-lg transition-all text-sm font-bold font-mono"
          >
            {ipfsSaved ? '✓ SAVED' : 'SAVE'}
          </button>

          {ipfsProvider !== 'none' && ipfsApiKey && (
            <button
              onClick={handleTestIPFS}
              disabled={ipfsTesting}
              className="px-6 py-2.5 bg-gray-700/50 hover:border-gray-500/50 text-gray-300 rounded-lg disabled:opacity-50 transition-all text-sm font-bold font-mono flex items-center gap-2"
            >
              {ipfsTesting && <RefreshCw className="w-4 h-4 animate-spin" />}
              {ipfsTestResult === 'success' && <Check className="w-4 h-4 text-green-400" />}
              {ipfsTestResult === 'error' && <X className="w-4 h-4 text-red-400" />}
              {ipfsTesting ? 'TESTING...' : 'TEST CONNECTION'}
            </button>
          )}
        </div>

        {/* Current Status */}
        <div className="pt-4 border-t border-cyan-500/10">
          <p className="text-xs text-gray-400 font-mono">
            <strong className="neon-text-cyan">CURRENT:</strong>{' '}
            {ipfsCredentials?.provider === 'pinata' && 'Using your Pinata account'}
            {(!ipfsCredentials || ipfsCredentials.provider === 'none') && 'Using Hashd relayer (default)'}
          </p>
        </div>
      </div>
    </div>
  );
};
