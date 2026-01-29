import { useState, useEffect } from 'react';
import { contractService } from '../utils/contracts';
import { SimpleKeyManager, SimpleCryptoUtils } from '../utils/crypto-simple';

interface CurrentHashIdInfo {
  hashIdToken: string | null;
  hashIdName: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get the current active mailbox's HashID token
 * Matches the current mailbox's public key with on-chain accounts
 */
export const useCurrentHashId = (userAddress: string | null): CurrentHashIdInfo => {
  const [hashIdToken, setHashIdToken] = useState<string | null>(null);
  const [hashIdName, setHashIdName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentHashId = async () => {
      if (!userAddress) {
        setHashIdToken(null);
        setHashIdName(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get current mailbox from localStorage (most recently used)
        const mailboxes = SimpleKeyManager.getMailboxList(userAddress);
        if (mailboxes.length === 0) {
          setError('No mailboxes found');
          setHashIdToken(null);
          setHashIdName(null);
          setLoading(false);
          return;
        }

        // Find most recently used mailbox
        const currentMailbox = mailboxes.reduce((latest, current) => {
          return (current.lastUsed || 0) > (latest.lastUsed || 0) ? current : latest;
        }, mailboxes[0]);

        // Initialize contract service
        await contractService.initializeReadOnlyContracts();

        // Get all accounts for this user
        const accounts = await contractService.getAccounts(userAddress);

        // Find account that matches current mailbox's public key
        const matchingAccount = accounts.find(acc => {
          if (!acc.isActive || !acc.hasHashIDAttached) return false;

          // Compare public keys
          if (currentMailbox.publicKey) {
            return acc.publicKey.toLowerCase() === currentMailbox.publicKey.toLowerCase();
          }

          // Fall back to comparing public key hash
          if (currentMailbox.publicKeyHash) {
            const publicKeyBytes = SimpleCryptoUtils.publicKeyFromHex(acc.publicKey);
            const accountHash = SimpleCryptoUtils.bytesToHex(publicKeyBytes.slice(0, 16));
            return currentMailbox.publicKeyHash === accountHash;
          }

          return false;
        });

        if (matchingAccount) {
          setHashIdToken(matchingAccount.hashIDTokenId.toString());
          setHashIdName(matchingAccount.hashIDName);
        } else {
          setError('Current mailbox does not have a HashID attached');
          setHashIdToken(null);
          setHashIdName(null);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching current HashID:', err);
        setError(err.message || 'Failed to fetch HashID');
        setHashIdToken(null);
        setHashIdName(null);
        setLoading(false);
      }
    };

    fetchCurrentHashId();
  }, [userAddress]);

  return {
    hashIdToken,
    hashIdName,
    loading,
    error
  };
};
