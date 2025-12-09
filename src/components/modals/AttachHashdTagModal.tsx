/**
 * Attach HashdTag Modal
 * 
 * Modal for selecting which account to attach a HashdTag NFT to
 */

import React, { useState, useEffect } from 'react';
import { Link2, AlertCircle, Check } from 'lucide-react';
import { NeonModal, NeonButton } from './NeonModal';
import { contractService } from '../../utils/contracts';
import { SimpleCryptoUtils } from '../../utils/crypto-simple';

interface AvailableAccount {
  index: number;
  publicKey: string;
  publicKeyHash: string;
  displayName: string;
}

interface AttachHashdTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullName: string;
  userAddress: string;
  onSuccess: () => void;
}

export const AttachHashdTagModal: React.FC<AttachHashdTagModalProps> = ({
  isOpen,
  onClose,
  fullName,
  userAddress,
  onSuccess
}) => {
  const [availableAccounts, setAvailableAccounts] = useState<AvailableAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AvailableAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    } else {
      // Reset state when modal closes
      setSelectedAccount(null);
      setError(null);
    }
  }, [isOpen]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const accountCount = await contractService.getAccountCount(userAddress);
      if (accountCount === 0) {
        setError('No account found. Please create an account first.');
        return;
      }
      
      const accounts: AvailableAccount[] = [];
      for (let i = 0; i < accountCount; i++) {
        const account = await contractService.getAccount(userAddress, i);
        if (account.isActive && !account.hasHashdTagAttached) {
          const publicKeyBytes = SimpleCryptoUtils.publicKeyFromHex(account.publicKey);
          const publicKeyHash = SimpleCryptoUtils.bytesToHex(publicKeyBytes.slice(0, 16));
          accounts.push({
            index: i,
            publicKey: account.publicKey,
            publicKeyHash,
            displayName: `Account ${i + 1}`
          });
        }
      }
      
      if (accounts.length === 0) {
        setError('No available accounts. All your accounts already have HashdTags attached.');
      }
      
      setAvailableAccounts(accounts);
      // Auto-select if only one account
      if (accounts.length === 1) {
        setSelectedAccount(accounts[0]);
      }
    } catch (err: any) {
      console.error('Error loading accounts:', err);
      setError(err.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleAttach = async () => {
    if (!selectedAccount) {
      setError('Please select an account to attach to');
      return;
    }
    
    try {
      setProcessing(true);
      setError(null);
      
      const tx = await contractService.attachHashdTag(fullName, selectedAccount.publicKey);
      await tx.wait();
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error attaching HashdTag:', err);
      setError(err.message || 'Failed to attach HashdTag');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <NeonModal
      isOpen={isOpen}
      onClose={onClose}
      title="Attach HashdTag"
      icon={Link2}
      maxWidth="md"
    >
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-400">
          Select which account to attach <span className="text-cyan-400 font-mono font-bold">{fullName}</span> to:
        </p>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          </div>
        ) : availableAccounts.length === 0 ? (
          <div className="text-center py-6">
            <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              No available accounts found.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              All your accounts already have HashdTags attached.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {availableAccounts.map((account) => (
              <button
                key={account.publicKey}
                onClick={() => setSelectedAccount(account)}
                className={`w-full p-4 rounded-lg border transition-all text-left ${
                  selectedAccount?.publicKey === account.publicKey
                    ? 'bg-cyan-500/20 border-cyan-500/50'
                    : 'bg-gray-800/50 border-gray-700/30 hover:border-cyan-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white font-mono">
                      {account.displayName}
                    </p>
                    <p className="text-xs text-gray-500 font-mono mt-1">
                      {account.publicKey.slice(0, 10)}...{account.publicKey.slice(-8)}
                    </p>
                  </div>
                  {selectedAccount?.publicKey === account.publicKey && (
                    <Check className="w-5 h-5 text-cyan-400" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 font-mono flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <NeonButton
            onClick={onClose}
            variant="red"
            className="flex-1"
          >
            Cancel
          </NeonButton>
          <NeonButton
            onClick={handleAttach}
            variant="green"
            className="flex-1"
            disabled={!selectedAccount || processing}
          >
            {processing ? 'Attaching...' : 'Confirm Attach'}
          </NeonButton>
        </div>
      </div>
    </NeonModal>
  );
};
