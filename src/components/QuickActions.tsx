import React from 'react';
import { TrendingUp, Gift, PenSquare } from 'lucide-react';

interface QuickActionsProps {
  isOwner: boolean;
  isJoined: boolean;
  distributionSet: boolean;
  onMintNFT: () => void;
  onGiftNFT: () => void;
  onDistribute: () => void;
  onCheckAirdrop: () => void;
  onCreatePost?: () => void;
  canPost?: boolean;
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
  canPost = false,
}) => {
  return (
    <div className="card">
      <div className="space-y-6">
        {/* Create Post Section */}
        {onCreatePost && (
          <div>
            <button onClick={onCreatePost} className="btn btn-cyber btn-block">
              <PenSquare className="w-4 h-4" />
              Create Post
            </button>
          </div>
        )}
        
        {/* NFT Related Actions */}
        <div className="space-y-3">
          <button onClick={onMintNFT} className="btn btn-primary btn-block">
            Mint a HASHD Prime Key
          </button>

          {distributionSet && (
            <button onClick={onDistribute} className="btn btn-primary btn-block">
              <TrendingUp className="w-4 h-4" />
              Check Distribution
            </button>
          )}       

          <button onClick={onCheckAirdrop} className="btn btn-primary btn-block">
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
                Gift a HASHD Prime Key
              </button>
              
              {!distributionSet && (
                <button
                  onClick={onDistribute}
                  disabled={!isJoined}
                  className="btn btn-primary btn-block"
                  title={!isJoined ? "You must join the group first" : ""}
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
