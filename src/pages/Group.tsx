import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { Users, ExternalLink, MessageSquare, Info, Coins, Image, TrendingUp } from 'lucide-react';
import { useCurrentHashId } from '../hooks/useCurrentHashId';
import PostsFeed from '../components/PostsFeed';
import { QuickActions } from '../components/QuickActions';
import { SuggestedGroups } from '../components/SuggestedGroups';
import { TabBar, Tab } from '../components/TabBar';
import { DistributeTokenModal } from '../components/modals/DistributeTokenModal';
import { ClaimAirdropModal } from '../components/modals/ClaimAirdropModal';
import { CreatePostModal } from '../components/modals/CreatePostModal';
import { BuyNFTModal } from '../components/modals/BuyNFTModal';
import { GiftNFTModal } from '../components/modals/GiftNFTModal';
import { EditGroupInfoModal } from '../components/modals/EditGroupInfoModal';
import { AirdropRecipient } from '../utils/merkleTree';
import { deriveGroupKey } from '../services/ipfs/groupPosts';
import { contractService, NETWORK_CONFIG, GROUP_FACTORY_ABI, ERC20_ABI, ERC721_ABI, USER_PROFILE_ABI, GROUP_POSTS_ABI } from '../utils/contracts';
import { LoadingState } from '../components/Spinner';
import { extractColorFromImageElement } from '../utils/colorExtractor';
import { useNotify } from '../components/Toast';
import { GuildImage } from '../components/GuildImage';
import { bytes32ToCid } from '../utils/contracts';

const GROUP_FACTORY_ADDRESS = process.env.REACT_APP_GROUP_FACTORY || '';
const USER_PROFILE_ADDRESS = process.env.REACT_APP_USER_PROFILE || '';
const EXPLORER_URL = process.env.REACT_APP_EXPLORER_URL || '';

interface NFTHolder {
  tokenId: number;
  owner: string;
  tokenURI: string;
  metadata?: {
    name: string;
    description: string;
    image: string;
  };
}

interface GroupData {
  title: string;
  description: string;
  imageURI: string; // Avatar image
  headerImageURI: string; // Header banner image
  owner: string;
  tokenAddress: string;
  nftAddress: string;
  postsAddress: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenSupply?: string;
  nftName?: string;
  nftSymbol?: string;
  nftMinted?: number;
  nftMax?: number;
  nftPrice?: string;
}

