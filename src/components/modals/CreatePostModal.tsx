import React from 'react';
import { PenSquare } from 'lucide-react';
import { NeonModal } from './NeonModal';
import CreatePost from '../CreatePost';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupTokenAddress: string;
  groupPostsAddress: string;
  groupKey: string;
  userAddress: string;
  hasNFT?: boolean;
  hasToken?: boolean;
  isMember?: boolean;
  onPostCreated: (contentHash: string, accessLevel: number) => Promise<void>;
  onComplete?: () => void;
  relayerUrl?: string;
  hashIdToken?: string;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  groupTokenAddress,
  groupPostsAddress,
  groupKey,
  userAddress,
  hasNFT = false,
  hasToken = false,
  isMember = false,
  onPostCreated,
  onComplete,
  relayerUrl,
  hashIdToken
}) => {
  const handlePostCreated = async (contentHash: string, accessLevel: number) => {
    try {
      await onPostCreated(contentHash, accessLevel);
      // Don't close here - let CreatePost component handle the full flow including ByteCave upload
      // The modal will close after the 2-second success message display in CreatePost
    } catch (error) {
      // Don't close on error - let user see the error message
      console.error('Post creation failed:', error);
      throw error; // Re-throw so CreatePost can handle it
    }
  };

  return (
    <NeonModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Post"
      icon={PenSquare}
      maxWidth="2xl"
    >
      <div className="p-6">
        <CreatePost
          groupTokenAddress={groupTokenAddress}
          groupPostsAddress={groupPostsAddress}
          groupKey={groupKey}
          userAddress={userAddress}
          hasNFT={hasNFT}
          hasToken={hasToken}
          isMember={isMember}
          onPostCreated={handlePostCreated}
          onComplete={() => {
            onClose();
            if (onComplete) {
              onComplete();
            }
          }}
          relayerUrl={relayerUrl}
          hashIdToken={hashIdToken}
        />
      </div>
    </NeonModal>
  );
};
