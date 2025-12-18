import React, { useState, useEffect } from 'react';
import { contractService, CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../utils/contracts';
import { Server, Database, Globe, Zap, Shield, Network, HardDrive, Wifi, Activity, Terminal, Copy, ExternalLink } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';

interface SystemInfoProps {
  onError: (error: string) => void;
}

interface SystemData {
  availableDomains: string[];
  networkName: string;
  chainId: number;
  contractAddresses: typeof CONTRACT_ADDRESSES;
  rpcUrl: string;
  explorerUrl: string;
  ipfsGateway: string;
  relayerUrl: string;
}

interface ContractInfo {
  name: string;
  address: string;
  description: string;
  icon: string;
}

export const SystemInfo: React.FC<SystemInfoProps> = ({ onError }) => {
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  useEffect(() => {
    loadSystemInfo();
  }, []);

  const loadSystemInfo = async () => {
    try {
      setLoading(true);
      const domains = await contractService.getAvailableDomains();
      setSystemData({
        availableDomains: domains,
        networkName: NETWORK_CONFIG.NAME,
        chainId: NETWORK_CONFIG.CHAIN_ID,
        contractAddresses: CONTRACT_ADDRESSES,
        rpcUrl: NETWORK_CONFIG.RPC_URL,
        explorerUrl: NETWORK_CONFIG.EXPLORER_URL,
        ipfsGateway: process.env.REACT_APP_IPFS_GATEWAY || 'https://3oh.myfilebase.com/ipfs',
        relayerUrl: process.env.REACT_APP_RELAYER_URL || 'http://localhost:3001'
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to load system info');
    } finally {
      setLoading(false);
    }
  };

  const getTokenContracts = (): ContractInfo[] => {
    const contracts: ContractInfo[] = [
      {
        name: 'HASHD Token',
        address: process.env.REACT_APP_HASHD_TOKEN || 'Not deployed',
        description: '🪙 ERC20 - Utility token for staking & rewards',
        icon: '🪙'
      }
    ];
    return contracts.filter(c => c.address !== 'Not deployed');
  };

  const getStorageContracts = (): ContractInfo[] => {
    const contracts: ContractInfo[] = [
      {
        name: 'MessageStorage',
        address: process.env.REACT_APP_MESSAGE_STORAGE || 'Not deployed',
        description: '🔒 Eternal - Messages, threads, user CIDs',
        icon: '💾'
      },
      {
        name: 'KeyStorage',
        address: process.env.REACT_APP_KEY_STORAGE || 'Not deployed',
        description: '🔒 Eternal - Public keys, mailbox names',
        icon: '💾'
      },
      {
        name: 'AccountStorage',
        address: process.env.REACT_APP_ACCOUNT_STORAGE || 'Not deployed',
        description: '🔒 Eternal - Accounts, domains, NFT links',
        icon: '💾'
      },
      {
        name: 'PostStorage',
        address: process.env.REACT_APP_POST_STORAGE || 'Not deployed',
        description: '🔒 Eternal - Posts, comments, moderation',
        icon: '💾'
      },
      {
        name: 'UserProfileStorage',
        address: process.env.REACT_APP_USER_PROFILE_STORAGE || 'Not deployed',
        description: '🔒 Eternal - User profiles, group memberships',
        icon: '💾'
      },
      {
        name: 'GroupFactoryStorage',
        address: process.env.REACT_APP_GROUP_FACTORY_STORAGE || 'Not deployed',
        description: '🔒 Eternal - Group registry, metadata',
        icon: '💾'
      },
      {
        name: 'VaultNodeRegistryStorage',
        address: process.env.REACT_APP_VAULT_REGISTRY_STORAGE || 'Not deployed',
        description: '🔒 Eternal - Vault node registry data',
        icon: '💾'
      }
    ];
    return contracts.filter(c => c.address !== 'Not deployed');
  };

  const getLogicContracts = (): ContractInfo[] => {
    const contracts: ContractInfo[] = [
      {
        name: 'KeyRegistry',
        address: process.env.REACT_APP_KEY_REGISTRY || 'Not deployed',
        description: '🔄 Upgradeable - Key registration & management',
        icon: '🔑'
      },
      {
        name: 'AccountRegistry',
        address: process.env.REACT_APP_ACCOUNT_REGISTRY || 'Not deployed',
        description: '🔄 Upgradeable - Account registration & domains',
        icon: '📧'
      },
      {
        name: 'HashID (NFT)',
        address: process.env.REACT_APP_HASHD_TAG || 'Not deployed',
        description: '🔄 Upgradeable - Account NFT collection',
        icon: '🎫'
      },
      {
        name: 'MessageContract',
        address: process.env.REACT_APP_MESSAGE_CONTRACT || 'Not deployed',
        description: '🔄 Upgradeable - Messaging & threads logic',
        icon: '💬'
      },
      {
        name: 'UserProfile',
        address: process.env.REACT_APP_USER_PROFILE || 'Not deployed',
        description: '🔄 Upgradeable - User profiles & memberships',
        icon: '👤'
      },
      {
        name: 'GroupPostsDeployer',
        address: process.env.REACT_APP_GROUP_POSTS_DEPLOYER || 'Not deployed',
        description: '🔄 Upgradeable - Deploys GroupPosts contracts',
        icon: '📝'
      },
      {
        name: 'GroupCommentsDeployer',
        address: process.env.REACT_APP_GROUP_COMMENTS_DEPLOYER || 'Not deployed',
        description: '🔄 Upgradeable - Deploys GroupComments contracts',
        icon: '💬'
      },
      {
        name: 'BondingCurveDeployer',
        address: process.env.REACT_APP_BONDING_CURVE_DEPLOYER || 'Not deployed',
        description: '🔄 Upgradeable - Deploys token bonding curves',
        icon: '📈'
      },
      {
        name: 'GroupFactory',
        address: process.env.REACT_APP_GROUP_FACTORY || 'Not deployed',
        description: '🔄 Upgradeable - Group creation & management',
        icon: '🏭'
      },
      {
        name: 'DeploymentRegistry',
        address: process.env.REACT_APP_DEPLOYMENT_REGISTRY || 'Not deployed',
        description: '🔒 Immutable - Frontend deployment verification',
        icon: '✅'
      },
      {
        name: 'VaultNodeRegistryV1',
        address: process.env.REACT_APP_VAULT_REGISTRY || 'Not deployed',
        description: '🔄 Upgradeable - Vault node registration & management',
        icon: '🗄️'
      },
      {
        name: 'PlatformTreasury',
        address: process.env.REACT_APP_PLATFORM_TREASURY || 'Not deployed',
        description: '🔄 UUPS Upgradeable - Fee collection & distribution',
        icon: '💰'
      }
    ];
    return contracts.filter(c => c.address !== 'Not deployed');
  };

  const getAllContracts = (): ContractInfo[] => {
    return [...getTokenContracts(), ...getStorageContracts(), ...getLogicContracts()];
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(type);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const openInExplorer = (address: string) => {
    if (systemData?.explorerUrl) {
      window.open(`${systemData.explorerUrl}/address/${address}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen cyber-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/20 border-t-cyan-500 mb-4"></div>
          <p className="neon-text-cyan font-mono text-lg">INITIALIZING SYSTEM SCAN...</p>
          <div className="mt-2 text-xs neon-text-green font-mono">Accessing blockchain data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen hex-grid bg-gray-900">
      <div className="absolute inset-0 opacity-5 hex-grid pointer-events-none"></div>

      <PageHeader
        icon={Terminal}
        title="SYSTEM.OVERVIEW"
        subtitle="HASHD INFRASTRUCTURE STATUS"
        rightContent={
          <button
            onClick={loadSystemInfo}
            className="px-4 py-2 bg-gray-800/50 rounded-lg hover:border-cyan-500/50 transition-all neon-text-cyan font-mono text-sm font-bold hover:scale-105"
          >
            REFRESH.DATA
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Network Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Network */}
            <div className="bg-gray-900/50 rounded-lg p-6 neon-border-glow">
              <div className="flex items-center space-x-4">
                <Globe className="w-8 h-8 neon-text-cyan" />
                <div>
                  <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">NETWORK</p>
                  <p className="text-xl font-bold text-white font-mono">{systemData?.networkName || 'UNKNOWN'}</p>
                </div>
              </div>
            </div>

            {/* Chain ID */}
            <div className="bg-gray-900/50 border border-green-500/20 rounded-lg p-6 neon-border-glow">
              <div className="flex items-center space-x-4">
                <Network className="w-8 h-8 neon-text-green" />
                <div>
                  <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">CHAIN.ID</p>
                  <p className="text-xl font-bold text-white font-mono">{systemData?.chainId || '0'}</p>
                </div>
              </div>
            </div>

            {/* Domains */}
            <div className="bg-gray-900/50 border border-purple-500/20 rounded-lg p-6 neon-border-glow">
              <div className="flex items-center space-x-4">
                <Server className="w-8 h-8 neon-text-magenta" />
                <div>
                  <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">DOMAINS</p>
                  <p className="text-xl font-bold text-white font-mono">{systemData?.availableDomains.length || '0'}</p>
                </div>
              </div>
            </div>

            {/* Contracts */}
            <div className="bg-gray-900/50 border border-orange-500/20 rounded-lg p-6 neon-border-glow">
              <div className="flex items-center space-x-4">
                <Database className="w-8 h-8 text-orange-400" />
                <div>
                  <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">CONTRACTS</p>
                  <p className="text-xl font-bold text-white font-mono">{getAllContracts().length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* RPC & Infrastructure */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* RPC Details */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Wifi className="w-6 h-6 neon-text-cyan" />
                <h3 className="text-lg font-bold neon-text-cyan font-mono">RPC.PROVIDER</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-mono text-white font-bold">ENDPOINT:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-gray-400 px-2 py-1">
                      {systemData?.rpcUrl ? `${systemData.rpcUrl.slice(0, 30)}...` : 'N/A'}
                    </span>
                    {systemData?.rpcUrl && (
                      <button
                        onClick={() => copyToClipboard(systemData.rpcUrl, 'rpc')}
                        className="p-1 hover:bg-cyan-500/10 rounded transition-colors"
                        title="Copy RPC URL"
                      >
                        <Copy className={`w-3.5 h-3.5 transition-colors ${
                          copiedAddress === 'rpc' ? 'text-green-400' : 'text-gray-500 hover:text-cyan-400'
                        }`} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-mono text-white font-bold">EXPLORER:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-gray-400 px-2 py-1">
                      {systemData?.explorerUrl ? `${systemData.explorerUrl.slice(0, 30)}...` : 'N/A'}
                    </span>
                    {systemData?.explorerUrl && (
                      <>
                        <button
                          onClick={() => copyToClipboard(systemData.explorerUrl, 'explorer')}
                          className="p-1 hover:bg-cyan-500/10 rounded transition-colors"
                          title="Copy Explorer URL"
                        >
                          <Copy className={`w-3.5 h-3.5 transition-colors ${
                            copiedAddress === 'explorer' ? 'text-green-400' : 'text-gray-500 hover:text-cyan-400'
                          }`} />
                        </button>
                        <button
                          onClick={() => window.open(systemData.explorerUrl, '_blank')}
                          className="p-1 hover:bg-cyan-500/10 rounded transition-colors"
                          title="Open Explorer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-gray-500 hover:text-cyan-400" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-mono text-white font-bold">STATUS:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-mono neon-text-green">ONLINE</span>
                  </div>
                </div>
              </div>
            </div>

      {/* Available Domains */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
            <Server className="w-6 h-6 neon-text-cyan" />
              <h3 className="text-lg font-bold neon-text-cyan font-mono">AVAILABLE.DOMAINS</h3>
              </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {systemData?.availableDomains.map(domain => (
                <div key={domain} className="text-center p-4 hover:bg-gray-700/30 transition-all">
                  <div className="text-2xl mb-2 text-white ">@</div>
                  <div className="font-bold text-white font-mono">@{domain}</div>
                  <div className="text-xs neon-text-green font-mono mt-1">ACTIVE</div>
                </div>
              ))}
            </div>
            </div>
          </div>

          {/* Token Contracts */}
          {getTokenContracts().length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <Database className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-bold text-yellow-400 font-mono">TOKEN.CONTRACTS</h3>
                <span className="text-xs text-yellow-400 font-mono px-2 py-1 bg-yellow-500/10 rounded">ERC20</span>
              </div>
              <div className="text-xs text-gray-400 font-mono mb-4">
                ERC20 utility tokens used for staking, rewards, and governance.
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {getTokenContracts().map(contract => (
                  <div key={contract.name} className="p-4 bg-yellow-500/5 border border-yellow-500/20 hover:bg-yellow-500/10 transition-all">
                    <div className="flex items-start space-x-4">
                      <div className="text-2xl">{contract.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white font-mono text-sm">{contract.name}</div>
                        <div className="text-xs text-gray-400 font-mono mt-1">{contract.description}</div>
                        <div className="flex items-center space-x-2 mt-2">
                          <div className="text-xs font-mono text-gray-400 px-2 py-1 bg-gray-700/50 flex-1 break-all">
                            {contract.address}
                          </div>
                          <button
                            onClick={() => copyToClipboard(contract.address, contract.name)}
                            className="p-1 hover:bg-yellow-500/10 rounded transition-colors flex-shrink-0"
                            title="Copy Address"
                          >
                            <Copy className={`w-3.5 h-3.5 transition-colors ${
                              copiedAddress === contract.name ? 'text-green-400' : 'text-gray-500 hover:text-yellow-400'
                            }`} />
                          </button>
                          <button
                            onClick={() => openInExplorer(contract.address)}
                            className="p-1 hover:bg-yellow-500/10 rounded transition-colors flex-shrink-0"
                            title="View on Explorer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-gray-500 hover:text-yellow-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Storage Contracts (Eternal) */}
          <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <HardDrive className="w-6 h-6 neon-text-magenta" />
              <h3 className="text-lg font-bold neon-text-magenta font-mono">STORAGE.CONTRACTS</h3>
              <span className="text-xs neon-text-magenta font-mono px-2 py-1 bg-purple-500/10 rounded">ETERNAL - RELINQUISHED</span>
            </div>
            <div className="text-xs text-gray-400 font-mono mb-4">
              These contracts store all data and are deployed once. Logic contracts can be upgraded without losing data.
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {getStorageContracts().map(contract => (
                <div key={contract.name} className="p-4 bg-purple-500/5 border border-purple-500/20 hover:bg-purple-500/10 transition-all">
                  <div className="flex items-start space-x-4">
                    <div className="text-2xl">{contract.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white font-mono text-sm">{contract.name}</div>
                      <div className="text-xs text-gray-400 font-mono mt-1">{contract.description}</div>
                      <div className="flex items-center space-x-2 mt-2">
                        <div className="text-xs font-mono text-gray-400 px-2 py-1 bg-gray-700/50 flex-1 break-all">
                          {contract.address}
                        </div>
                        <button
                          onClick={() => copyToClipboard(contract.address, contract.name)}
                          className="p-1 hover:bg-purple-500/10 rounded transition-colors flex-shrink-0"
                          title="Copy Address"
                        >
                          <Copy className={`w-3.5 h-3.5 transition-colors ${
                            copiedAddress === contract.name ? 'text-green-400' : 'text-gray-500 hover:text-purple-400'
                          }`} />
                        </button>
                        <button
                          onClick={() => openInExplorer(contract.address)}
                          className="p-1 hover:bg-purple-500/10 rounded transition-colors flex-shrink-0"
                          title="View on Explorer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-gray-500 hover:text-purple-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logic Contracts (Upgradeable) */}
          <div className="bg-gray-800/50 rounded-lg p-6 mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <Database className="w-6 h-6 neon-text-cyan" />
              <h3 className="text-lg font-bold neon-text-cyan font-mono">LOGIC.CONTRACTS</h3>
              <span className="text-xs neon-text-cyan font-mono px-2 py-1 bg-cyan-500/10 rounded">UPGRADEABLE</span>
            </div>
            <div className="text-xs text-gray-400 font-mono mb-4">
              These contracts contain business logic and can be upgraded or forked by deploying new versions without losing data.
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {getLogicContracts().map(contract => (
                <div key={contract.name} className="p-4 bg-cyan-500/5 border border-cyan-500/20 hover:bg-cyan-500/10 transition-all">
                  <div className="flex items-start space-x-4">
                    <div className="text-2xl">{contract.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white font-mono text-sm">{contract.name}</div>
                      <div className="text-xs text-gray-400 font-mono mt-1">{contract.description}</div>
                      <div className="flex items-center space-x-2 mt-2">
                        <div className="text-xs font-mono text-gray-400 px-2 py-1 bg-gray-700/50 flex-1 break-all">
                          {contract.address}
                        </div>
                        <button
                          onClick={() => copyToClipboard(contract.address, contract.name)}
                          className="p-1 hover:bg-cyan-500/10 rounded transition-colors flex-shrink-0"
                          title="Copy Address"
                        >
                          <Copy className={`w-3.5 h-3.5 transition-colors ${
                            copiedAddress === contract.name ? 'text-green-400' : 'text-gray-500 hover:text-cyan-400'
                          }`} />
                        </button>
                        <button
                          onClick={() => openInExplorer(contract.address)}
                          className="p-1 hover:bg-cyan-500/10 rounded transition-colors flex-shrink-0"
                          title="View on Explorer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-gray-500 hover:text-cyan-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Architecture */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Activity className="w-6 h-6 neon-text-cyan" />
              <h3 className="text-lg font-bold neon-text-cyan font-mono">SYSTEM.ARCHITECTURE</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Shield className="w-5 h-5 neon-text-cyan" />
                  <h4 className="font-bold text-white font-mono text-sm">ENCRYPTION</h4>
                </div>
                <ul className="text-xs text-gray-400 font-mono space-y-1">
                  <li>• AES-256-GCM authenticated encryption</li>
                  <li>• ECDH P-256 key exchange</li>
                  <li>• Deterministic key generation</li>
                  <li>• PIN-based mailbox isolation</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Database className="w-5 h-5 neon-text-cyan" />
                  <h4 className="font-bold text-white font-mono text-sm">STORAGE</h4>
                </div>
                <ul className="text-xs text-gray-400 font-mono space-y-1">
                  <li>• Eternal storage architecture</li>
                  <li>• Upgradeable logic contracts</li>
                  <li>• IPFS encrypted content</li>
                  <li>• 28-37% gas optimized</li>
                </ul>
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Zap className="w-5 h-5 neon-text-cyan" />
                  <h4 className="font-bold text-white font-mono text-sm">FEATURES</h4>
                </div>
                <ul className="text-xs text-gray-400 font-mono space-y-1">
                  <li>• Email-style addressing</li>
                  <li>• Multi-mailbox support</li>
                  <li>• Account abstraction</li>
                  <li>• Guild system with NFTs</li>
                </ul>
              </div>
            </div>
          </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="text-xs text-white font-mono font-bold">
            HASHD.SYSTEM.v4.0.0 | DECENTRALIZED.COMMUNICATION.PROTOCOL
          </div>
          <div className="text-xs text-gray-400 font-mono mt-2">
            STAY.UNCENSORED | PRIVACY.FIRST | BLOCKCHAIN.NATIVE
          </div>
        </div>
      </div>

    </div>
  );
};
