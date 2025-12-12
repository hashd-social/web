/**
 * Gift NFT Modal
 * 
 * Modal for gifting an NFT to another address
 */

import React, { useState } from 'react';
import { Gift } from 'lucide-react';
import { NeonModal, NeonButton, NeonField } from './NeonModal';

interface GiftNFTModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGift: (recipientAddress: string) => Promise<void>;
}

export const GiftNFTModal: React.FC<GiftNFTModalProps> = ({ 
  isOpen, 
  onClose, 
  onGift 
}) => {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isGifting, setIsGifting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
      setError('Please enter a valid Ethereum address');
      return;
    }
    
    setIsGifting(true);
    setError(null);
    try {
      await onGift(recipientAddress);
      setRecipientAddress('');
      onClose();
    } catch (err: any) {
      console.error('Gift failed:', err);
      setError(err.message || 'Failed to gift NFT');
    } finally {
      setIsGifting(false);
    }
  };

  const handleClose = () => {
    setRecipientAddress('');
    setError(null);
    onClose();
  };

  return (
    <NeonModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Gift NFT"
      icon={Gift}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <NeonField label="Recipient Address">
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 font-mono text-sm transition-colors border border-gray-700/30"
            placeholder="0x..."
            required
            disabled={isGifting}
          />
        </NeonField>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 font-mono">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <NeonButton
            onClick={handleClose}
            variant="red"
            className="flex-1"
            disabled={isGifting}
          >
            Cancel
          </NeonButton>
          <NeonButton
            type="submit"
            disabled={isGifting || !recipientAddress}
            variant="purple"
            className="flex-1"
          >
            {isGifting ? 'Gifting...' : 'Gift NFT'}
          </NeonButton>
        </div>
      </form>
    </NeonModal>
  );
};
