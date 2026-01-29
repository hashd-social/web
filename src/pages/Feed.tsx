import React from 'react';
import { GroupList } from './GroupList';
import { CreateGroup } from '../components/modals/CreateGroup';

interface FeedProps {
  refreshTrigger: number;
  showCreateGroupModal: boolean;
  userAddress: string;
  onCreateClick: () => void;
  onCloseModal: () => void;
  onGroupCreated: () => void;
}

export const Feed: React.FC<FeedProps> = ({
  refreshTrigger,
  showCreateGroupModal,
  userAddress,
  onCreateClick,
  onCloseModal,
  onGroupCreated,
}) => {
  return (
    <div className="min-h-screen hex-grid bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Guilds List */}
        <GroupList 
          refreshTrigger={refreshTrigger}
          onCreateClick={onCreateClick}
          userAddress={userAddress}
        />
        
        {/* Create Guild Modal */}
        <CreateGroup 
          isOpen={showCreateGroupModal}
          onClose={onCloseModal}
          onGroupCreated={onGroupCreated}
          userAddress={userAddress}
        />
      </div>
    </div>
  );
};
