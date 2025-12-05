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
  onPostCreated: (ipfsHash: string, accessLevel: number) => Promise<void>;
  relayerUrl?: string;
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
  relayerUrl
}) => {
  const handlePostCreated = async (ipfsHash: string, accessLevel: number) => {
    try {
      await onPostCreated(ipfsHash, accessLevel);
      // Wait a moment before closing to show success
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      // Don't close on error - let user see the error message
      console.error('Post creation failed:', error);
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
          relayerUrl={relayerUrl}
        />
      </div>
    </NeonModal>
  );
};
