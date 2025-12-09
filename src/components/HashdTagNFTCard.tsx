import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Link2, Unlink, Send, AlertCircle } from 'lucide-react';
import { contractService } from '../utils/contracts';
import { ethers } from 'ethers';

interface HashdTagNFTCardProps {
  tokenId: string;
  fullName: string;
  domain: string;
  tokenURI: string;
  userAddress: string;
  onRefresh?: () => void;
}

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export const HashdTagNFTCard: React.FC<HashdTagNFTCardProps> = ({
  tokenId,
  fullName,
  domain,
  tokenURI,
  userAddress,
  onRefresh
}) => {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isAttached, setIsAttached] = useState(false);
  const [checkingAttachment, setCheckingAttachment] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferAddress, setTransferAddress] = useState('');
  const [showTransferInput, setShowTransferInput] = useState(false);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setLoading(true);
        
        // Parse data URI (format: data:application/json;base64,...)
        if (tokenURI.startsWith('data:application/json;base64,')) {
          const base64Data = tokenURI.split(',')[1];
          const jsonString = atob(base64Data);
          const parsedMetadata = JSON.parse(jsonString);
          setMetadata(parsedMetadata);
        } else {
          console.error('Unexpected tokenURI format:', tokenURI);
        }
      } catch (error) {
        console.error('Error loading NFT metadata:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMetadata();
  }, [tokenURI]);

  useEffect(() => {
    const checkAttachment = async () => {
      try {
        setCheckingAttachment(true);
        const attached = await contractService.isHashdTagAttached(fullName);
        setIsAttached(attached);
      } catch (error) {
        console.error('Error checking attachment status:', error);
      } finally {
        setCheckingAttachment(false);
      }
    };

    checkAttachment();
  }, [fullName]);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleDetach = async () => {
    try {
      setProcessing(true);
      setError(null);
      
      const tx = await contractService.detachHashdTag(fullName);
      await tx.wait();
      
      setIsAttached(false);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Error detaching HashdTag:', error);
      setError(error.message || 'Failed to detach HashdTag');
    } finally {
      setProcessing(false);
    }
  };

  const handleAttach = async () => {
    try {
      setProcessing(true);
      setError(null);
      
      // Get accounts and find one without a HashdTag attached
      const accountCount = await contractService.getAccountCount(userAddress);
      if (accountCount === 0) {
        throw new Error('No account found. Please create an account first.');
      }
      
      // Find an active account without a HashdTag attached
      let publicKey = '';
      for (let i = 0; i < accountCount; i++) {
        const account = await contractService.getAccount(userAddress, i);
        if (account.isActive && !account.hasHashdTagAttached) {
          publicKey = account.publicKey;
          break;
        }
      }
      
      if (!publicKey) {
        throw new Error('No available account found to attach HashdTag. All accounts already have HashdTags attached.');
      }
      
      const tx = await contractService.attachHashdTag(fullName, publicKey);
      await tx.wait();
      
      setIsAttached(true);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Error attaching HashdTag:', error);
      setError(error.message || 'Failed to attach HashdTag');
    } finally {
      setProcessing(false);
    }
  };

  const handleTransfer = async () => {
    try {
      if (!transferAddress || !ethers.isAddress(transferAddress)) {
        setError('Please enter a valid Ethereum address');
        return;
      }
      
      setProcessing(true);
      setError(null);
      
      const tx = await contractService.transferHashdTag(userAddress, transferAddress, tokenId);
      await tx.wait();
      
      setShowTransferInput(false);
      setTransferAddress('');
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Error transferring HashdTag:', error);
      setError(error.message || 'Failed to transfer HashdTag');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30 animate-pulse">
        <div className="aspect-square bg-gray-700/50 rounded-lg mb-3"></div>
        <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 border border-red-500/30">
        <p className="text-sm text-red-400 font-mono">Failed to load NFT metadata</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-800/50 rounded-lg p-4 border border-cyan-500/30 hover:border-cyan-500/50 transition-all group">
        {/* NFT Image */}
        <div className="aspect-square bg-gray-900/50 rounded-lg mb-3 overflow-hidden relative">
          {!imageError && metadata.image ? (
            metadata.image.startsWith('data:image/svg+xml;base64,') ? (
              <img
                src={metadata.image}
                alt={metadata.name}
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            ) : (
              <div
                className="w-full h-full"
                dangerouslySetInnerHTML={{
                  __html: atob(metadata.image.split(',')[1])
                }}
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-gray-600" />
            </div>
          )}
          
          {/* Attachment Status Badge */}
          <div className="absolute top-2 right-2">
            {checkingAttachment ? (
              <div className="px-2 py-1 bg-gray-800/80 rounded text-xs font-mono text-gray-400">
                ...
              </div>
            ) : isAttached ? (
              <div className="px-2 py-1 bg-green-500/20 border border-green-500/50 rounded text-xs font-bold font-mono text-green-400">
                ACTIVE
              </div>
            ) : (
              <div className="px-2 py-1 bg-orange-500/20 border border-orange-500/50 rounded text-xs font-bold font-mono text-orange-400">
                INACTIVE
              </div>
            )}
          </div>
        </div>

        {/* NFT Info */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-white font-mono truncate">
            {metadata.name}
          </h4>
          
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-mono">Token ID:</span>
              <span className="text-gray-300 font-mono truncate ml-2" title={tokenId}>
                {tokenId.slice(0, 8)}...{tokenId.slice(-6)}
              </span>
            </div>
            
            {/* Domain and Length as text */}
            {metadata.attributes && metadata.attributes.length > 0 && (
              <>
                {metadata.attributes.map((attr, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-gray-400 font-mono">{attr.trait_type}:</span>
                    <span className="text-gray-300 font-mono font-bold">{attr.value}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 font-mono flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-3 space-y-2">
            {isAttached ? (
              <button
                onClick={handleDetach}
                disabled={processing}
                className="w-full px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30 hover:border-orange-500/50 transition-all text-xs font-bold font-mono uppercase flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Unlink className="w-4 h-4" />
                {processing ? 'Detaching...' : 'Detach'}
              </button>
            ) : (
              <button
                onClick={handleAttach}
                disabled={processing}
                className="w-full px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 hover:border-green-500/50 transition-all text-xs font-bold font-mono uppercase flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Link2 className="w-4 h-4" />
                {processing ? 'Attaching...' : 'Attach'}
              </button>
            )}
            
            {!showTransferInput ? (
              <button
                onClick={() => setShowTransferInput(true)}
                disabled={processing}
                className="w-full px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30 hover:border-cyan-500/50 transition-all text-xs font-bold font-mono uppercase flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                Transfer
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={transferAddress}
                  onChange={(e) => setTransferAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/30 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500/50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleTransfer}
                    disabled={processing}
                    className="flex-1 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30 hover:border-cyan-500/50 transition-all text-xs font-bold font-mono uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? 'Sending...' : 'Send'}
                  </button>
                  <button
                    onClick={() => {
                      setShowTransferInput(false);
                      setTransferAddress('');
                      setError(null);
                    }}
                    disabled={processing}
                    className="px-3 py-2 bg-gray-700/30 hover:bg-gray-700/50 text-gray-400 rounded-lg border border-gray-700/30 hover:border-gray-700/50 transition-all text-xs font-bold font-mono uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </>
  );
};
