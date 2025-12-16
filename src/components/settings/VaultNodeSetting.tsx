/**
 * Vault Node Setting Component
 * 
 * Allows users to configure which vault nodes to use for storage
 * Fetches available nodes from on-chain registry
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Database, Check, RefreshCw, Wifi, WifiOff, Zap, AlertCircle } from 'lucide-react';
import { useSettingsStore, VaultFallbackStrategy } from '../../store/settingsStore';
import { getVaultNodesFromRegistry } from '../../utils/contracts';

interface VaultNode {
  nodeId: string;
  url: string;
  active: boolean;
  healthy?: boolean;
  latency?: number;
}

export const VaultNodeSetting: React.FC = () => {
  const { 
    vaultPrimaryNode, 
    vaultFallbackStrategy, 
    setVaultPrimaryNode, 
    setVaultFallbackStrategy 
  } = useSettingsStore();
  
  const [registryNodes, setRegistryNodes] = useState<VaultNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [saved, setSaved] = useState(false);
  const [customUrl, setCustomUrl] = useState(vaultPrimaryNode);
  const [healthyCount, setHealthyCount] = useState(0);

  const checkNodeHealth = async (url: string): Promise<{ healthy: boolean; latency: number }> => {
    const start = Date.now();
    try {
      const response = await fetch(`${url}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      const latency = Date.now() - start;
      return { healthy: response.ok, latency };
    } catch {
      return { healthy: false, latency: 9999 };
    }
  };

  const fetchNodesFromRegistry = useCallback(async () => {
    setLoading(true);
    console.log('🔍 VaultNodeSetting: Fetching nodes from registry...');
    try {
      const nodes = await getVaultNodesFromRegistry();
      console.log('🔍 VaultNodeSetting: Got nodes from registry:', nodes);
      
      if (nodes.length === 0) {
        console.log('🔍 VaultNodeSetting: No nodes found, using default');
        // No registry configured or no nodes - use default
        const defaultNode = process.env.REACT_APP_VAULT_API_URL || 'http://localhost:3004';
        const health = await checkNodeHealth(defaultNode);
        setRegistryNodes([{ 
          nodeId: 'default', 
          url: defaultNode, 
          active: true,
          healthy: health.healthy,
          latency: health.latency
        }]);
        setHealthyCount(health.healthy ? 1 : 0);
        return;
      }
      
      // Check health of all nodes in parallel
      const nodesWithHealth = await Promise.all(
        nodes.map(async (node) => {
          const health = await checkNodeHealth(node.url);
          return { ...node, healthy: health.healthy, latency: health.latency };
        })
      );
      
      // Sort by latency (fastest first)
      nodesWithHealth.sort((a, b) => (a.latency || 9999) - (b.latency || 9999));
      
      setRegistryNodes(nodesWithHealth);
      setHealthyCount(nodesWithHealth.filter(n => n.healthy).length);
    } catch (error) {
      console.warn('Failed to fetch nodes from registry:', error);
      // Fallback to default node
      const defaultNode = process.env.REACT_APP_VAULT_API_URL || 'http://localhost:3004';
      const health = await checkNodeHealth(defaultNode);
      setRegistryNodes([{ 
        nodeId: 'default', 
        url: defaultNode, 
        active: true,
        healthy: health.healthy,
        latency: health.latency
      }]);
      setHealthyCount(health.healthy ? 1 : 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNodesFromRegistry();
  }, [fetchNodesFromRegistry]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch(`${customUrl}/health`);
      if (response.ok) {
        setTestResult('success');
      } else {
        setTestResult('error');
      }
    } catch (error) {
      setTestResult('error');
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  const handleSave = () => {
    setVaultPrimaryNode(customUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSelectNode = (url: string) => {
    setCustomUrl(url);
    setVaultPrimaryNode(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleStrategyChange = (strategy: VaultFallbackStrategy) => {
    setVaultFallbackStrategy(strategy);
    
    // If selecting 'auto', automatically pick the fastest healthy node
    if (strategy === 'auto' && registryNodes.length > 0) {
      const fastestHealthy = registryNodes.find(n => n.healthy);
      if (fastestHealthy) {
        console.log(`⚡ Auto-selecting fastest node: ${fastestHealthy.url} (${fastestHealthy.latency}ms)`);
        setCustomUrl(fastestHealthy.url);
        setVaultPrimaryNode(fastestHealthy.url);
      }
    }
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider font-mono">
            Vault Nodes
          </h3>
        </div>
        <p className="text-sm text-gray-400">
          Configure which vault nodes to use for storing and retrieving your encrypted data.
        </p>
      </div>

      {/* Primary Node Selection */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
            Primary Node
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="http://localhost:3004"
              className="flex-1 px-4 py-3 bg-gray-900/50 rounded-lg text-white font-mono text-sm focus:border-cyan-500 focus:outline-none transition-colors"
            />
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-3 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 hover:border-cyan-500/50 text-gray-300 hover:text-cyan-400 rounded-lg transition-all font-mono text-sm flex items-center gap-2"
            >
              {testing && <RefreshCw className="w-4 h-4 animate-spin" />}
              {testResult === 'success' && <Check className="w-4 h-4 text-green-400" />}
              {testResult === 'error' && <WifiOff className="w-4 h-4 text-red-400" />}
              {!testing && !testResult && <Wifi className="w-4 h-4" />}
              TEST
            </button>
            <button
              onClick={handleSave}
              className={`px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all font-mono text-sm ${
                saved
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30'
              }`}
            >
              {saved ? <Check className="w-5 h-5" /> : 'SAVE'}
            </button>
          </div>
        </div>

        {/* Fallback Strategy */}
        <div>
          <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
            Fallback Strategy
          </label>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'auto', label: 'Auto (Fastest)', icon: Zap, desc: 'Use fastest responding node' },
              { value: 'primary', label: 'Primary Only', icon: Database, desc: 'Only use selected node' },
              { value: 'all', label: 'All Nodes', icon: RefreshCw, desc: 'Query all, verify consistency' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleStrategyChange(option.value as VaultFallbackStrategy)}
                className={`px-4 py-2 rounded-lg font-mono text-sm transition-all flex items-center gap-2 ${
                  vaultFallbackStrategy === option.value
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600 hover:border-cyan-500/30 hover:text-cyan-400'
                }`}
                title={option.desc}
              >
                <option.icon className="w-4 h-4" />
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2 font-mono">
            {vaultFallbackStrategy === 'auto' && '✓ Automatically selects the fastest responding node'}
            {vaultFallbackStrategy === 'primary' && '🔒 Only uses your selected primary node'}
            {vaultFallbackStrategy === 'all' && '🔍 Queries all nodes and verifies data consistency'}
          </p>
        </div>

        {/* Available Nodes from Registry */}
        <div className="pt-4 border-t border-cyan-500/10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold neon-text-cyan uppercase tracking-wider font-mono">
              Available Nodes
            </p>
            <button
              onClick={fetchNodesFromRegistry}
              disabled={loading}
              className="text-xs text-gray-400 hover:text-cyan-400 font-mono flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          {loading && registryNodes.length === 0 && (
            <p className="text-xs text-gray-500 font-mono">Loading nodes from registry...</p>
          )}
          
          {!loading && registryNodes.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-yellow-400 font-mono">
              <AlertCircle className="w-4 h-4" />
              No nodes found in registry
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            {registryNodes.map((node) => (
              <button
                key={node.nodeId}
                onClick={() => handleSelectNode(node.url)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-all flex items-center gap-2 ${
                  vaultPrimaryNode === node.url
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'bg-gray-700/50 hover:bg-cyan-500/20 border border-gray-600 hover:border-cyan-500/50 text-gray-400 hover:text-cyan-400'
                }`}
                title={`Latency: ${node.latency ? node.latency + 'ms' : 'unknown'}`}
              >
                {node.healthy ? (
                  <Wifi className="w-3 h-3 text-green-400" />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-400" />
                )}
                <span>{node.url.replace(/^https?:\/\//, '')}</span>
                {node.latency && node.latency < 9999 && (
                  <span className="text-gray-500">{node.latency}ms</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Network Status */}
        <div className="pt-4 border-t border-cyan-500/10">
          <p className="text-xs text-gray-400 font-mono">
            <strong className="neon-text-cyan">CURRENT:</strong> {vaultPrimaryNode}
          </p>
          <p className="text-xs text-gray-400 font-mono mt-1">
            <strong className="neon-text-cyan">NETWORK:</strong> {healthyCount}/{registryNodes.length} nodes healthy
          </p>
        </div>
      </div>
    </div>
  );
};
