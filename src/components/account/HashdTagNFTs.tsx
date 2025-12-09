/**
 * HashdTag NFTs Component
 * 
 * Displays the user's HashdTag identity NFTs with self-contained data fetching
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { HashdTagNFTCard } from '../HashdTagNFTCard';
import { contractService } from '../../utils/contracts';

interface HashdTagNFT {
  tokenId: string;
  fullName: string;
  domain: string;
  tokenURI: string;
}

interface HashdTagNFTsProps {
  userAddress: string;
  onAccountsChanged?: () => void;
}

export const HashdTagNFTs: React.FC<HashdTagNFTsProps> = ({ userAddress, onAccountsChanged }) => {
  const [hashdTagNFTs, setHashdTagNFTs] = useState<HashdTagNFT[]>([]);
  const [nftsLoading, setNftsLoading] = useState(false);

  const fetchNFTs = useCallback(async () => {
    if (!userAddress) return;
    try {
      setNftsLoading(true);
      const nfts = await contractService.getHashdTagNFTs(userAddress);
      console.log('🎨 HashdTag NFTs for wallet:', nfts);
      setHashdTagNFTs(nfts);
    } catch (error) {
      console.error('Error fetching HashdTag NFTs:', error);
    } finally {
      setNftsLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  return (
    <div className="bg-gray-800/50 rounded-lg p-6">
      <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono flex items-center gap-2">
        <ImageIcon className="w-5 h-5" />
        Your HashdTag NFTs ({hashdTagNFTs.length})
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        Your active HASHDtags will reverse-resolve to your public key
      </p>
      
      {nftsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 animate-pulse">
              <div className="aspect-square bg-gray-700/50 rounded-lg mb-3"></div>
              <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : hashdTagNFTs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {hashdTagNFTs.map((nft) => (
            <HashdTagNFTCard
              key={nft.tokenId}
              tokenId={nft.tokenId}
              fullName={nft.fullName}
              domain={nft.domain}
              tokenURI={nft.tokenURI}
              userAddress={userAddress}
              onRefresh={() => {
                fetchNFTs();
                if (onAccountsChanged) onAccountsChanged();
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-mono">
            No HashdTag NFTs found.
          </p>
          <p className="text-xs text-gray-500 font-mono mt-1">
            Register a named account to mint your first HashdTag NFT!
          </p>
        </div>
      )}
    </div>
  );
};
