import React, { useState, useEffect } from 'react';
import { ArrowUp, MessageCircle } from 'lucide-react';
import CommentSection from './CommentSection';
import { LoadingState } from './Spinner';
import PostCard from './PostCard';
import { useSettingsStore } from '../store/settingsStore';
import { ethers } from 'ethers';

interface Post {
  id: number;
  author: string;
  ipfsHash: string;
  timestamp: number;
  upvotes: number;
  commentCount: number;
  accessLevel: number;
  isDeleted: boolean;
}

interface PostsFeedProps {
  groupTokenAddress: string;
  groupPostsAddress: string;
  groupKey: string;
  userAddress: string;
  hasNFT: boolean;
  hasToken: boolean;
  isGroupOwner: boolean;
  isMember: boolean;
  contractService: any; // Will be properly typed when we update contracts.ts
  refreshTrigger?: number; // Increment to force refresh
}

export default function PostsFeed({
  groupTokenAddress,
  groupPostsAddress,
  groupKey,
  userAddress,
  hasNFT,
  hasToken,
  isGroupOwner,
  isMember,
  contractService,
  refreshTrigger = 0
}: PostsFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [upvotedPosts, setUpvotedPosts] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const PAGE_SIZE = 20;

  useEffect(() => {
    // Only load on initial mount or when page changes
    if (!hasLoaded) {
      loadPosts();
      loadUpvotes();
      setHasLoaded(true);
    } else if (page !== 0) {
      // Reload when page changes (but not on first mount)
      loadPosts();
      loadUpvotes();
    }
  }, [page]);
  
  // Separate effect for when groupPostsAddress changes (different group)
  useEffect(() => {
    setHasLoaded(false);
    setPage(0);
  }, [groupPostsAddress]);
  
  // Refresh when refreshTrigger changes (after creating a post)
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 Refreshing posts after creation...');
      loadPosts();
      loadUpvotes();
    }
  }, [refreshTrigger]);

  /**
   * Unpin content from vault
   * Note: Vault uses garbage collection, unpinning just removes the pin flag
   */
  const unpinFromVault = async (cid: string, _userAddress: string) => {
    const vaultUrl = useSettingsStore.getState().vaultPrimaryNode;
    
    try {
      console.log('🗑️ Unpinning from vault...');
      const response = await fetch(`${vaultUrl}/pin/${cid}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log('✅ Unpinned from vault');
      } else {
        const error = await response.text();
        console.warn('⚠️ Vault unpin failed:', error);
      }
    } catch (error) {
      console.warn('⚠️ Vault unpin error (non-critical):', error);
    }
  };

  const loadPosts = async () => {
    if (!contractService) {
      console.error('❌ Contract service not available');
      return;
    }
    
    console.log('📥 Loading posts from:', groupPostsAddress);
    console.log('📄 Page:', page, 'Size:', PAGE_SIZE);
    
    try {
      setIsLoading(true);
      
      // Diagnostic: Check contract state
      try {
        const provider = contractService.getReadProvider();
        const groupPostsContract = new ethers.Contract(
          groupPostsAddress,
          [
            'function isAuthorizedInStorage() view returns (bool)',
            'function postStorage() view returns (address)',
            'function getPost(uint256) view returns (tuple(uint256 id, bytes32 ipfsHash, uint256 timestamp, uint256 upvotes, uint256 downvotes, uint256 commentCount, address author, uint8 accessLevel, bool isDeleted))'
          ],
          provider
        );
        
        console.log('🔍 === DIAGNOSTIC START ===');
        const isAuthorized = await groupPostsContract.isAuthorizedInStorage();
        const postStorageAddr = await groupPostsContract.postStorage();
        console.log('🔐 GroupPosts authorized in PostStorage:', isAuthorized);
        console.log('📦 PostStorage address:', postStorageAddr);
        
        // Try to fetch a single post to see if it works
        try {
          const singlePost = await groupPostsContract.getPost(1);
          console.log('✅ Single post fetch works:', singlePost);
        } catch (singleErr: any) {
          console.error('❌ Single post fetch FAILED:', singleErr.message);
        }
        
        if (!isAuthorized) {
          console.error('⚠️ ⚠️ ⚠️ CRITICAL: GroupPosts is NOT authorized in PostStorage!');
          console.error('This WILL cause getPostsBatch to return malformed data.');
          console.error('Solution: Owner must call: postStorage.authorizeContract(' + groupPostsAddress + ')');
        }
        console.log('🔍 === DIAGNOSTIC END ===');
      } catch (diagError: any) {
        console.error('⚠️ Diagnostic check failed:', diagError.message);
      }
      
      // Get paginated posts (contract now filters out deleted posts)
      const { postIds, total } = await contractService.getPostsPaginated(
        groupPostsAddress,
        page * PAGE_SIZE,
        PAGE_SIZE
      );
      
      console.log('📊 Non-deleted posts returned:', total);
      console.log('📋 Post IDs:', postIds);
      
      // Note: total is the count of posts returned, not total posts in contract
      // This is because deleted posts are filtered out on-chain
      setTotalPosts(total);

      if (postIds.length === 0) {
        console.log('ℹ️ No posts found on this page');
        setPosts([]);
        return;
      }

      // Batch fetch post details
      console.log('🔄 Fetching post details...');
      console.log('📍 GroupPosts address:', groupPostsAddress);
      console.log('📍 Post IDs to fetch:', postIds);
      
      const postsData = await contractService.getPostsBatch(
        groupPostsAddress,
        postIds
      );

      console.log('✅ Loaded posts:', postsData);
      
      // Filter out any deleted posts (defensive, should already be filtered on-chain)
      const activePosts = postsData.filter((post: any) => !post.isDeleted);
      setPosts(activePosts);
    } catch (err) {
      console.error('❌ Error loading posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUpvotes = async () => {
    if (!contractService) {
      return;
    }
    
    try {
      // Get paginated posts to get post IDs
      const { postIds } = await contractService.getPostsPaginated(
        groupPostsAddress,
        page * PAGE_SIZE,
        PAGE_SIZE
      );

      if (postIds.length === 0) return;

      // Batch check upvotes
      const upvoted = await contractService.batchHasUpvotedPost(
        groupPostsAddress,
        userAddress,
        postIds
      );

      const upvotedSet = new Set<number>();
      postIds.forEach((id: number, index: number) => {
        if (upvoted[index]) {
          upvotedSet.add(id);
        }
      });

      setUpvotedPosts(upvotedSet);
    } catch (err) {
      console.error('Error loading upvotes:', err);
    }
  };

  const handleCreatePost = async (ipfsHash: string, accessLevel: number) => {
    if (!contractService) return;
    
    try {
      const tx = await contractService.createPost(
        groupPostsAddress,
        ipfsHash,
        accessLevel
      );
      
      // Wait for confirmation
      await tx.wait();
      
      // Fetch the latest post (most recent)
      const { postIds } = await contractService.getPostsPaginated(groupPostsAddress, 0, 1);
      
      if (postIds.length > 0) {
        const [newPost] = await contractService.getPostsBatch(groupPostsAddress, [postIds[0]]);
        
        // Prepend to posts list
        setPosts(prev => [newPost, ...prev]);
        setTotalPosts(prev => prev + 1);
        
        console.log('✅ New post prepended to feed');
      }
    } catch (err) {
      console.error('Error creating post:', err);
      throw err;
    }
  };

  const handleUpvote = async (postId: number) => {
    if (!contractService) return;
    
    try {
      await contractService.upvotePost(groupPostsAddress, postId);

      // Toggle upvote in local state
      setUpvotedPosts(prev => {
        const newSet = new Set(prev);
        if (newSet.has(postId)) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });

      // Update post upvote count
      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                upvotes: upvotedPosts.has(postId)
                  ? post.upvotes - 1
                  : post.upvotes + 1
              }
            : post
        )
      );
    } catch (err) {
      console.error('Error upvoting post:', err);
      throw err;
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!contractService) return;
    
    try {
      // Find the post to get its CID
      const post = posts.find(p => p.id === postId);
      if (!post) {
        throw new Error('Post not found');
      }
      
      console.log('🗑️ Deleting post:', postId, 'CID:', post.ipfsHash);
      
      // 1. Delete from blockchain
      const tx = await contractService.deletePost(groupPostsAddress, postId);
      await tx.wait();
      console.log('✅ Post deleted from blockchain');
      
      // 2. Unpin from IPFS
      // Try user's Pinata first if configured, then relayer
      await unpinFromVault(post.ipfsHash, userAddress);

      // 3. Reload posts to reflect deletion
      // Since contract now filters deleted posts, this will remove it from the feed
      console.log('🔄 Reloading posts after deletion...');
      await loadPosts();
      
      console.log('✅ Post deletion complete');
    } catch (err) {
      console.error('❌ Error deleting post:', err);
      throw err;
    }
  };

  const handleComment = (postId: number) => {
    setSelectedPostId(postId);
  };

  const handleCloseComments = () => {
    setSelectedPostId(null);
    // Don't reload posts - just close the modal
  };

  if (isLoading) {
    return <LoadingState message="Loading posts..." />;
  }

  return (
    <div className="mx-auto space-y-4">
      {/* Create Post - Now in modal via QuickActions button */}
      
      {/* Refresh Button - temporarily commented out - PLEASE LEAVE */}
      {/* <div className="flex justify-end">
        <button
          onClick={() => {
            loadPosts();
            loadUpvotes();
          }}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-cyan-400 hover:bg-gray-700/50 rounded-lg transition-all font-bold font-mono"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div> */}

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="bg-gray-800/50 rounded-lg p-12 text-center">
          <p className="text-gray-400 font-mono">No posts yet. Be the first to post!</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map(post => (
              <PostCard
                key={post.id}
                postId={post.id}
                author={post.author}
                ipfsCid={post.ipfsHash}
                timestamp={post.timestamp * 1000} // Convert to milliseconds
                upvotes={post.upvotes}
                commentCount={post.commentCount}
                accessLevel={post.accessLevel}
                isDeleted={post.isDeleted}
                hasUpvoted={upvotedPosts.has(post.id)}
                hasNFT={hasNFT}
                hasToken={hasToken}
                isMember={isMember}
                isOwner={isGroupOwner}
                isAuthor={post.author.toLowerCase() === userAddress.toLowerCase()}
                groupKey={groupKey}
                groupTokenAddress={groupTokenAddress}
                onUpvote={handleUpvote}
                onDelete={handleDeletePost}
                onComment={handleComment}
              />
            ))}
          </div>

          {/* Pagination - Note: totalPosts reflects non-deleted posts only */}
          {totalPosts > PAGE_SIZE && (
            <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-4">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 text-sm font-bold text-gray-300 bg-gray-700/50 rounded-lg hover:border-cyan-500/50 hover:text-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono"
              >
                Previous
              </button>

              <span className="text-sm text-gray-400 font-mono">
                Page {page + 1} • {posts.length} posts
              </span>

              <button
                onClick={() => setPage(p => p + 1)}
                disabled={posts.length < PAGE_SIZE}
                className="px-4 py-2 text-sm font-bold text-gray-300 bg-gray-700/50 rounded-lg hover:border-cyan-500/50 hover:text-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Comment Section Modal */}
      {selectedPostId !== null && (
        <CommentSection
          postId={selectedPostId}
          groupPostsAddress={groupPostsAddress}
          groupKey={groupKey}
          userAddress={userAddress}
          hasNFT={hasNFT}
          isGroupOwner={isGroupOwner}
          contractService={contractService}
          onClose={handleCloseComments}
        />
      )}
    </div>
  );
}
