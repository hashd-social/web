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
    <div className="bg-gray-800/30 rounded-lg p-6">

      <div className="space-y-6">
        {/* Create Post Section */}
        {onCreatePost && (
          <div>
            <button
              onClick={onCreatePost}
              className="cyber-button relative w-full flex items-center justify-center gap-2 px-4 py-3 text-sm overflow-hidden"
            >
              <PenSquare className="w-4 h-4" />
              Create Post
            </button>
          </div>
        )}
        
        {/* NFT Related Actions */}

        <div className="space-y-3">
          <button
            onClick={onMintNFT}
            className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 py-3 px-4 rounded-lg font-bold transition-all text-sm font-mono uppercase tracking-wider"
          >
            Mint a HASHD Prime Key
          </button>

          {distributionSet && (
            <button
              onClick={onDistribute}
              className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 py-3 px-4 rounded-lg font-bold transition-all text-sm font-mono uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Check Distribution
            </button>
          )}       

          <button
            onClick={onCheckAirdrop}
            className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 py-3 px-4 rounded-lg font-bold transition-all text-sm font-mono uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <Gift className="w-4 h-4" />
            Check Airdrop
          </button>
        </div>

        {/* Admin Section */}
        {isOwner && (
          <div className="pt-6 border-t border-cyan-500/10">
            <h4 className="text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wider font-mono">Admin</h4>
            <div className="space-y-3">
              <button
                onClick={onGiftNFT}
                className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 py-3 px-4 rounded-lg font-bold transition-all text-sm font-mono uppercase tracking-wider"
              >
                Gift a HASHD Prime Key
              </button>
              
              {!distributionSet && (
                <button
                  onClick={onDistribute}
                  disabled={!isJoined}
                  className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 py-3 px-4 rounded-lg font-bold transition-all text-sm font-mono uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
