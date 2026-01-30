import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, MessageCircle, Trash2, MoreVertical, Lock, ArrowUp, ExternalLink, Users, Coins, Award, Globe } from 'lucide-react';
import { downloadAndDecryptPost, PostContent, AccessLevel } from '../services/ipfs/groupPosts';
import { ImageModal } from './modals/ImageModal';
import { useSettingsStore } from '../store/settingsStore';
import { ethers } from 'ethers';

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

interface PostCardProps {
  postId: number;
  author: string;
  contentHash: string;
  timestamp: number;
  upvotes: number;
  commentCount: number;
  accessLevel: number;
  isDeleted: boolean;
  hasUpvoted: boolean;
  hasNFT: boolean;
  hasToken: boolean;
  isMember: boolean;
  isOwner: boolean;
  isAuthor: boolean;
  groupKey: string;
  groupTokenAddress: string;
  hashIdToken: bigint;
  publicKeyHash: string;
  currentUserHashIdToken?: bigint | null;
  currentUserPublicKey?: string | null;
  onUpvote: (postId: number) => Promise<void>;
  onDelete?: (postId: number) => Promise<void>;
  onComment: (postId: number) => void;
  onLoadFailed?: (postId: number) => void;
}

export default function PostCard({
  postId,
  author,
  contentHash,
  timestamp,
  upvotes,
  commentCount,
  accessLevel,
  isDeleted,
  hasUpvoted,
  hasNFT,
  hasToken,
  isMember,
  isOwner,
  isAuthor,
  groupKey,
  groupTokenAddress,
  hashIdToken,
  publicKeyHash,
  currentUserHashIdToken,
  currentUserPublicKey,
  onUpvote,
  onDelete,
  onComment,
  onLoadFailed
}: PostCardProps) {
  const navigate = useNavigate();
  const { vaultPrimaryNode } = useSettingsStore();
  const [content, setContent] = useState<PostContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [authorName, setAuthorName] = useState<string>('');
  const [isHashIdTransferred, setIsHashIdTransferred] = useState<boolean>(false);
  const [originalPublicKey, setOriginalPublicKey] = useState<string>('');

  // Author Header Component
  const AuthorHeader = ({ isLocked = false }: { isLocked?: boolean }) => {
    const textColor = isLocked ? 'text-gray-400' : 'text-white';
    const timeColor = isLocked ? 'text-gray-500' : 'text-gray-400';
    const avatarGradient = isLocked 
      ? 'from-gray-700 to-gray-800' 
      : 'from-cyan-500/20 to-cyan-600/20';
    const avatarTextColor = isLocked ? 'text-gray-400' : 'text-cyan-400';

    return (
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${avatarGradient} rounded-full flex items-center justify-center ${avatarTextColor} font-bold font-mono`}>
          {authorName ? authorName.slice(0, 2).toUpperCase() : author.slice(2, 4).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className={`font-bold ${textColor} font-mono text-sm`}>
              {authorName || `${author.slice(0, 6)}...${author.slice(-4)}`}
            </p>
            {isHashIdTransferred && (
              <span 
                className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded flex items-center gap-1 font-mono cursor-help"
                title={`HashID transferred/detached. Original public key: ${originalPublicKey.slice(0, 10)}...${originalPublicKey.slice(-8)}`}
              >
                ⚠️ Transferred
              </span>
            )}
            {!isLocked && (() => {
              const info = getAccessLevelInfo();
              const Icon = info.icon;
              const colorClasses = {
                gray: 'bg-gray-700/40 text-gray-300',
                blue: 'bg-blue-500/20 text-blue-400',
                green: 'bg-green-500/20 text-green-400',
                purple: 'bg-purple-500/20 text-purple-400'
              };
              return (
                <span className={`px-2 py-0.5 ${colorClasses[info.color as keyof typeof colorClasses]} text-xs font-bold rounded flex items-center gap-1 font-mono`}>
                  <Icon className="w-3 h-3" />
                  {info.label}
                </span>
              );
            })()}
            {isLocked && (
              <span className={`px-2 py-0.5 bg-${getAccessLevelInfo().color}-500/20 text-${getAccessLevelInfo().color}-400 text-xs font-bold rounded flex items-center gap-1 font-mono`}>
                <Lock className="w-3 h-3" />
                {getAccessLevelInfo().label}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <p className={`text-sm ${timeColor} font-mono`}>
              {formatTimeAgo(timestamp)}
            </p>
            {isHashIdTransferred && originalPublicKey && (
              <p className="text-xs text-yellow-400/70 font-mono">
                Original key: {originalPublicKey.slice(0, 10)}...{originalPublicKey.slice(-8)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    loadContent();
  }, [contentHash, groupKey]);

  useEffect(() => {
    loadAuthorName();
  }, [hashIdToken, author]);

  const loadAuthorName = async () => {
    try {
      console.log('[PostCard] Loading author name for post:', {
        postId,
        hashIdToken: hashIdToken?.toString(),
        currentUserHashIdToken: currentUserHashIdToken?.toString(),
        publicKeyHash,
        currentUserPublicKey,
        author
      });
      
      if (hashIdToken && hashIdToken > BigInt(0) && publicKeyHash) {
        // Step 1: Compare public key hashes
        if (currentUserPublicKey) {
          const currentUserPublicKeyHash = ethers.keccak256(currentUserPublicKey);
          console.log('[PostCard] Comparing hashes:', {
            postPublicKeyHash: publicKeyHash,
            currentUserPublicKeyHash
          });
          
          if (currentUserPublicKeyHash.toLowerCase() === publicKeyHash.toLowerCase()) {
            // Public keys match - current user created this post
            console.log('[PostCard] Public keys match - current user created this post');
            
            // Step 2: Check if HashID tokens match
            if (currentUserHashIdToken && hashIdToken === currentUserHashIdToken) {
              // Same HashID - show "You"
              console.log('[PostCard] Same HashID - showing "You"');
              setAuthorName('You');
              setIsHashIdTransferred(false);
              setOriginalPublicKey('');
            } else {
              // Different HashID - show "You" with transferred flag
              console.log('[PostCard] Different HashID - showing "You" with transferred flag');
              setAuthorName('You');
              setIsHashIdTransferred(true);
              setOriginalPublicKey(publicKeyHash);
            }
            return;
          }
        }
        
        // Step 3: Public keys don't match - get the HashID name of the poster
        console.log('[PostCard] Public keys do not match - fetching poster HashID name');
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const currentUserAddress = await signer.getAddress();
        
        const { contractService } = await import('../utils/contracts');
        const authorInfo = await contractService.getPostAuthorInfo(
          hashIdToken,
          publicKeyHash,
          currentUserAddress
        );
        
        setAuthorName(authorInfo.authorName);
        setIsHashIdTransferred(authorInfo.isTransferred);
        setOriginalPublicKey(authorInfo.originalPublicKey);
      } else {
        // No HashID or no public key hash - show formatted wallet address
        setAuthorName(`${author.slice(0, 6)}...${author.slice(-4)}`);
        setIsHashIdTransferred(false);
        setOriginalPublicKey('');
      }
    } catch (err) {
      console.error('Error loading author name:', err);
      // Fallback to formatted wallet address
      setAuthorName(`${author.slice(0, 6)}...${author.slice(-4)}`);
      setIsHashIdTransferred(false);
      setOriginalPublicKey('');
    }
  };

  // Check if user has access to view this post
  // Access is determined by the post's access level setting
  const canView = () => {
    // Check if current user is the author by comparing public key hashes
    const isPostAuthor = currentUserPublicKey && publicKeyHash && 
      ethers.keccak256(currentUserPublicKey).toLowerCase() === publicKeyHash.toLowerCase();
    
    // Authors can always view their own posts (even if they left the group)
    if (isPostAuthor) return true;
    
    switch (accessLevel) {
      case AccessLevel.PUBLIC:
        return true; // Anyone can view public posts
      case AccessLevel.MEMBERS_ONLY:
        return isMember; // Must be a member (non-authors see blurred if not member)
      case AccessLevel.TOKEN_HOLDERS:
        return hasToken; // Must hold ERC20 tokens (regardless of membership)
      case AccessLevel.NFT_HOLDERS:
        return hasNFT; // Must hold ERC721 NFT (regardless of membership)
      default:
        return false;
    }
  };

  const getAccessLevelInfo = () => {
    switch (accessLevel) {
      case AccessLevel.PUBLIC:
        return { label: 'Public', icon: Globe, color: 'gray' };
      case AccessLevel.MEMBERS_ONLY:
        return { label: 'Guild Members', icon: Users, color: 'blue' };
      case AccessLevel.TOKEN_HOLDERS:
        return { label: 'ERC20 Token Holders', icon: Coins, color: 'green' };
      case AccessLevel.NFT_HOLDERS:
        return { label: 'NFT Holders', icon: Award, color: 'purple' };
      default:
        return { label: 'Unknown', icon: Lock, color: 'gray' };
    }
  };

  const loadContent = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if user has access
      const hasAccess = canView();
      console.log(`[PostCard ${postId}] Access check:`, {
        accessLevel,
        isMember,
        hasToken,
        hasNFT,
        isAuthor,
        hasAccess
      });
      
      if (!hasAccess) {
        const info = getAccessLevelInfo();
        console.log(`[PostCard ${postId}] Access denied, showing locked UI:`, info.label);
        setError(`🔒 ${info.label} Only`);
        setIsLoading(false);
        return;
      }

      const decrypted = await downloadAndDecryptPost(contentHash, groupKey);
      setContent(decrypted);
    } catch (err) {
      const error = err as Error;
      // Only log unexpected errors - missing content is expected
      if (!error.message.includes('BLOB_NOT_FOUND') && !error.message.includes('All nodes failed')) {
        console.error('Error loading post:', err);
      }
      setError('Failed to load post');
      
      // Notify parent that this post failed to load (likely missing ByteCave content)
      if (onLoadFailed && canView()) {
        onLoadFailed(postId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (isUpvoting) return;
    
    setIsUpvoting(true);
    try {
      await onUpvote(postId);
    } catch (err) {
      console.error('Error upvoting:', err);
    } finally {
      setIsUpvoting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await onDelete(postId);
      } catch (err) {
        console.error('Error deleting post:', err);
      }
    }
    setShowMenu(false);
  };

  if (isDeleted) {
    return (
      <div className="bg-gray-800/30 rounded-lg p-4">
        <p className="text-gray-500 text-sm italic font-mono">This post has been deleted</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gray-800/40 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700/50 rounded w-1/4 mb-3"></div>
          <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-700/50 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Render locked post with normal card format but masked content
  if (error) {
    const info = getAccessLevelInfo();
    const Icon = info.icon;
    const colorClasses = {
      gray: 'bg-gray-700/40 text-gray-300',
      blue: 'bg-blue-500/20 text-blue-400',
      green: 'bg-green-500/20 text-green-400',
      purple: 'bg-purple-500/20 text-purple-400'
    };
    
    return (
      <div className="bg-gray-800/30 rounded-lg opacity-60">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/10">
          <div className="flex items-start justify-between">
            <AuthorHeader isLocked={true} />
          </div>
        </div>

        {/* Masked Content */}
        <div className="p-4 relative">
          <div className="blur-sm select-none pointer-events-none">
            <p className="text-gray-500 font-mono">This is some placeholder text that represents the hidden post content. You need the required access level to view this post.</p>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Lock className="w-8 h-8 text-cyan-400/50 mx-auto mb-2" />
              <p className="text-sm font-bold text-cyan-400 font-mono uppercase tracking-wider">{info.label} Only</p>
            </div>
          </div>
        </div>

        {/* Footer - Disabled */}
        <div className="px-4 pb-4 flex items-center gap-4 opacity-50 pointer-events-none">
          <button disabled className="flex items-center gap-2 text-gray-500 cursor-not-allowed">
            <ThumbsUp className="w-5 h-5" />
            <span className="text-sm font-bold font-mono">{upvotes}</span>
          </button>
          <button disabled className="flex items-center gap-2 text-gray-500 cursor-not-allowed">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-bold font-mono">{commentCount}</span>
          </button>
        </div>
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className="bg-gray-800/40 rounded-lg hover:border-cyan-500/20 transition-all">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/30">
        <div className="flex items-start justify-between">
          <AuthorHeader isLocked={false} />

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-cyan-400 rounded-lg hover:bg-gray-700/50 transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-1 w-56 bg-gray-900/95 rounded-lg shadow-lg py-1 z-10">
                <a
                  href={`${vaultPrimaryNode}/blob/${contentHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-2 text-left text-sm text-cyan-400 hover:bg-cyan-500/10 flex items-center gap-2 font-mono font-bold"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on ByteCave
                </a>
                {(isAuthor || isOwner) && onDelete && (
                  <button
                    onClick={handleDelete}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 font-mono font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Post
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div 
        className={`p-4 ${!content.image && !content.text ? 'pb-6' : ''} cursor-pointer hover:bg-gray-700/10 transition-colors`} 
        onClick={() => navigate(`/group/${groupTokenAddress}/post/${postId}`)}
      >
        {/* Title */}
        {content.title && (
          <h3 className="text-lg font-bold text-cyan-300 mb-2">{content.title}</h3>
        )}
        
        {/* Truncated Text */}
        {content.text && (
          <p className="text-gray-300 font-mono text-sm">
            {content.text.length > 240 
              ? `${content.text.substring(0, 240)}...` 
              : content.text
            }
          </p>
        )}
      </div>
      
      {content.image && (
        <div className="relative w-full overflow-hidden">
          {/* Blurred background - full width */}
          <div className="absolute inset-0">
            <img
              src={content.image}
              alt=""
              className="w-full h-full object-cover blur-2xl opacity-40 scale-110"
            />
          </div>
          
          {/* Main centered image */}
          <div className="relative flex justify-center py-4">
            <img
              src={content.image}
              alt="Post content"
              className="max-w-[400px] w-full h-auto object-contain cursor-pointer hover:opacity-90 transition-opacity rounded-lg"
              onClick={() => setShowImageModal(true)}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-cyan-500/10 flex items-center gap-4">
        <button
          onClick={handleUpvote}
          disabled={isUpvoting}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all font-bold font-mono ${
            hasUpvoted
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-gray-400 hover:bg-gray-700/50 hover:text-cyan-400'
          }`}
        >
          <ArrowUp className={`w-5 h-5 ${isUpvoting ? 'animate-pulse' : ''}`} />
          <span className="text-sm">{upvotes}</span>
        </button>

        <button
          onClick={() => onComment(postId)}
          className="flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:bg-gray-700/50 hover:text-cyan-400 rounded-lg transition-all font-bold font-mono"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">{commentCount}</span>
        </button>
      </div>

      {/* Image Modal */}
      {content?.image && (
        <ImageModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          imageUrl={content.image}
          alt="Post content"
        />
      )}
    </div>
  );
}
