import React from 'react';
import { TrendingUp, Gift, PenSquare, Edit } from 'lucide-react';

interface QuickActionsProps {
  isOwner: boolean;
  isJoined: boolean;
  distributionSet: boolean;
  onMintNFT: () => void;
  onGiftNFT: () => void;
  onDistribute: () => void;
  onCheckAirdrop: () => void;
  onCreatePost?: () => void;
  onEditGroupInfo?: () => void;
  canPost?: boolean;
  hasHashId?: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  isOwner,
  isJoined,
  distributionSet,
  onMintNFT,
  onGiftNFT,
  onDistribute,
  onCheckAirdrop,
  onCreatePost,
  onEditGroupInfo,
  canPost = false,
  hasHashId = true,
}) => {
  return (
    <div className="card">
      <div className="space-y-6">
        {/* Create Post Section */}
        {onCreatePost && (
          <div>
            <button 
              onClick={onCreatePost} 
              disabled={!isJoined || !hasHashId} 
              className="btn btn-cyber btn-block"
              title={!hasHashId ? 'You need a HashID attached to create posts' : ''}
            >
              <PenSquare className="w-4 h-4" />
              Create Post
            </button>
          </div>
        )}
        
        {/* NFT Related Actions */}
        <div className="space-y-3">
          <button onClick={onMintNFT} disabled={!isJoined} className="btn btn-primary btn-block">
            Mint Genesis Key
          </button>

          {distributionSet && (
            <button onClick={onDistribute} disabled={!isJoined} className="btn btn-primary btn-block">
              <TrendingUp className="w-4 h-4" />
              Check Distribution
            </button>
          )}       

          <button onClick={onCheckAirdrop} disabled={!isJoined} className="btn btn-primary btn-block">
            <Gift className="w-4 h-4" />
            Check Airdrop
          </button>
        </div>

        {/* Admin Section */}
        {isOwner && (
          <div className="pt-6 border-t border-primary-100">
            <h4 className="text-subtitle mb-3">Admin</h4>
            <div className="space-y-3">
              <button onClick={onGiftNFT} className="btn btn-primary btn-block">
                Gift Genesis Key
              </button>
              
              {onEditGroupInfo && (
                <button onClick={onEditGroupInfo} className="btn btn-primary btn-block">
                  <Edit className="w-4 h-4" />
                  Edit Group Info
                </button>
              )}
              
              {!distributionSet && (
                <button
                  onClick={onDistribute}
                  className="btn btn-primary btn-block"
                >
                  <TrendingUp className="w-4 h-4" />
                  Distribute Token
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
