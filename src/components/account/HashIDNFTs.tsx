/**
 * HashID NFTs Component
 * 
 * Displays the user's HashID identity NFTs with self-contained data fetching
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { HashIDNFTCard } from '../HashIDNFTCard';
import { contractService } from '../../utils/contracts';

interface HashIDNFT {
  tokenId: string;
  fullName: string;
  domain: string;
  tokenURI: string;
}

interface HashIDNFTsProps {
  userAddress: string;
  onAccountsChanged?: () => void;
}

export const HashIDNFTs: React.FC<HashIDNFTsProps> = ({ userAddress, onAccountsChanged }) => {
  const [hashIDNFTs, setHashIDNFTs] = useState<HashIDNFT[]>([]);
  const [nftsLoading, setNftsLoading] = useState(false);

  const fetchNFTs = useCallback(async () => {
    if (!userAddress) return;
    try {
      setNftsLoading(true);
      const nfts = await contractService.getHashIDNFTs(userAddress);
      console.log('🎨 HashID NFTs for wallet:', nfts);
      setHashIDNFTs(nfts);
    } catch (error) {
      console.error('Error fetching HashID NFTs:', error);
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
        Your HashID NFTs ({hashIDNFTs.length})
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        Your active HashIDs will reverse-resolve to your public key
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
      ) : hashIDNFTs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {hashIDNFTs.map((nft) => (
            <HashIDNFTCard
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
            No HashID NFTs found.
          </p>
          <p className="text-xs text-gray-500 font-mono mt-1">
            Register a named account to mint your first HashID NFT!
          </p>
        </div>
      )}
    </div>
  );
};
