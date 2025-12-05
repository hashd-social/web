import React, { useState, useEffect } from 'react';
import { X, Send, ArrowUp, Trash2 } from 'lucide-react';
import { Spinner, LoadingState } from './Spinner';
import { encryptAndUploadComment, downloadAndDecryptComment, CommentContent } from '../services/ipfs/groupPosts';

interface Comment {
  id: number;
  postId: number;
  author: string;
  ipfsHash: string;
  timestamp: number;
  upvotes: number;
  isDeleted: boolean;
}

interface CommentSectionProps {
  postId: number;
  groupPostsAddress: string;
  groupKey: string;
  userAddress: string;
  hasNFT: boolean;
  isGroupOwner: boolean;
  contractService: any;
  onClose: () => void;
}

export default function CommentSection({
  postId,
  groupPostsAddress,
  groupKey,
  userAddress,
  hasNFT,
  isGroupOwner,
  contractService,
  onClose
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentTexts, setCommentTexts] = useState<Map<number, string>>(new Map());
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upvotedComments, setUpvotedComments] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadComments();
    loadUpvotes();
  }, [postId]);

  const loadComments = async () => {
    try {
      setIsLoading(true);

      // Get all comments for this post
      const { commentIds } = await contractService.getPostCommentsPaginated(
        groupPostsAddress,
        postId,
        0,
        100 // Load up to 100 comments
      );

      if (commentIds.length === 0) {
        setComments([]);
        return;
      }

      // Batch fetch comment details
      const commentsData = await contractService.getCommentsBatch(
        groupPostsAddress,
        commentIds
      );

      setComments(commentsData);

      // Decrypt all comments
      const textMap = new Map<number, string>();
      for (const comment of commentsData) {
        if (!comment.isDeleted) {
          try {
            const content = await downloadAndDecryptComment(comment.ipfsHash, groupKey);
            textMap.set(comment.id, content.text);
          } catch (err) {
            console.error(`Error decrypting comment ${comment.id}:`, err);
            textMap.set(comment.id, '[Failed to decrypt]');
          }
        }
      }
      setCommentTexts(textMap);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUpvotes = async () => {
    try {
      const { commentIds } = await contractService.getPostCommentsPaginated(
        groupPostsAddress,
        postId,
        0,
        100
      );

      if (commentIds.length === 0) return;

      const upvoted = await contractService.batchHasUpvotedComment(
        groupPostsAddress,
        userAddress,
        commentIds
      );

      const upvotedSet = new Set<number>();
      commentIds.forEach((id: number, index: number) => {
        if (upvoted[index]) {
          upvotedSet.add(id);
        }
      });

      setUpvotedComments(upvotedSet);
    } catch (err) {
      console.error('Error loading upvotes:', err);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      // Create comment content
      const content: CommentContent = {
        text: newComment.trim(),
        timestamp: Date.now(),
        author: userAddress
      };

      // Encrypt and upload via relayer
      const cid = await encryptAndUploadComment(content, groupKey, userAddress, groupPostsAddress);

      // Create on-chain comment
      await contractService.addComment(groupPostsAddress, postId, cid);

      // Reset form and reload
      setNewComment('');
      await loadComments();
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvoteComment = async (commentId: number) => {
    try {
      await contractService.upvoteComment(groupPostsAddress, commentId);

      // Toggle upvote
      setUpvotedComments(prev => {
        const newSet = new Set(prev);
        if (newSet.has(commentId)) {
          newSet.delete(commentId);
        } else {
          newSet.add(commentId);
        }
        return newSet;
      });

      // Update comment upvote count
      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId
            ? {
                ...comment,
                upvotes: upvotedComments.has(commentId)
                  ? comment.upvotes - 1
                  : comment.upvotes + 1
              }
            : comment
        )
      );
    } catch (err) {
      console.error('Error upvoting comment:', err);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      await contractService.deleteComment(groupPostsAddress, commentId);

      // Mark as deleted
      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId ? { ...comment, isDeleted: true } : comment
        )
      );
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Comments ({comments.length})
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <LoadingState message="Loading comments..." size="lg" />
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            comments.map(comment => (
              <div
                key={comment.id}
                className={`p-3 rounded-lg ${
                  comment.isDeleted ? 'bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {comment.isDeleted ? (
                  <p className="text-sm text-gray-400 italic">Comment deleted</p>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          {comment.author.slice(2, 4).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {comment.author.slice(0, 6)}...{comment.author.slice(-4)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTime(comment.timestamp)}
                          </p>
                        </div>
                      </div>

                      {(comment.author.toLowerCase() === userAddress.toLowerCase() || isGroupOwner) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <p className="text-sm text-gray-800 mb-2">
                      {commentTexts.get(comment.id) || 'Loading...'}
                    </p>

                    <button
                      onClick={() => handleUpvoteComment(comment.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                        upvotedComments.has(comment.id)
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <ArrowUp className="w-4 h-4" />
                      <span>{comment.upvotes}</span>
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* New Comment Form */}
        <div className="p-4 border-t border-gray-200">
          <form onSubmit={handleSubmitComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <Spinner size="sm" color="white" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
