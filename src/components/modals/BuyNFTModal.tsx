/**
 * Buy NFT Modal
 * 
 * Modal for purchasing a HASHD Prime key NFT
 */

import React, { useState } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { NeonModal, NeonButton } from './NeonModal';

interface BuyNFTModalProps {
  isOpen: boolean;
  nftPrice: string;
  onClose: () => void;
  onBuy: () => Promise<void>;
}

export const BuyNFTModal: React.FC<BuyNFTModalProps> = ({ 
  isOpen, 
  nftPrice, 
  onClose, 
  onBuy 
}) => {
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPurchasing(true);
    try {
      await onBuy();
      onClose();
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <NeonModal
      isOpen={isOpen}
      onClose={onClose}
      title="Mint a HASHD Prime Key"
      icon={ShoppingCart}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="bg-cyan-900/20 rounded-lg p-4 border border-cyan-500/20">
          <p className="text-sm font-bold text-cyan-400 mb-2 uppercase tracking-wider font-mono">Benefits:</p>
          <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside font-mono">
            <li>View premium posts for FREE</li>
            <li>Create group governance proposals</li>
            <li>Exclusive supporter badge</li>
            <li>Limited collectible (unique numbered NFT)</li>
          </ul>
        </div>

        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <div className="text-sm text-purple-400 mb-1 font-bold uppercase tracking-wider font-mono">Price</div>
          <div className="text-2xl font-bold text-purple-400 font-mono">{nftPrice} ETH</div>
        </div>

        <NeonButton
          type="submit"
          disabled={isPurchasing}
          variant="cyan"
          className="w-full"
        >
          {isPurchasing ? 'Purchasing...' : `Purchase for ${nftPrice} ETH`}
        </NeonButton>
      </form>
    </NeonModal>
  );
};
