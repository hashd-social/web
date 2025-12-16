/**
 * Vault Node Setting Component
 * 
 * Allows users to configure which vault nodes to use for storage
 * Fetches available nodes from on-chain registry
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Database, Check, RefreshCw, Wifi, WifiOff, Zap, AlertCircle, MessageSquare, FileText, Image, ShoppingBag, Settings2 } from 'lucide-react';
import { useSettingsStore, VaultFallbackStrategy, ContentType, ContentTypeNodePreferences } from '../../store/settingsStore';
import { getVaultNodesFromRegistry } from '../../utils/contracts';

interface VaultNode {
  nodeId: string;
  url: string;
  active: boolean;
  healthy?: boolean;
  latency?: number;
  contentTypes?: string[] | 'all';
  allowedGuilds?: string[] | 'all';
  blockedGuilds?: string[];
}

// Content type configuration
const CONTENT_TYPES: { type: ContentType; label: string; icon: typeof MessageSquare; color: string }[] = [
  { type: 'messages', label: 'Messages', icon: MessageSquare, color: 'blue' },
  { type: 'posts', label: 'Posts', icon: FileText, color: 'green' },
  { type: 'media', label: 'Media', icon: Image, color: 'purple' },
  { type: 'listings', label: 'Listings', icon: ShoppingBag, color: 'yellow' }
];

export const VaultNodeSetting: React.FC = () => {
  const { 
    vaultPrimaryNode, 
    vaultFallbackStrategy, 
    contentTypeNodes,
    contentTypeOverrides,
    setVaultPrimaryNode, 
    setVaultFallbackStrategy,
    setContentTypeNodes,
    setContentTypeOverride,
    clearContentTypeOverride
  } = useSettingsStore();
  
  const [registryNodes, setRegistryNodes] = useState<VaultNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [saved, setSaved] = useState(false);
  const [customUrl, setCustomUrl] = useState(vaultPrimaryNode);
  const [healthyCount, setHealthyCount] = useState(0);
  const [showOverrides, setShowOverrides] = useState(false);

  // Auto-assign nodes for each content type based on their capabilities
  const autoAssignNodes = useCallback((nodes: VaultNode[]) => {
    const healthyNodes = nodes.filter(n => n.healthy);
    if (healthyNodes.length === 0) return;

    const assignments: ContentTypeNodePreferences = {
      messages: null,
      posts: null,
      media: null,
      listings: null
    };

    // First pass: assign specialist nodes (nodes that only serve specific content types)
    for (const contentType of ['messages', 'posts', 'media', 'listings'] as ContentType[]) {
      // Find nodes that support this content type
      const supportingNodes = healthyNodes.filter(n => {
        if (n.contentTypes === 'all') return true;
        if (Array.isArray(n.contentTypes)) return n.contentTypes.includes(contentType);
        return false;
      });

      // Prefer specialist nodes (fewer content types = more specialized)
      const specialists = supportingNodes.filter(n => {
        if (n.contentTypes === 'all') return false;
        if (Array.isArray(n.contentTypes)) return n.contentTypes.length <= 2;
        return false;
      });

      if (specialists.length > 0) {
        // Pick fastest specialist
        assignments[contentType] = specialists[0].url;
      } else if (supportingNodes.length > 0) {
        // Fall back to any supporting node (fastest)
        assignments[contentType] = supportingNodes[0].url;
      }
    }

    // Second pass: fill any gaps with generalist nodes
    const generalists = healthyNodes.filter(n => n.contentTypes === 'all');
    for (const contentType of ['messages', 'posts', 'media', 'listings'] as ContentType[]) {
      if (!assignments[contentType] && generalists.length > 0) {
        assignments[contentType] = generalists[0].url;
      }
    }

    // Update store with auto-assignments
    setContentTypeNodes(assignments);
    console.log('🔄 Auto-assigned content type nodes:', assignments);
  }, [setContentTypeNodes]);

  const checkNodeHealth = async (url: string): Promise<{ 
    healthy: boolean; 
    latency: number;
    contentTypes?: string[] | 'all';
    allowedGuilds?: string[] | 'all';
    blockedGuilds?: string[];
  }> => {
    const start = Date.now();
    try {
      const response = await fetch(`${url}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      const latency = Date.now() - start;
      
      if (!response.ok) {
        return { healthy: false, latency: 9999 };
      }

      // Try to fetch node info for content types
      try {
        const infoResponse = await fetch(`${url}/node/info`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        if (infoResponse.ok) {
          const info = await infoResponse.json();
          return { 
            healthy: true, 
            latency,
            contentTypes: info.contentTypes,
            allowedGuilds: info.allowedGuilds,
            blockedGuilds: info.blockedGuilds
          };
        }
      } catch {
        // Node info not available, just return health
      }

      return { healthy: true, latency };
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
          return { 
            ...node, 
            healthy: health.healthy, 
            latency: health.latency,
            contentTypes: health.contentTypes,
            allowedGuilds: health.allowedGuilds,
            blockedGuilds: health.blockedGuilds
          };
        })
      );
      
      // Sort by latency (fastest first)
      nodesWithHealth.sort((a, b) => (a.latency || 9999) - (b.latency || 9999));
      
      setRegistryNodes(nodesWithHealth);
      setHealthyCount(nodesWithHealth.filter(n => n.healthy).length);
      
      // Auto-assign nodes for each content type
      autoAssignNodes(nodesWithHealth);
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
            ByteCave Nodes
          </h3>
        </div>
        <p className="text-sm text-gray-400">
         Click a node to set it as the default fallback when no specialist node is available.
        </p>
      </div>

      <div className="space-y-4">
        {/* Available Nodes from Registry - FIRST */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider font-mono">
              Network Nodes ({healthyCount}/{registryNodes.length} online)
            </label>
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
          
          {(() => {
            // Filter to only show nodes that accept all content types
            const generalistNodes = registryNodes.filter(n => n.contentTypes === 'all');
            const onlySpecialists = registryNodes.length > 0 && generalistNodes.length === 0;
            
            if (onlySpecialists) {
              return (
                <div className="flex items-center gap-2 text-xs text-yellow-400 font-mono bg-yellow-500/10 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Only specialist nodes available. Some features may be limited until a full-service node joins the network.</span>
                </div>
              );
            }
            
            return (
              <div className="space-y-2">
                {generalistNodes.map((node) => {
                  const isDefaultFallback = vaultPrimaryNode === node.url;
                  
                  return (
                    <button
                      key={node.nodeId}
                      onClick={() => handleSelectNode(node.url)}
                      className={`w-full rounded-lg text-left transition-all ${
                        isDefaultFallback
                          ? 'bg-cyan-500/20 border border-cyan-500/50'
                          : 'bg-gray-700/30 hover:bg-cyan-500/10 border border-gray-600 hover:border-cyan-500/30'
                      }`}
                    >
                      <div className="px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {node.healthy ? (
                            <Wifi className="w-3 h-3 text-green-400" />
                          ) : (
                            <WifiOff className="w-3 h-3 text-red-400" />
                          )}
                          <span className={`font-mono text-sm ${isDefaultFallback ? 'text-cyan-400' : 'text-gray-300'}`}>
                            {node.url.replace(/^https?:\/\//, '')}
                          </span>
                          <span className="text-xs text-cyan-400 font-mono">ALL CONTENT</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {node.latency && node.latency < 9999 && (
                            <span className="text-xs text-gray-500 font-mono">{node.latency}ms</span>
                          )}
                          {isDefaultFallback && (
                            <span className="text-xs text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded font-mono">DEFAULT</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })()}

        </div>

        {/* Content Type Routing - SECOND */}
        <div className="pt-4 border-t border-cyan-500/10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold neon-text-cyan uppercase tracking-wider font-mono">
              Content Type Routing
            </p>
            <button
              onClick={() => setShowOverrides(!showOverrides)}
              className="text-xs text-gray-400 hover:text-cyan-400 font-mono flex items-center gap-1"
            >
              <Settings2 className="w-3 h-3" />
              {showOverrides ? 'Hide Overrides' : 'Show Overrides'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Nodes are auto-assigned based on their capabilities. Specialist nodes are preferred.
          </p>
          
          <div className="space-y-2">
            {CONTENT_TYPES.map(({ type, label, icon: Icon, color }) => {
              const autoNode = contentTypeNodes[type];
              const override = contentTypeOverrides[type];
              const effectiveNode = override || autoNode || vaultPrimaryNode;
              const isOverridden = !!override;
              
              // Find nodes that support this content type for the dropdown
              const supportingNodes = registryNodes.filter(n => {
                if (!n.healthy) return false;
                if (n.contentTypes === 'all') return true;
                if (Array.isArray(n.contentTypes)) return n.contentTypes.includes(type);
                return false;
              });
              
              return (
                <div key={type} className="flex items-center gap-3 bg-gray-900/30 rounded-lg px-3 py-2">
                  <div className={`flex items-center gap-2 w-24 text-${color}-400`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-mono uppercase">{label}</span>
                  </div>
                  
                  {showOverrides ? (
                    <div className="flex-1 flex items-center gap-2">
                      <select
                        value={override || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setContentTypeOverride(type, e.target.value);
                          } else {
                            clearContentTypeOverride(type);
                          }
                          setSaved(true);
                          setTimeout(() => setSaved(false), 2000);
                        }}
                        className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs font-mono text-gray-300 focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="">Auto ({autoNode ? autoNode.replace(/^https?:\/\//, '') : 'none'})</option>
                        {supportingNodes.map(node => (
                          <option key={node.nodeId} value={node.url}>
                            {node.url.replace(/^https?:\/\//, '')}
                          </option>
                        ))}
                      </select>
                      {isOverridden && (
                        <button
                          onClick={() => {
                            clearContentTypeOverride(type);
                            setSaved(true);
                            setTimeout(() => setSaved(false), 2000);
                          }}
                          className="text-xs text-gray-500 hover:text-red-400"
                          title="Clear override"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center gap-2">
                      <span className={`text-xs font-mono ${isOverridden ? 'text-cyan-400' : 'text-gray-400'}`}>
                        {effectiveNode.replace(/^https?:\/\//, '')}
                      </span>
                      {isOverridden && (
                        <span className="text-xs text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded">override</span>
                      )}
                      {!autoNode && !override && (
                        <span className="text-xs text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">default fallback</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Retrieval Strategy - THIRD */}
        <div className="pt-4 border-t border-cyan-500/10">
          <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
            Retrieval Mode
          </label>
          <p className="text-xs text-gray-500 mb-2">
            How to fetch data when reading from the network. Data integrity is always verified via CID.
          </p>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'auto', label: 'Race All', icon: Zap, desc: 'Query all nodes simultaneously, use fastest response' },
              { value: 'primary', label: 'Routed Only', icon: Database, desc: 'Only query the assigned node for each content type' }
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
            {vaultFallbackStrategy === 'auto' && '⚡ Queries all nodes at once, uses whichever responds fastest'}
            {vaultFallbackStrategy === 'primary' && '🎯 Only queries the specific node assigned for each content type'}
            {vaultFallbackStrategy === 'all' && '⚡ Queries all nodes at once, uses whichever responds fastest'}
          </p>
        </div>
      </div>
    </div>
  );
};
