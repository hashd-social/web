import React, { useState, useEffect } from 'react';
import { X, Gift, CheckCircle, AlertCircle } from 'lucide-react';
import { ethers } from 'ethers';
import confetti from 'canvas-confetti';
import { Spinner, LoadingState } from '../Spinner';

interface ClaimAirdropModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  userAddress: string;
  onClaim: (amount: string, proof: string[]) => Promise<void>;
}

export const ClaimAirdropModal: React.FC<ClaimAirdropModalProps> = ({
  isOpen,
  onClose,
  tokenAddress,
  tokenName,
  tokenSymbol,
  userAddress,
  onClaim
}) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimableAmount, setClaimableAmount] = useState<string | null>(null);
  const [proof, setProof] = useState<string[] | null>(null);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkAirdrop();
    }
  }, [isOpen, tokenAddress, userAddress]);

  const triggerConfetti = () => {
    // Fire confetti from multiple angles for a celebration effect
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

  const checkAirdrop = async () => {
    try {
      setIsChecking(true);
      setError('');

      console.log('🔍 Checking airdrop for:', userAddress);
      console.log('🔍 Token address:', tokenAddress);

      // Get airdrop data from localStorage
      const storageKey = `airdrop_${tokenAddress.toLowerCase()}`;
      console.log('🔍 Looking for localStorage key:', storageKey);
      const airdropData = localStorage.getItem(storageKey);
      
      if (!airdropData) {
        console.log('❌ No airdrop data found in localStorage');
        console.log('📦 Available keys:', Object.keys(localStorage));
        setError('No airdrop found for this token. Distribution may not have been set yet.');
        setIsChecking(false);
        return;
      }

      console.log('✅ Found airdrop data');
      const { proofs, recipients } = JSON.parse(airdropData);
      console.log('📊 Recipients:', recipients.length);
      console.log('📊 Proofs:', Object.keys(proofs).length);
      
      const userProof = proofs[userAddress.toLowerCase()];
      
      if (!userProof) {
        console.log('❌ No proof found for user');
        console.log('📋 Available addresses:', Object.keys(proofs));
        setError('You are not eligible for this airdrop');
        setIsChecking(false);
        return;
      }

      console.log('✅ Found user proof:', userProof);
      console.log('📊 Proof length:', userProof.length);
      console.log('📊 Proof array:', JSON.stringify(userProof));

      // Find user's allocation
      const recipient = recipients.find(
        (r: any) => r.address.toLowerCase() === userAddress.toLowerCase()
      );

      if (!recipient) {
        console.log('❌ User not in recipients list');
        setError('You are not eligible for this airdrop');
        setIsChecking(false);
        return;
      }

      console.log('✅ Found recipient allocation:', recipient.amount);
      console.log('📊 Recipient object:', JSON.stringify(recipient));

      // Check if already claimed (from contract)
      if (!window.ethereum) {
        setError('Please install MetaMask');
        setIsChecking(false);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function hasClaimed(address) view returns (bool)',
          'function merkleRoot() view returns (bytes32)'
        ],
        provider
      );

      const claimed = await tokenContract.hasClaimed(userAddress);
      const merkleRoot = await tokenContract.merkleRoot();

      if (merkleRoot === ethers.ZeroHash) {
        setError('Airdrop has not been activated yet');
        setIsChecking(false);
        return;
      }

      if (claimed) {
        setHasClaimed(true);
      } else {
        // Special case: single recipient with empty proof
        if (userProof.length === 0 && recipients.length === 1) {
          console.log('⚠️ Single recipient detected - merkle root IS the leaf');
          console.log('📊 This should work with empty proof array');
        }
        
        setClaimableAmount(recipient.amount);
        setProof(userProof);
        
        // 🎉 Trigger confetti celebration!
        triggerConfetti();
      }

      setIsChecking(false);
    } catch (err: any) {
      console.error('Check airdrop error:', err);
      setError(err.message || 'Failed to check airdrop eligibility');
      setIsChecking(false);
    }
  };

  const handleClaim = async () => {
    if (!claimableAmount || !proof) return;

    try {
      setIsClaiming(true);
      setError('');

      await onClaim(claimableAmount, proof);

      setSuccess(true);
      setHasClaimed(true);
    } catch (err: any) {
      console.error('Claim error:', err);
      setError(err.message || 'Failed to claim tokens');
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900/95 rounded-lg shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-cyan-900/30 border-b border-cyan-500/30 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <Gift className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-xl font-bold neon-text-cyan uppercase tracking-wider font-mono">Token Airdrop</h2>
              <p className="text-sm text-gray-400 font-mono">{tokenName} ({tokenSymbol})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isChecking ? (
            <LoadingState message="Checking eligibility..." />
          ) : success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold neon-text-cyan mb-2 uppercase tracking-wider font-mono">Claimed Successfully!</h3>
              <p className="text-gray-300 mb-2 font-mono">
                You received {parseFloat(claimableAmount!).toLocaleString()} {tokenSymbol}
              </p>
              <button
                onClick={onClose}
                className="mt-4 w-full px-6 py-3 bg-cyan-500/10 hover:border-cyan-500/50 neon-text-cyan rounded-lg transition-all font-bold font-mono uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          ) : hasClaimed ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold neon-text-cyan mb-2 uppercase tracking-wider font-mono">Already Claimed</h3>
              <p className="text-gray-300 font-mono">
                You have already claimed your airdrop for this token.
              </p>
              <button
                onClick={onClose}
                className="mt-4 w-full px-6 py-3 bg-gray-700/50 hover:border-gray-500/50 text-gray-300 rounded-lg transition-all font-bold font-mono uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-red-400 mb-2 uppercase tracking-wider font-mono">Not Eligible</h3>
              <p className="text-gray-300 mb-4 font-mono">{error}</p>
              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-gray-700/50 hover:border-gray-500/50 text-gray-300 rounded-lg transition-all font-bold font-mono uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Claimable Amount */}
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6 mb-6">
                <p className="text-sm text-green-400 mb-2 uppercase tracking-wider font-mono font-bold">You can claim</p>
                <p className="text-3xl font-bold text-green-400 font-mono">
                  {parseFloat(claimableAmount!).toLocaleString()}
                </p>
                <p className="text-lg text-green-400 font-mono">{tokenSymbol}</p>
              </div>

              {/* Info */}
              <div className="bg-cyan-900/20 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-300">
                    <p className="font-bold mb-1 text-cyan-400 uppercase tracking-wider font-mono">Important:</p>
                    <ul className="list-disc list-inside space-y-1 font-mono">
                      <li>You can only claim once</li>
                      <li>Tokens will be transferred to your wallet</li>
                      <li>This action requires a transaction</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isClaiming}
                  className="flex-1 px-6 py-3 bg-gray-700/50 hover:border-gray-500/50 text-gray-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold font-mono uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClaim}
                  disabled={isClaiming}
                  className="flex-1 px-6 py-3 bg-cyan-500/10 hover:border-cyan-500/50 neon-text-cyan rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold font-mono uppercase tracking-wider"
                >
                  {isClaiming ? (
                    <>
                      <Spinner size="sm" color="white" />
                      Claiming...
                    </>
                  ) : (
                    'Claim Tokens'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
