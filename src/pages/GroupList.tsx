import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { Users, TrendingUp, Plus, Search, ExternalLink, UserPlus, UserMinus, Copy, Info } from 'lucide-react';
import { contractService, GROUP_FACTORY_ABI, USER_PROFILE_ABI } from '../utils/contracts';
import { LoadingState } from '../components/Spinner';
import { PageHeader } from '../components/PageHeader';
import { TabBar, Tab } from '../components/TabBar';
import { Tooltip, RoyaltyTooltip } from '../components/Tooltip';
import { useNotify } from '../components/Toast';
import { GuildImage } from '../components/GuildImage';
import { bytes32ToHashdUrl } from '../utils/cid';

const GROUP_FACTORY_ADDRESS = process.env.REACT_APP_GROUP_FACTORY || '';
const USER_PROFILE_ADDRESS = process.env.REACT_APP_USER_PROFILE || '';
const EXPLORER_URL = process.env.REACT_APP_EXPLORER_URL || '';


interface Group {
  title: string;
  description: string;
  avatarCID: string;
  headerCID: string;
  imageURI: string; // Computed from avatarCID
  owner: string;
  tokenAddress: string;
  nftAddress: string;
  postsAddress: string;
  index: number;
  isJoined?: boolean;
  memberCount?: number;
  tokenSymbol?: string;
}

interface CopyState {
  [key: string]: boolean;
}

interface GroupListProps {
  refreshTrigger?: number;
  onCreateClick?: () => void;
  onGroupClick?: (groupIndex: number) => void;
  userAddress?: string;
}

