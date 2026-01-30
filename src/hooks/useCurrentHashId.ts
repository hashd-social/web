import { useState, useEffect } from 'react';
import { contractService } from '../utils/contracts';
import { SimpleKeyManager, SimpleCryptoUtils } from '../utils/crypto-simple';

interface CurrentHashIdInfo {
  hashIdToken: string | null;
  hashIdName: string | null;
  accountIndex: number | null;
  publicKey: string | null;
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
  const [accountIndex, setAccountIndex] = useState<number | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    const fetchCurrentHashId = async () => {
      if (!userAddress) {
        setHashIdToken(null);
        setHashIdName(null);
        setAccountIndex(null);
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
          setAccountIndex(null);
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
        
        console.log('[useCurrentHashId] Current mailbox:', {
          publicKeyHash: currentMailbox.publicKeyHash,
          name: currentMailbox.name
        });
        console.log('[useCurrentHashId] Blockchain accounts:', accounts.map(acc => ({
          publicKey: acc.publicKey,
          hasHashID: acc.hasHashIDAttached,
          hashIDName: acc.hashIDName,
          tokenId: acc.hashIDTokenId.toString()
        })));

        // Find account that matches current mailbox's public key hash and get its index
        let matchingAccount = null;
        let matchingIndex = -1;
        
        for (let i = 0; i < accounts.length; i++) {
          const acc = accounts[i];
          if (!acc.isActive || !acc.hasHashIDAttached) continue;

          // Compare public key hash (first 16 bytes of public key)
          if (currentMailbox.publicKeyHash) {
            const publicKeyBytes = SimpleCryptoUtils.publicKeyFromHex(acc.publicKey);
            const accountHash = SimpleCryptoUtils.bytesToHex(publicKeyBytes.slice(0, 16));
            if (currentMailbox.publicKeyHash === accountHash) {
              matchingAccount = acc;
              matchingIndex = i;
              break;
            }
          }
        }

        console.log('[useCurrentHashId] Matching account:', matchingAccount ? {
          hashIDName: matchingAccount.hashIDName,
          tokenId: matchingAccount.hashIDTokenId.toString(),
          publicKey: matchingAccount.publicKey,
          accountIndex: matchingIndex
        } : 'NOT FOUND');

        if (matchingAccount && matchingIndex >= 0) {
          setHashIdToken(matchingAccount.hashIDTokenId.toString());
          setHashIdName(matchingAccount.hashIDName);
          setAccountIndex(matchingIndex);
          setPublicKey(matchingAccount.publicKey);
        } else {
          setError('Current mailbox does not have a HashID attached');
          setHashIdToken(null);
          setHashIdName(null);
          setAccountIndex(null);
          setPublicKey(null);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching current HashID:', err);
        setError(err.message || 'Failed to fetch HashID');
        setHashIdToken(null);
        setHashIdName(null);
        setAccountIndex(null);
        setPublicKey(null);
        setLoading(false);
      }
    };

    fetchCurrentHashId();
  }, [userAddress]);

  return {
    hashIdToken,
    hashIdName,
    accountIndex,
    publicKey,
    loading,
    error
  };
};
