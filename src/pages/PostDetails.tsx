import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUp, MessageCircle, MoreVertical, Trash2, ExternalLink } from 'lucide-react';
import { downloadAndDecryptPost, PostContent, deriveGroupKey } from '../services/ipfs/groupPosts';
import CommentSection from '../components/CommentSection';
import { ImageModal } from '../components/modals/ImageModal';
import { ethers } from 'ethers';
import { GROUP_FACTORY_ABI, ERC20_ABI, ERC721_ABI } from '../utils/contracts';
import { useSettingsStore } from '../store/settingsStore';

const GROUP_FACTORY_ADDRESS = process.env.REACT_APP_GROUP_FACTORY || '';

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

interface PostDetailsProps {
  contractService: any;
  userAddress: string;
}

export default function PostDetails({ contractService, userAddress }: PostDetailsProps) {
  const { groupAddress, postId } = useParams<{ groupAddress: string; postId: string }>();
  const navigate = useNavigate();
  const { ipfsGateway } = useSettingsStore();
  
  const [groupPostsAddress, setGroupPostsAddress] = useState<string>('');
  const [post, setPost] = useState<any>(null);
  const [content, setContent] = useState<PostContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    loadGroupAndPost();
  }, [groupAddress, postId]);

  const loadGroupAndPost = async () => {
    if (!contractService || !groupAddress || !postId) return;

    try {
      setIsLoading(true);
      
      // Get group info from factory (same as Group.tsx)
      const provider = contractService.getReadProvider();
      const factory = new ethers.Contract(GROUP_FACTORY_ADDRESS, GROUP_FACTORY_ABI, provider);
      
      // Find the group
      const length = await factory.allGroupsLength();
      const groupCount = Number(length);
      
      let groupInfo = null;
      for (let i = 0; i < groupCount; i++) {
        const info = await factory.allGroups(i);
        if (info.tokenAddress.toLowerCase() === groupAddress.toLowerCase()) {
          groupInfo = info;
          break;
        }
      }
      
      if (!groupInfo) {
        throw new Error('Group not found');
      }
      
      setGroupPostsAddress(groupInfo.postsAddress);
      
      // Get single post using getPost from GroupPosts contract
      const postData = await contractService.getPost(groupInfo.postsAddress, parseInt(postId));
      setPost({ ...postData, postsAddress: groupInfo.postsAddress });
      
      // Check if user has upvoted
      const upvoted = await contractService.hasUpvotedPost(groupInfo.postsAddress, userAddress, parseInt(postId));
      setHasUpvoted(upvoted);
      
      // Decrypt content
      const groupKey = deriveGroupKey(groupAddress);
      const decrypted = await downloadAndDecryptPost(postData.ipfsHash, groupKey);
      setContent(decrypted);
      
    } catch (err) {
      console.error('Error loading post:', err);
      setError('Failed to load post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (!post || isUpvoting) return;
    
    setIsUpvoting(true);
    try {
      const tx = await contractService.upvotePost(groupPostsAddress, parseInt(postId!));
      await tx.wait();
      
      // Toggle upvote state
      setHasUpvoted(!hasUpvoted);
      setPost((prev: any) => ({
        ...prev,
        upvotes: hasUpvoted ? prev.upvotes - 1 : prev.upvotes + 1
      }));
    } catch (err) {
      console.error('Error upvoting:', err);
    } finally {
      setIsUpvoting(false);
    }
  };

  const handleDelete = async () => {
    if (!post || !window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const tx = await contractService.deletePost(groupPostsAddress, parseInt(postId!));
      await tx.wait();
      navigate(`/guild/${groupAddress}`);
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800/40 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-700/50 rounded w-1/4 mb-3"></div>
            <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-700/50 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post || !content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded">
            {error || 'Post not found'}
          </div>
        </div>
      </div>
    );
  }

  const isAuthor = post.author.toLowerCase() === userAddress.toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(`/guild/${groupAddress}`)}
            className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold neon-text-cyan font-mono">Post Details</h1>
        </div>

        {/* Post Card */}
        <div className="bg-gray-800/40 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-700/30">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-full flex items-center justify-center text-cyan-400 font-bold font-mono text-lg">
                  {post.author.slice(2, 4).toUpperCase()}
                </div>
                <div>
                  <p className="text-cyan-400 font-bold font-mono text-sm">
                    {post.author.slice(0, 6)}...{post.author.slice(-4)}
                  </p>
                  <p className="text-sm text-gray-400 font-mono">
                    {formatTimeAgo(post.timestamp * 1000)}
                  </p>
                </div>
              </div>

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
                      href={`${ipfsGateway}/${post.ipfsHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-4 py-2 text-left text-sm text-cyan-400 hover:bg-cyan-500/10 flex items-center gap-2 font-mono font-bold"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on IPFS
                    </a>
                    {isAuthor && (
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
          <div className="p-6">
            {/* Title */}
            {content.title && (
              <h2 className="text-2xl font-bold text-cyan-300 mb-4">{content.title}</h2>
            )}
            
            {/* Full Text */}
            {content.text && (
              <p className="text-gray-200 font-mono text-base leading-relaxed mb-6">
                {content.text}
              </p>
            )}
            
            {/* Image */}
            {content.image && (
              <div className="relative w-full overflow-hidden rounded-lg">
                <div className="absolute inset-0">
                  <img
                    src={content.image}
                    alt=""
                    className="w-full h-full object-cover blur-2xl opacity-40 scale-110"
                  />
                </div>
                
                <div className="relative flex justify-center py-4">
                  <img
                    src={content.image}
                    alt="Post content"
                    className="max-w-full h-auto object-contain cursor-pointer hover:opacity-90 transition-opacity rounded-lg"
                    onClick={() => setShowImageModal(true)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-cyan-500/10 flex items-center gap-4">
            <button
              onClick={handleUpvote}
              disabled={isUpvoting}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-bold font-mono ${
                hasUpvoted
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-cyan-400'
              }`}
            >
              <ArrowUp className={`w-5 h-5 ${isUpvoting ? 'animate-pulse' : ''}`} />
              <span>{post.upvotes}</span>
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:bg-gray-700/50 hover:text-cyan-400 rounded-lg transition-all font-bold font-mono"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{post.commentCount}</span>
            </button>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-6">
            <CommentSection
              postId={parseInt(postId!)}
              groupPostsAddress={groupPostsAddress}
              groupKey={deriveGroupKey(groupAddress!)}
              userAddress={userAddress}
              hasNFT={false}
              isGroupOwner={false}
              contractService={contractService}
              onClose={() => setShowComments(false)}
            />
          </div>
        )}
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
