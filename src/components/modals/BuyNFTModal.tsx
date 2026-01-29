/**
 * Buy NFT Modal
 * 
 * Modal for purchasing a HASHD Genesis Key NFT
 */

import React, { useState, useEffect } from 'react';
import { ShoppingCart, X, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { NeonModal, NeonButton } from './NeonModal';
import { GuildImage } from '../GuildImage';

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
}

interface MintedNFT {
  tokenId: number;
  metadata?: NFTMetadata;
}

interface BuyNFTModalProps {
  isOpen: boolean;
  nftPrice: string;
  nftName: string;
  groupImageURI: string;
  onClose: () => void;
  onBuy: () => Promise<MintedNFT | void>;
}

export const BuyNFTModal: React.FC<BuyNFTModalProps> = ({ 
  isOpen, 
  nftPrice,
  nftName,
  groupImageURI,
  onClose, 
  onBuy 
}) => {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [mintedNFT, setMintedNFT] = useState<MintedNFT | null>(null);

  // Reset minted NFT state when modal is opened fresh
  useEffect(() => {
    if (!isOpen) {
      setMintedNFT(null);
    }
  }, [isOpen]);

  // Trigger confetti when NFT is minted
  useEffect(() => {
    if (mintedNFT) {
      triggerConfetti();
    }
  }, [mintedNFT]);

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Fire confetti from left side
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });

      // Fire confetti from right side
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPurchasing(true);
    try {
      console.log('[BuyNFTModal] Calling onBuy...');
      const result = await onBuy();
      console.log('[BuyNFTModal] onBuy result:', result);
      if (result) {
        console.log('[BuyNFTModal] Setting mintedNFT state:', result);
        setMintedNFT(result);
      } else {
        console.log('[BuyNFTModal] No result, closing modal');
        onClose();
      }
    } catch (error) {
      console.error('[BuyNFTModal] Purchase failed:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleClose = () => {
    setMintedNFT(null);
    onClose();
  };

  return (
    <NeonModal
      isOpen={isOpen}
      onClose={handleClose}
      title={mintedNFT ? "Genesis Key Minted!" : "Mint a Genesis Key"}
      icon={mintedNFT ? CheckCircle : ShoppingCart}
      maxWidth="md"
    >
      {mintedNFT ? (
        <div className="p-6 space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-cyan-300 mb-2">Successfully Minted!</h3>
            <p className="text-gray-400 text-sm">Your Genesis Key has been minted</p>
          </div>

          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-cyan-500/30 rounded-lg overflow-hidden max-w-sm mx-auto shadow-xl shadow-cyan-500/20">
            <div className="aspect-square bg-gradient-to-br from-gray-900 via-purple-900/20 to-cyan-900/20 relative overflow-hidden">
              <GuildImage
                imageURI={
                  mintedNFT.metadata?.image 
                    ? mintedNFT.metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/')
                    : groupImageURI
                }
                alt={`${nftName} #${mintedNFT.tokenId}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end p-6">
                <span className="text-cyan-400 font-bold text-2xl font-mono tracking-wider">#{mintedNFT.tokenId}</span>
              </div>
            </div>
            <div className="p-6 bg-gradient-to-b from-gray-900 to-black border-t border-cyan-500/20">
              <p className="text-base font-bold text-cyan-300 mb-2 font-mono">
                {mintedNFT.metadata?.name || `${nftName} #${mintedNFT.tokenId}`}
              </p>
              {mintedNFT.metadata?.description && (
                <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed">
                  {mintedNFT.metadata.description}
                </p>
              )}
            </div>
          </div>

          <NeonButton
            onClick={handleClose}
            variant="cyan"
            className="w-full"
          >
            Close
          </NeonButton>
        </div>
      ) : (
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
      )}
    </NeonModal>
  );
};