export const GroupList: React.FC<GroupListProps> = ({ refreshTrigger, onCreateClick, onGroupClick, userAddress }) => {
  const navigate = useNavigate();
  const notify = useNotify();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'joined'>('all');
  const [joinedGroupAddresses, setJoinedGroupAddresses] = useState<Set<string>>(new Set());
  const [joiningGroups, setJoiningGroups] = useState<Set<string>>(new Set());
  const [copiedAddresses, setCopiedAddresses] = useState<CopyState>({});

  useEffect(() => {
    loadGroups();
  }, [refreshTrigger]);

  const loadGroups = async () => {
    const overallStart = Date.now();
    let rpcCallCount = 0;
    
    try {
      console.log('🔄 [GroupList] Starting guild list load...');
      setIsLoading(true);
      setError('');

      if (!GROUP_FACTORY_ADDRESS) {
        throw new Error('GroupFactory address not configured. Please restart the development server.');
      }

      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      let stepStart = Date.now();
      // Use fast read-only provider from contractService
      const { contractService } = await import('../utils/contracts');
      const provider = contractService.getReadProvider();
      const factory = new ethers.Contract(GROUP_FACTORY_ADDRESS, GROUP_FACTORY_ABI, provider);

      console.log('🔄 [GroupList] Getting group count...');
      const length = await factory.allGroupsLength();
      rpcCallCount++; // 1 call
      const groupCount = Number(length);
      console.log(`✅ [GroupList] Found ${groupCount} guilds (${Date.now() - stepStart}ms)`);

      if (groupCount === 0) {
        setGroups([]);
        console.log(`✅ [GroupList] Load complete in ${Date.now() - overallStart}ms (${rpcCallCount} RPC calls)`);
        return;
      }

      // PARALLELIZE: Load all groups at once instead of sequentially
      stepStart = Date.now();
      console.log(`🔄 [GroupList] Loading ${groupCount} guilds in parallel...`);
      const groupPromises = [];
      for (let i = 0; i < groupCount; i++) {
        groupPromises.push(factory.allGroups(i));
      }
      
      const groupResults = await Promise.all(groupPromises);
      rpcCallCount += groupCount; // N parallel calls
      console.log(`✅ [GroupList] Loaded ${groupCount} guilds in ${Date.now() - stepStart}ms (${groupCount} parallel RPC calls)`);
      
      const loadedGroups: Group[] = groupResults.map((group, i) => ({
        title: group.title,
        description: group.description,
        avatarCID: group.avatarCID,
        headerCID: group.headerCID,
        imageURI: bytes32ToHashdUrl(group.avatarCID), // Convert bytes32 to hashd:// URL
        owner: group.owner,
        tokenAddress: group.tokenAddress,
        nftAddress: group.nftAddress,
        postsAddress: group.postsAddress,
        index: i
      }));

      const reversedGroups = loadedGroups.reverse(); // Show newest first
      setGroups(reversedGroups);
      
      // Load token symbols for all groups
      stepStart = Date.now();
      console.log('🔄 [GroupList] Loading token symbols...');
      await loadTokenSymbols(reversedGroups);
      console.log(`✅ [GroupList] Token symbols loaded in ${Date.now() - stepStart}ms`);
      rpcCallCount += reversedGroups.length; // 1 call per token
      
      // Load member counts and joined status if user is connected
      if (userAddress && USER_PROFILE_ADDRESS) {
        stepStart = Date.now();
        console.log('🔄 [GroupList] Loading membership data...');
        await loadMemberCountsAndJoinedStatus(reversedGroups);
        console.log(`✅ [GroupList] Membership data loaded in ${Date.now() - stepStart}ms`);
        rpcCallCount += 1 + reversedGroups.length; // 1 batch membership call + individual count calls
      }
      
      const totalTime = Date.now() - overallStart;
      console.log(`✅ [GroupList] Complete load in ${totalTime}ms`);
      console.log(`📊 [GroupList] Total RPC calls: ${rpcCallCount}`);
      console.log(`⚡ [GroupList] Average time per call: ${(totalTime / rpcCallCount).toFixed(0)}ms`);
    } catch (err: any) {
      console.error('❌ [GroupList] Error loading guilds:', err);
      setError(err.message || 'Failed to load guilds');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTokenSymbols = async (groupList: Group[]) => {
    try {
      const { contractService } = await import('../utils/contracts');
      const provider = contractService.getReadProvider();
      
      // Load token symbols in parallel
      const symbolPromises = groupList.map(async (group) => {
        try {
          const tokenContract = new ethers.Contract(
            group.tokenAddress,
            ['function symbol() view returns (string)'],
            provider
          );
          return await tokenContract.symbol();
        } catch (err) {
          console.warn(`Failed to load symbol for ${group.tokenAddress}:`, err);
          return 'TKN'; // fallback
        }
      });
      
      const symbols = await Promise.all(symbolPromises);
      
      // Update groups with token symbols
      const updatedGroups = groupList.map((group, index) => ({
        ...group,
        tokenSymbol: symbols[index]
      }));
      
      setGroups(updatedGroups);
    } catch (err) {
      console.error('Error loading token symbols:', err);
    }
  };

  const loadMemberCountsAndJoinedStatus = async (groupList: Group[]) => {
    if (!userAddress || !USER_PROFILE_ADDRESS || !window.ethereum) return;
    
    try {
      // Use fast read-only provider
      const { contractService } = await import('../utils/contracts');
      const provider = contractService.getReadProvider();
      const userProfile = new ethers.Contract(USER_PROFILE_ADDRESS, USER_PROFILE_ABI, provider);
      
      // Extract all group token addresses
      const groupTokens = groupList.map(g => g.tokenAddress);
      
      if (groupTokens.length === 0) {
        return;
      }
      
      // Batch check membership and get member counts
      const [membershipStatuses, ...memberCountResults] = await Promise.all([
        userProfile.batchHasJoinedGroup(userAddress, groupTokens),
        ...groupTokens.map(token => userProfile.getGroupMemberCount(token))
      ]);
      
      const memberCounts = memberCountResults;
      
      // Build set of joined groups
      const joined = new Set<string>();
      
      // Update groups with membership and count data using current state
      setGroups(currentGroups => {
        const updatedGroups = currentGroups.map((group) => {
          const groupIndex = groupTokens.findIndex(addr => addr.toLowerCase() === group.tokenAddress.toLowerCase());
          if (groupIndex === -1) return group;
          
          const isMember = membershipStatuses[groupIndex];
          if (isMember) {
            joined.add(group.tokenAddress.toLowerCase());
          }
          
          return {
            ...group,
            isJoined: isMember,
            memberCount: Number(memberCounts[groupIndex])
          };
        });
        
        return updatedGroups;
      });
      
      // Update joined addresses after groups are updated
      setJoinedGroupAddresses(joined);
    } catch (err) {
      console.error('Error loading member data:', err);
    }
  };

  const handleJoinGroup = async (groupToken: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!userAddress || !USER_PROFILE_ADDRESS || !window.ethereum) return;
    
    setJoiningGroups(prev => new Set(prev).add(groupToken));
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const userProfile = new ethers.Contract(USER_PROFILE_ADDRESS, USER_PROFILE_ABI, signer);
    
    try {
      const tx = await userProfile.joinGroup(groupToken);
      await tx.wait();
      
      // Update local state
      setJoinedGroupAddresses(prev => new Set(prev).add(groupToken.toLowerCase()));
      setGroups(prev => prev.map(g => 
        g.tokenAddress.toLowerCase() === groupToken.toLowerCase()
          ? { ...g, isJoined: true, memberCount: (g.memberCount || 0) + 1 }
          : g
      ));
    } catch (err: any) {
      console.error('Error joining group:', err);
      
      // Handle "already known" error (transaction already in mempool)
      const errorMessage = err.message || err.toString();
      if (errorMessage.includes('already known') || errorMessage.includes('nonce')) {
        console.log('Transaction already submitted, checking membership...');
        // Check if user is actually a member now
        try {
          const address = await signer.getAddress();
          const isMember = await userProfile.isMember(address, groupToken);
          if (isMember) {
            console.log('✅ User is already a member, updating UI...');
            // Update local state
            setJoinedGroupAddresses(prev => new Set(prev).add(groupToken.toLowerCase()));
            setGroups(prev => prev.map(g => 
              g.tokenAddress.toLowerCase() === groupToken.toLowerCase()
                ? { ...g, isJoined: true, memberCount: (g.memberCount || 0) + 1 }
                : g
            ));
            return;
          }
        } catch (checkErr) {
          console.error('Error checking membership:', checkErr);
        }
      }
      
      // Handle "already joined" error
      if (errorMessage.includes('Already joined') || errorMessage.includes('already a member')) {
        console.log('✅ Already a member, updating UI...');
        setJoinedGroupAddresses(prev => new Set(prev).add(groupToken.toLowerCase()));
        setGroups(prev => prev.map(g => 
          g.tokenAddress.toLowerCase() === groupToken.toLowerCase()
            ? { ...g, isJoined: true, memberCount: (g.memberCount || 0) + 1 }
            : g
        ));
        return;
      }
      
      notify.error(err.message || 'Failed to join guild');
    } finally {
      setJoiningGroups(prev => {
        const next = new Set(prev);
        next.delete(groupToken);
        return next;
      });
    }
  };

  const handleLeaveGroup = async (groupToken: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!userAddress || !USER_PROFILE_ADDRESS || !window.ethereum) return;
    
    setJoiningGroups(prev => new Set(prev).add(groupToken));
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userProfile = new ethers.Contract(USER_PROFILE_ADDRESS, USER_PROFILE_ABI, signer);
      
      const tx = await userProfile.leaveGroup(groupToken);
      await tx.wait();
      
      // Update local state
      setJoinedGroupAddresses(prev => {
        const next = new Set(prev);
        next.delete(groupToken.toLowerCase());
        return next;
      });
      setGroups(prev => prev.map(g => 
        g.tokenAddress.toLowerCase() === groupToken.toLowerCase()
          ? { ...g, isJoined: false, memberCount: Math.max((g.memberCount || 0) - 1, 0) }
          : g
      ));
    } catch (err: any) {
      console.error('Error leaving group:', err);
      notify.error(err.message || 'Failed to leave guild');
    } finally {
      setJoiningGroups(prev => {
        const next = new Set(prev);
        next.delete(groupToken);
        return next;
      });
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddresses(prev => ({ ...prev, [type]: true }));
    setTimeout(() => {
      setCopiedAddresses(prev => ({ ...prev, [type]: false }));
    }, 2000);
  };

  const openInExplorer = (address: string) => {
    window.open(`${EXPLORER_URL}/address/${address}`, '_blank');
  };

  const filteredGroups = activeTab === 'joined' 
    ? groups.filter(g => {
        console.log(`[GroupList] Filtering group ${g.title}: isJoined=${g.isJoined}, tokenAddress=${g.tokenAddress}`);
        return g.isJoined;
      })
    : groups;

  // Debug logging
  console.log(`[GroupList] Active tab: ${activeTab}, Total groups: ${groups.length}, Filtered groups: ${filteredGroups.length}`);
  console.log(`[GroupList] Joined addresses:`, Array.from(joinedGroupAddresses));

  if (isLoading) {
    return <LoadingState message="Loading guilds..." />;
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        icon={Users}
        title="GUILDS"
        subtitle={
          <>
            DISCOVER.AND.JOIN.COMMUNITIES
            {groups.length > 0 && <span className="text-cyan-400/70 ml-2">({groups.length})</span>}
          </>
        }
        rightContent={
          <button
            onClick={onCreateClick}
            className="cyber-button relative w-full flex items-center justify-center gap-2 px-4 py-3 text-sm overflow-hidden"
          >
            <Plus className="w-4 h-4" />
            Create Guild
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {!error && groups.length === 0 && (
          <div className="text-center py-12 cyber-card relative">
            <div className="text-cyan-400/50 mb-4">
              <Users className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold neon-text-cyan mb-2">No guilds yet</h3>
            <p className="text-gray-400 mb-4">Be the first to create a guild!</p>
            <button
              onClick={onCreateClick}
              className="cyber-button relative inline-flex items-center gap-2 px-6 py-3 overflow-hidden"
            >
              <Plus className="w-5 h-5" />
              Create Your First Guild
            </button>
          </div>
        )}

        {!error && groups.length > 0 && (
          <>
        <TabBar
          tabs={[
            { id: 'all', label: 'Featured', icon: TrendingUp },
            { id: 'joined', label: 'Joined', icon: Users, badge: joinedGroupAddresses.size }
          ]}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as 'all' | 'joined')}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredGroups.map((group) => (
          <div
            key={group.index}
            onClick={() => {
              if (onGroupClick) {
                onGroupClick(group.index);
              } else {
                navigate(`/guild/${group.tokenAddress}`);
              }
            }}
            className="cyber-card bg-gray-800/50 relative overflow-hidden cursor-pointer transition-all group"
          >
            {/* Compact Group Image */}
            <div className="h-32 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
              <GuildImage
                imageURI={group.imageURI}
                alt={group.title}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
              
              {/* Member count overlay */}
              {group.memberCount !== undefined && (
                <div className="absolute top-2 right-2 bg-gray-900/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                  <Users className="w-3 h-3 text-cyan-400" />
                  <span className="text-xs text-cyan-400 font-mono">{group.memberCount}</span>
                </div>
              )}
            </div>

            {/* Compact Group Info */}
            <div className="p-3">
              <h3 className="text-sm font-bold neon-text-cyan mb-1 tracking-wide truncate">{group.title}</h3>
              <p className="text-xs text-gray-400 mb-3 line-clamp-2 leading-relaxed">{group.description}</p>

              {/* Owner */}
              <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mb-3">
                <Users className="w-3 h-3 text-cyan-400/50" />
                <span className="truncate">{shortenAddress(group.owner)}</span>
              </div>

              {/* Join/Leave Button */}
              {userAddress && USER_PROFILE_ADDRESS && (
                <div className="mb-3">
                  {group.isJoined ? (
                    <button
                      onClick={(e) => handleLeaveGroup(group.tokenAddress, e)}
                      disabled={joiningGroups.has(group.tokenAddress)}
                      className="w-full flex items-center justify-center gap-1 bg-gray-800/50 border border-red-500/30 text-red-400 px-3 py-1.5 rounded text-xs font-medium hover:bg-red-900/20 hover:border-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                    >
                      <UserMinus className="w-3 h-3" />
                      {joiningGroups.has(group.tokenAddress) ? 'Leaving...' : 'Leave'}
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleJoinGroup(group.tokenAddress, e)}
                      disabled={joiningGroups.has(group.tokenAddress)}
                      className="cyber-button w-full relative flex items-center justify-center gap-1 px-3 py-1.5 text-xs overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserPlus className="w-3 h-3" />
                      {joiningGroups.has(group.tokenAddress) ? 'Joining...' : 'Join Guild'}
                    </button>
                  )}
                </div>
              )}

              {/* Compact Contracts */}
              <div className="space-y-1.5 pt-2 border-t border-cyan-500/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium uppercase tracking-wider text-xs">${group.tokenSymbol || 'TKN'}:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-cyan-400 font-mono text-xs">{shortenAddress(group.tokenAddress)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(group.tokenAddress, `token-${group.index}`);
                      }}
                      className="p-0.5 hover:bg-cyan-500/10 rounded transition-colors"
                      title="Copy Token Address"
                    >
                      <Copy className={`w-3 h-3 transition-colors ${
                        copiedAddresses[`token-${group.index}`] ? 'text-green-400' : 'text-gray-500 hover:text-cyan-400'
                      }`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInExplorer(group.tokenAddress);
                      }}
                      className="p-0.5 hover:bg-cyan-500/10 rounded transition-colors"
                      title="View on Explorer"
                    >
                      <ExternalLink className="w-3 h-3 text-gray-500 hover:text-cyan-400" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 font-medium uppercase tracking-wider text-xs">NFT:</span>
                    <RoyaltyTooltip>
                      <Info className="w-3 h-3 text-cyan-400/60 hover:text-cyan-400 cursor-help" />
                    </RoyaltyTooltip>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-cyan-400 font-mono text-xs">{shortenAddress(group.nftAddress)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(group.nftAddress, `nft-${group.index}`);
                      }}
                      className="p-0.5 hover:bg-cyan-500/10 rounded transition-colors"
                      title="Copy NFT Address"
                    >
                      <Copy className={`w-3 h-3 transition-colors ${
                        copiedAddresses[`nft-${group.index}`] ? 'text-green-400' : 'text-gray-500 hover:text-cyan-400'
                      }`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInExplorer(group.nftAddress);
                      }}
                      className="p-0.5 hover:bg-cyan-500/10 rounded transition-colors"
                      title="View on Explorer"
                    >
                      <ExternalLink className="w-3 h-3 text-gray-500 hover:text-cyan-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>
          </>
        )}
      </div>
    </div>
  );
};