export const Group: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const notify = useNotify();
  const [groupIndex, setGroupIndex] = useState<number | null>(null);
  const [group, setGroup] = useState<GroupData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<string>('posts');
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [nftHolders, setNftHolders] = useState<NFTHolder[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [isJoining, setIsJoining] = useState(false);
  const [userNFTBalance, setUserNFTBalance] = useState(0);
  const [userTokenBalance, setUserTokenBalance] = useState(0);
  const [distributionSet, setDistributionSet] = useState(false);
  const avatarImgRef = React.useRef<HTMLImageElement>(null);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [postCount, setPostCount] = useState(0);
  const { hashIdToken } = useCurrentHashId(userAddress);

  useEffect(() => {
    findGroupIndexByAddress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  useEffect(() => {
    if (groupIndex !== null) {
      loadGroupData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex]);


  const findGroupIndexByAddress = async () => {
    try {
      if (!address) {
        setError('Invalid address');
        setIsLoading(false);
        return;
      }

      // Use fast read-only provider
      const provider = contractService.getReadProvider();
      const factory = new ethers.Contract(GROUP_FACTORY_ADDRESS, GROUP_FACTORY_ABI, provider);

      const length = await factory.allGroupsLength();
      const groupCount = Number(length);

      for (let i = 0; i < groupCount; i++) {
        const groupInfo = await factory.allGroups(i);
        if (groupInfo.tokenAddress.toLowerCase() === address.toLowerCase()) {
          setGroupIndex(i);
          return;
        }
      }

      setError('Guild not found');
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error finding guild:', err);
      setError(err.message || 'Failed to load guild');
      setIsLoading(false);
    }
  };

  const loadGroupData = async () => {
    try {
      setIsLoading(true);
      setError('');

      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      // Use fast read-only provider instead of MetaMask
      const provider = contractService.getReadProvider();
      const factory = new ethers.Contract(GROUP_FACTORY_ADDRESS, GROUP_FACTORY_ABI, provider);

      const groupInfo = await factory.allGroups(groupIndex);
      
      const tokenContract = new ethers.Contract(groupInfo.tokenAddress, ERC20_ABI, provider);
      const nftContract = new ethers.Contract(groupInfo.nftAddress, ERC721_ABI, provider);
      const postsContract = new ethers.Contract(groupInfo.postsAddress, GROUP_POSTS_ABI, provider);
      
      // Get user address synchronously from MetaMask (fast, no RPC call)
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const userAddr = accounts[0];
      
      // If no accounts, user might have disconnected - don't throw error, just continue without user data
      if (!userAddr) {
        console.warn('No wallet connected, loading group data without user info');
      }
      
      // Check if posts contract exists
      const postsCode = await provider.getCode(groupInfo.postsAddress);
      if (postsCode === '0x') {
        console.warn(`Posts contract not found at ${groupInfo.postsAddress}`);
      }

      // Parallelize ALL contract calls
      const [
        code,
        tokenName,
        tokenSymbol,
        tokenSupply,
        nftName,
        nftSymbol,
        nftMinted,
        nftMax,
        nftPrice,
        nftOwner,
        totalPosts
      ] = await Promise.all([
        provider.getCode(groupInfo.tokenAddress),
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.totalSupply(),
        nftContract.name(),
        nftContract.symbol(),
        nftContract.nextTokenId(),
        nftContract.MAX_NFTS(),
        nftContract.nftPrice(),
        nftContract.owner(),
        // Add error handling for postCount call
        postsContract.postCount().catch((err: any) => {
          console.error('Error calling postCount:', err);
          console.log('Posts contract address:', groupInfo.postsAddress);
          console.log('Posts contract code exists:', postsCode !== '0x');
          return 0; // Default to 0 if call fails
        })
      ]);
      
      if (code === '0x') {
        throw new Error(`Token contract not found at ${groupInfo.tokenAddress}. This group may have been created with old contracts.`);
      }
      
      setUserAddress(userAddr || '');
      setIsOwner(userAddr ? userAddr.toLowerCase() === nftOwner.toLowerCase() : false);
      setPostCount(Number(totalPosts));
      
      // Only fetch user-specific data if we have a user address
      if (userAddr) {
        const [nftBalance, tokenBalance, merkleRoot] = await Promise.all([
          nftContract.balanceOf(userAddr),
          tokenContract.balanceOf(userAddr),
          tokenContract.merkleRoot()
        ]);
        setUserNFTBalance(Number(nftBalance));
        setUserTokenBalance(Number(tokenBalance));
        setDistributionSet(merkleRoot !== ethers.ZeroHash);
      } else {
        // No user connected, set defaults
        setUserNFTBalance(0);
        setUserTokenBalance(0);
        const merkleRoot = await tokenContract.merkleRoot();
        setDistributionSet(merkleRoot !== ethers.ZeroHash);
      }

      const avatarCid = bytes32ToCid(groupInfo.avatarCID);
      const headerCid = bytes32ToCid(groupInfo.headerCID);
      
      console.log('[Group] Avatar CID:', groupInfo.avatarCID, '→', avatarCid);
      console.log('[Group] Header CID:', groupInfo.headerCID, '→', headerCid);
      console.log('[Group] Avatar URI:', avatarCid ? `hashd://${avatarCid}` : '(empty)');
      console.log('[Group] Header URI:', headerCid ? `hashd://${headerCid}` : '(empty)');
      
      setGroup({
        title: groupInfo.title,
        description: groupInfo.description,
        imageURI: avatarCid ? `hashd://${avatarCid}` : '',
        headerImageURI: headerCid ? `hashd://${headerCid}` : '',
        owner: groupInfo.owner,
        tokenAddress: groupInfo.tokenAddress,
        nftAddress: groupInfo.nftAddress,
        postsAddress: groupInfo.postsAddress,
        tokenName,
        tokenSymbol,
        tokenSupply: ethers.formatEther(tokenSupply),
        nftName,
        nftSymbol,
        nftMinted: Number(nftMinted),
        nftMax: Number(nftMax),
        nftPrice: ethers.formatEther(nftPrice)
      });

      // Load NFT holders and membership in background (don't block UI)
      Promise.all([
        loadNFTHolders(groupInfo.nftAddress, Number(nftMinted)),
        userAddr && USER_PROFILE_ADDRESS 
          ? loadMembershipData(groupInfo.tokenAddress, userAddr)
          : Promise.resolve()
      ]).catch(err => {
        console.error('Failed to load background data:', err);
      });
    } catch (err: any) {
      console.error('❌ Error loading guild:', err);
      setError(err.message || 'Failed to load guild');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembershipData = async (tokenAddress: string, userAddr: string) => {
    if (!USER_PROFILE_ADDRESS || !window.ethereum) {
      return;
    }
    
    try {
      // Use fast read provider for membership check
      const provider = contractService.getReadProvider();
      const userProfile = new ethers.Contract(USER_PROFILE_ADDRESS, USER_PROFILE_ABI, provider);
      
      // No timeout - let it take as long as it needs
      const [joined, count] = await Promise.all([
        userProfile.hasJoinedGroup(userAddr, tokenAddress),
        userProfile.getGroupMemberCount(tokenAddress)
      ]);
      
      setIsJoined(joined);
      setMemberCount(Number(count));
    } catch (err: any) {
      console.error('Error loading membership data:', err);
      // Set defaults on error
      setIsJoined(false);
      setMemberCount(0);
    }
  };

  const handleJoinGroup = async () => {
    if (!group || !userAddress || !USER_PROFILE_ADDRESS || !window.ethereum) return;
    
    setIsJoining(true);
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const userProfile = new ethers.Contract(USER_PROFILE_ADDRESS, USER_PROFILE_ABI, signer);
    
    try {
      const tx = await userProfile.joinGroup(group.tokenAddress);
      await tx.wait();
      
      // Update local state
      setIsJoined(true);
      setMemberCount(prev => prev + 1);
      
      // Reload the page to refresh all data
      window.location.reload();
    } catch (err: any) {
      console.error('Error joining group:', err);
      
      // Handle "already known" error (transaction already in mempool)
      const errorMessage = err.message || err.toString();
      if (errorMessage.includes('already known') || errorMessage.includes('nonce')) {
        console.log('Transaction already submitted, checking membership...');
        // Check if user is actually a member now
        try {
          const isMember = await userProfile.isMember(userAddress, group.tokenAddress);
          if (isMember) {
            console.log('✅ User is already a member, reloading...');
            window.location.reload();
            return;
          }
        } catch (checkErr) {
          console.error('Error checking membership:', checkErr);
        }
      }
      
      // Handle "already joined" error
      if (errorMessage.includes('Already joined') || errorMessage.includes('already a member')) {
        console.log('✅ Already a member, reloading...');
        window.location.reload();
        return;
      }
      
      notify.error(err.message || 'Failed to join guild');
      setIsJoining(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!group || !userAddress || !USER_PROFILE_ADDRESS || !window.ethereum) return;
    
    setIsJoining(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userProfile = new ethers.Contract(USER_PROFILE_ADDRESS, USER_PROFILE_ABI, signer);
      
      const tx = await userProfile.leaveGroup(group.tokenAddress);
      await tx.wait();
      
      // Update local state
      setIsJoined(false);
      setMemberCount(prev => Math.max(prev - 1, 0));
      
      // Reload the page to refresh all data
      window.location.reload();
    } catch (err: any) {
      console.error('Error leaving group:', err);
      notify.error(err.message || 'Failed to leave guild');
      setIsJoining(false);
    }
  };

  const handleDistributeTokens = async (
    merkleRoot: string,
    ownerPercentage: number,
    bondingCurvePercentage: number,
    recipients: AirdropRecipient[]
  ) => {
    if (!group || !window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(group.tokenAddress, ERC20_ABI, signer);

      const tx = await tokenContract.setDistribution(merkleRoot, ownerPercentage, bondingCurvePercentage);
      await tx.wait();

      notify.success('Distribution successful! Recipients can now claim their tokens.');
    } catch (err: any) {
      console.error('Distribution error:', err);
      throw new Error(err.message || 'Failed to set distribution');
    }
  };

  const handleClaimAirdrop = async (amount: string, proof: string[]) => {
    if (!group || !window.ethereum) return;

    try {
      console.log('🎁 Claiming airdrop...');
      console.log('📊 Amount:', amount);
      console.log('📊 Proof:', proof);
      console.log('📊 Proof length:', proof.length);
      console.log('📊 Proof array:', JSON.stringify(proof));
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(group.tokenAddress, ERC20_ABI, signer);

      const amountWei = ethers.parseEther(amount);
      console.log('📊 Amount in Wei:', amountWei.toString());
      
      const tx = await tokenContract.claimAirdrop(amountWei, proof);
      console.log('✅ Transaction sent:', tx.hash);
      await tx.wait();
      console.log('✅ Transaction confirmed');


    } catch (err: any) {
      console.error('❌ Claim error:', err);
      throw new Error(err.message || 'Failed to claim tokens');
    }
  };

  const loadNFTHolders = async (nftAddress: string, totalMinted: number) => {
    try {
      console.log(`📦 Loading ${totalMinted} NFT holders...`);
      if (!window.ethereum || totalMinted === 0) {
        console.log('⏭️ Skipping NFT holders (no NFTs minted)');
        return;
      }

      const startTime = Date.now();
      // Use fast read provider for NFT data
      const provider = contractService.getReadProvider();
      const nftContract = new ethers.Contract(nftAddress, ERC721_ABI, provider);

      // Batch fetch all NFTs in parallel for much faster loading
      const holderPromises: Promise<NFTHolder | null>[] = [];
      
      for (let tokenId = 1; tokenId <= totalMinted; tokenId++) {
        holderPromises.push(
          Promise.all([
            nftContract.ownerOf(tokenId),
            nftContract.tokenURI(tokenId)
          ])
          .then(async ([owner, tokenURI]) => {
            let metadata;
            try {
              // Parse metadata from tokenURI (data URI or IPFS)
              if (tokenURI.startsWith('data:application/json;base64,')) {
                const base64Data = tokenURI.split(',')[1];
                const jsonString = atob(base64Data);
                metadata = JSON.parse(jsonString);
              } else if (tokenURI.startsWith('ipfs://')) {
                const ipfsHash = tokenURI.replace('ipfs://', '');
                const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
                metadata = await response.json();
              }
            } catch (err) {
              console.error(`Error parsing metadata for NFT ${tokenId}:`, err);
            }
            
            return {
              tokenId,
              owner,
              tokenURI,
              metadata
            };
          })
          .catch(err => {
            console.error(`Error loading NFT ${tokenId}:`, err);
            return null;
          })
        );
      }

      const results = await Promise.all(holderPromises);
      const holders = results.filter((h): h is NFTHolder => h !== null);
      setNftHolders(holders);
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ Loaded ${holders.length} NFT holders in ${elapsed}ms`);
    } catch (err: any) {
      console.error('❌ Error loading NFT holders:', err);
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatNumber = (num: string) => {
    const n = parseFloat(num);
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
    return n.toFixed(2);
  };

  const handleBuyNFT = async () => {
    try {
      if (!window.ethereum || !group) {
        throw new Error('Wallet not connected or group not loaded');
      }
      
      console.log('🎫 Starting NFT purchase:', {
        nftAddress: group.nftAddress,
        nftPrice: group.nftPrice,
        priceWei: ethers.parseEther(group.nftPrice || '0').toString()
      });
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      console.log('Signer address:', signerAddress);
      
      const nftContract = new ethers.Contract(group.nftAddress, ERC721_ABI, signer);
      
      // Check contract state before attempting purchase
      const [nextTokenId, maxNFTs, nftPrice, owner, platformTreasury] = await Promise.all([
        nftContract.nextTokenId(),
        nftContract.MAX_NFTS(),
        nftContract.nftPrice(),
        nftContract.owner(),
        nftContract.platformTreasury()
      ]);
      
      console.log('NFT Contract State:', {
        nextTokenId: nextTokenId.toString(),
        maxNFTs: maxNFTs.toString(),
        nftPrice: ethers.formatEther(nftPrice),
        owner,
        platformTreasury
      });
      
      const priceWei = ethers.parseEther(group.nftPrice || '0');
      console.log('Calling purchaseNFT with value:', priceWei.toString());
      
      const tx = await nftContract.purchaseNFT({ value: priceWei });
      console.log('Transaction sent:', tx.hash);
      
      await tx.wait();
      console.log('Transaction confirmed');
      
      // The minted token ID is nextTokenId + 1 (contract increments before minting)
      const tokenId = Number(nextTokenId) + 1;
      console.log('Minted token ID:', tokenId);
      
      // Fetch the minted NFT metadata
      const tokenURI = await nftContract.tokenURI(tokenId);
      let metadata;
      try {
        if (tokenURI.startsWith('data:application/json;base64,')) {
          const base64Data = tokenURI.split(',')[1];
          const jsonString = atob(base64Data);
          metadata = JSON.parse(jsonString);
        } else if (tokenURI.startsWith('ipfs://')) {
          const ipfsHash = tokenURI.replace('ipfs://', '');
          const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
          metadata = await response.json();
        }
      } catch (err) {
        console.error('Error parsing NFT metadata:', err);
      }
      
      // Don't refresh data here - it causes page refresh and resets modal state
      // Data will be refreshed when modal closes
      
      return {
        tokenId,
        metadata
      };
    } catch (err: any) {
      console.error('Error buying NFT:', err);
      notify.error(err.message || 'Failed to purchase NFT');
      throw err;
    }
  };

  const handleGiftNFT = async (recipientAddress: string) => {
    try {
      if (!window.ethereum || !group) return;
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const nftContract = new ethers.Contract(group.nftAddress, ERC721_ABI, signer);
      
      const tx = await nftContract.giftNFT(recipientAddress);
      await tx.wait();
      
      setShowGiftModal(false);
      await loadGroupData(); // Refresh data including holders
    } catch (err: any) {
      console.error('Error gifting NFT:', err);
      notify.error(err.message || 'Failed to gift NFT');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen hex-grid gray-bg-900 flex items-center justify-center">
        <LoadingState message="Loading guild..." />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen hex-grid gray-bg-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Guild Not Found</h2>
          <p className="text-gray-400 mb-6">{error || 'The guild you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/')}
            className="cyber-button relative flex items-center gap-2 px-6 py-3 text-sm overflow-hidden mx-auto"
          >
            Back to Guilds
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen hex-grid bg-gray-900">
      {/* Twitter-style Header with Banner and Avatar */}
      <div className="relative">
        {/* Header Banner Image */}
        <div className="h-48 sm:h-64 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
          <GuildImage
            imageURI={group.headerImageURI || group.imageURI}
            alt={`${group.title} header`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-900/80" />
        </div>

        {/* Content Container - Overlaps banner */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative -mt-16 sm:-mt-20">
            <div className="flex items-end justify-between gap-4 mb-4">
              {/* Avatar - overlaps banner */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-900 overflow-hidden border-4 border-gray-900 shadow-xl">
                  <GuildImage
                    imageURI={group.imageURI}
                    alt={group.title}
                    className="w-full h-full object-cover"
                    fallbackIcon={<Users className="w-12 h-12 text-cyan-400/50" />}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex-shrink-0 flex items-center gap-2">
                {/* Edit Button (Owner Only) */}
                {isOwner && (
                  <button
                    onClick={() => setShowEditGroupModal(true)}
                    className="flex items-center gap-2 bg-gray-800/50 border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-cyan-900/20 hover:border-cyan-500/50 transition-all uppercase tracking-wider"
                  >
                    EDIT
                  </button>
                )}
                
                {/* Join/Leave Button */}
                {userAddress && USER_PROFILE_ADDRESS && (
                  <>
                    {isJoined ? (
                      <button
                        onClick={handleLeaveGroup}
                        disabled={isJoining}
                        className="flex items-center gap-2 bg-gray-800/50 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-900/20 hover:border-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                      >
                        <Users className="w-4 h-4" />
                        {isJoining ? 'Leaving...' : 'Leave'}
                      </button>
                    ) : (
                      <button
                        onClick={handleJoinGroup}
                        disabled={isJoining}
                        className="cyber-button relative flex items-center justify-center gap-2 px-6 py-2.5 text-sm overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Users className="w-4 h-4" />
                        {isJoining ? 'Joining...' : 'Join Guild'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Group Info */}
            <div className="pb-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-wide">{group.title}</h1>
              <p className="text-sm sm:text-base text-gray-400 mb-3">{group.description}</p>
              
              <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                <Users className="w-3 h-3 text-cyan-400/50" />
                <span>Created by {shortenAddress(group.owner)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-900/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <TabBar
            tabs={[
              { id: 'posts', label: 'Posts', icon: MessageSquare },
              { id: 'about', label: 'About', icon: Info },
              { id: 'token', label: 'Token', icon: Coins },
              { id: 'nfts', label: 'NFTs', icon: Image }
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">


          {/* Main Content - Center */}
          <div className="lg:col-span-9">
            {/* Keep PostsFeed mounted but hidden to preserve state */}
            <div style={{ display: activeTab === 'posts' ? 'block' : 'none' }}>
              <PostsFeed
                groupTokenAddress={group.tokenAddress}
                groupPostsAddress={group.postsAddress}
                groupKey={deriveGroupKey(group.tokenAddress)}
                userAddress={userAddress}
                hasNFT={userNFTBalance > 0}
                hasToken={userTokenBalance > 0}
                isGroupOwner={group.owner.toLowerCase() === userAddress.toLowerCase()}
                isMember={isJoined}
                contractService={contractService}
                refreshTrigger={postCount}
              />
            </div>

            {/* About Section */}
            <div style={{ display: activeTab === 'about' ? 'block' : 'none' }}>
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h2 className="text-xl font-bold neon-text-cyan mb-4 uppercase tracking-wider">About this Guild</h2>
                <p className="text-gray-400 leading-relaxed mb-6">{group.description}</p>
                
                <div className="border-t border-cyan-500/20 pt-6">
                  <h3 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wider">Guild Details</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-gray-500 uppercase tracking-wider text-sm">Owner</dt>
                      <dd className="font-mono text-sm">
                        <a
                          href={`${EXPLORER_URL}/address/${group.owner}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                        >
                          {shortenAddress(group.owner)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500 uppercase tracking-wider text-sm">Token Contract</dt>
                      <dd className="font-mono text-sm">
                        <a
                          href={`${EXPLORER_URL}/address/${group.tokenAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                        >
                          {shortenAddress(group.tokenAddress)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500 uppercase tracking-wider text-sm">NFT Contract</dt>
                      <dd className="font-mono text-sm">
                        <a
                          href={`${EXPLORER_URL}/address/${group.nftAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                        >
                          {shortenAddress(group.nftAddress)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            {activeTab === 'token' && (
              <div className="cyber-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 font-bold text-lg">
                    {group.tokenSymbol?.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold neon-text-cyan">{group.tokenName}</h2>
                    <p className="text-gray-400 font-mono">${group.tokenSymbol}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-cyan-500/5 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1 uppercase tracking-wider">Total Supply</div>
                    <div className="text-2xl font-bold text-cyan-400 font-mono">{formatNumber(group.tokenSupply || '0')}</div>
                  </div>
                  <div className="bg-cyan-500/5 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1 uppercase tracking-wider">Standard</div>
                    <div className="text-2xl font-bold text-cyan-400 font-mono">ERC20</div>
                  </div>
                </div>

                <div className="border-t border-cyan-500/20 pt-6">
                  <h3 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wider">Contract Address</h3>
                  <div className="flex items-center gap-2 bg-gray-900/50 rounded-lg p-3">
                    <code className="flex-1 text-sm font-mono text-cyan-400/80 truncate sm:truncate-none">
                      <span className="hidden sm:inline">{group.tokenAddress}</span>
                      <span className="sm:hidden">{shortenAddress(group.tokenAddress)}</span>
                    </code>
                    <a
                      href={`${EXPLORER_URL}/address/${group.tokenAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 flex-shrink-0 transition-colors"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>

                {/* Check Distribution Link */}
                {distributionSet && (
                  <div className="border-t border-cyan-500/20 pt-6 mt-6">
                    <button
                      onClick={() => setShowDistributeModal(true)}
                      className="w-full bg-cyan-500/10 hover:border-cyan-500/50 neon-text-cyan py-3 px-4 rounded-lg font-bold transition-all text-sm font-mono uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Check Distribution
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'nfts' && (
              <div className="cyber-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-lg">
                    {group.nftSymbol?.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold neon-text-cyan">{group.nftName}</h2>
                    <p className="text-gray-400 font-mono">{group.nftSymbol}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1 uppercase tracking-wider">Minted</div>
                    <div className="text-2xl font-bold text-cyan-400 font-mono">{group.nftMinted || 0}</div>
                  </div>
                  <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1 uppercase tracking-wider">Max Supply</div>
                    <div className="text-2xl font-bold text-cyan-400 font-mono">{group.nftMax || 100}</div>
                  </div>
                  <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1 uppercase tracking-wider">Standard</div>
                    <div className="text-2xl font-bold text-cyan-400 font-mono">ERC721</div>
                  </div>
                </div>

                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-cyan-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="font-semibold text-cyan-300 mb-1">Royalty Information</h4>
                      <p className="text-sm text-gray-400">
                        <strong>7.5% Total Royalty:</strong> 5% to creator, 2.5% to platform
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-cyan-500/20 pt-6">
                  <h3 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wider">Contract Address</h3>
                  <div className="flex items-center gap-2 bg-gray-900/50 border border-cyan-500/20 rounded-lg p-3">
                    <code className="flex-1 text-sm font-mono text-cyan-400/80 truncate sm:truncate-none">
                      <span className="hidden sm:inline">{group.nftAddress}</span>
                      <span className="sm:hidden">{shortenAddress(group.nftAddress)}</span>
                    </code>
                    <a
                      href={`${EXPLORER_URL}/address/${group.nftAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 flex-shrink-0 transition-colors"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>

                {/* Holders Section */}
                <div className="border-t border-cyan-500/20 pt-6 mt-6">
                  <h3 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wider">
                    Holders {nftHolders.length > 0 && `(${nftHolders.length})`}
                  </h3>
                  
                  {nftHolders.length === 0 ? (
                    <div className="text-center py-12 bg-gray-800/30 rounded-lg border-2 border-dashed border-cyan-500/20">
                      <svg className="w-16 h-16 mx-auto text-cyan-400/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <p className="text-gray-300 font-medium">No Genesis Keys minted yet</p>
                      <p className="text-sm text-gray-400 mt-1">Be the first to mint a Genesis Key!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {nftHolders.map((holder) => (
                        <div
                          key={holder.tokenId}
                          className="bg-gray-800/50 border border-cyan-500/20 rounded-lg overflow-hidden hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10 transition-all cursor-pointer group"
                        >
                          <div className="aspect-square bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
                            <GuildImage
                              imageURI={
                                holder.metadata?.image 
                                  ? holder.metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                                  : group.imageURI
                              }
                              alt={`${group.nftName} #${holder.tokenId}`}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                              <span className="text-cyan-300 font-bold text-sm">#{holder.tokenId}</span>
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="text-xs font-semibold text-cyan-100 mb-1">
                              {holder.metadata?.name || `${group.nftName} #${holder.tokenId}`}
                            </p>
                            <div className="flex items-center gap-1">
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <a
                                href={`${EXPLORER_URL}/address/${holder.owner}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-gray-400 hover:text-cyan-400 font-mono transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {shortenAddress(holder.owner)}
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Suggested Groups */}
          <div className="lg:col-span-3">

  
            <QuickActions
              isOwner={isOwner}
              isJoined={isJoined}
              distributionSet={distributionSet}
              onMintNFT={() => setShowBuyModal(true)}
              onGiftNFT={() => setShowGiftModal(true)}
              onDistribute={() => setShowDistributeModal(true)}
              onCheckAirdrop={() => setShowClaimModal(true)}
              onCreatePost={() => setShowCreatePostModal(true)}
              onEditGroupInfo={() => setShowEditGroupModal(true)}
              canPost={userNFTBalance > 0 || userTokenBalance > 0}
            />

          {/* Quick Stats */}
            <div className="flex flex-col gap-2 sm:gap-3 mt-6 w-full sm:w-auto sm:min-w-[240px]">
              <div className="flex gap-2 sm:gap-4">
                <div className="bg-cyan-500/5 rounded-lg p-2 sm:p-3 text-center flex-1">
                  <div className="text-base sm:text-lg font-bold text-cyan-400 break-words leading-tight font-mono"> <span>{memberCount}</span></div>
                  <div className="text-[9px] sm:text-[10px] text-cyan-400/70 mt-0.5 whitespace-nowrap uppercase tracking-wider">Member{memberCount !== 1 ? 's' : ''}</div>
                </div>
                <div className="bg-purple-500/5 rounded-lg p-2 sm:p-3 text-center flex-1">
                  <div className="text-base sm:text-lg font-bold text-purple-400 leading-tight font-mono">{postCount}</div>
                  <div className="text-[9px] sm:text-[10px] text-purple-400/70 mt-0.5 whitespace-nowrap uppercase tracking-wider">Posts</div>
                </div>
              </div>
          
            </div>


          </div>
        </div>
      </div>

      {/* Buy NFT Modal */}
      <BuyNFTModal
        isOpen={showBuyModal}
        nftPrice={group.nftPrice || '0'}
        nftName={group.nftName || 'Genesis Key'}
        groupImageURI={group.imageURI || ''}
        onClose={() => {
          setShowBuyModal(false);
          loadGroupData(); // Refresh data after modal closes
        }}
        onBuy={handleBuyNFT}
      />

      {/* Gift NFT Modal */}
      <GiftNFTModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        onGift={handleGiftNFT}
      />

      {/* Edit Group Info Modal */}
      {showEditGroupModal && group && (
        <EditGroupInfoModal
          isOpen={showEditGroupModal}
          onClose={() => setShowEditGroupModal(false)}
          tokenAddress={group.tokenAddress}
          currentInfo={{
            title: group.title || '',
            description: group.description || '',
            imageURI: group.imageURI || '',
            headerImageURI: group.headerImageURI || ''
          }}
          hashIdToken={hashIdToken}
          onUpdate={() => {
            setShowEditGroupModal(false);
            loadGroupData();
          }}
        />
      )}

      {/* Distribute Token Modal */}
      {showDistributeModal && group && (
        <DistributeTokenModal
          isOpen={showDistributeModal}
          onClose={() => setShowDistributeModal(false)}
          tokenAddress={group.tokenAddress}
          tokenName={group.tokenName || ''}
          tokenSymbol={group.tokenSymbol || ''}
          totalSupply={group.tokenSupply || '0'}
          ownerAddress={userAddress}
          onDistribute={handleDistributeTokens}
          distributionSet={distributionSet}
        />
      )}

      {/* Create Post Modal */}
      {showCreatePostModal && group && (
        <CreatePostModal
          isOpen={showCreatePostModal}
          onClose={() => setShowCreatePostModal(false)}
          groupTokenAddress={group.tokenAddress}
          groupPostsAddress={group.postsAddress}
          groupKey={deriveGroupKey(group.tokenAddress)}
          userAddress={userAddress}
          hasNFT={userNFTBalance > 0}
          hasToken={userTokenBalance > 0}
          isMember={isJoined}
          relayerUrl="http://localhost:3001"
          hashIdToken={hashIdToken || undefined}
          onPostCreated={async (contentHash: string, accessLevel: number) => {
            console.log('📝 Creating post on-chain with CID:', contentHash, 'Access level:', accessLevel);
            
            if (!hashIdToken) {
              throw new Error('No HASHD ID found. Please register or link a HASHD ID first.');
            }
            
            // Create post on blockchain (pass hashIdToken as string, contract will handle conversion)
            const tx = await contractService.createPost(
              group.postsAddress,
              contentHash,
              accessLevel,
              hashIdToken
            );
            
            console.log('⏳ Waiting for transaction confirmation...');
            await tx.wait();
            console.log('✅ Post created on-chain!');
            
            // Increment post count to trigger refresh
            setPostCount(prev => prev + 1);
          }}
        />
      )}

      {/* Claim Airdrop Modal */}
      {showClaimModal && group && (
        <ClaimAirdropModal
          isOpen={showClaimModal}
          onClose={() => setShowClaimModal(false)}
          tokenAddress={group.tokenAddress}
          tokenName={group.tokenName || ''}
          tokenSymbol={group.tokenSymbol || ''}
          userAddress={userAddress}
          onClaim={handleClaimAirdrop}
        />
      )}
    </div>
  );
};
