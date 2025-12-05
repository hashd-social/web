import { useState } from 'react';
import { ethers } from 'ethers';
import { contractService } from '../utils/contracts';
import { SimpleKeyManager, SimpleCryptoUtils, CryptoKeyPair } from '../utils/crypto-simple';

export const useMailboxSwitch = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMailbox = async (pin: string): Promise<{ success: boolean; keyPair?: CryptoKeyPair; error?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      console.log('🔄 Regenerating keys for mailbox switch...');
      const keyPair = await SimpleKeyManager.generateDeterministicKeys(signer, address, pin);

      const publicKeyHex = SimpleCryptoUtils.publicKeyToHex(keyPair.publicKey);
      console.log('🔍 Looking up account info for public key:', publicKeyHex);

      // Check if this account exists on-chain
      let accountExists = false;
      let accountName = '';

      try {
        // First check if there's a bare account with this public key
        const hasBareAccount = await contractService.hasBareAccount(address);
        if (hasBareAccount) {
          const bareAccountPubKey = await contractService.getPublicKeyByAddress(address);
          if (bareAccountPubKey.toLowerCase() === publicKeyHex.toLowerCase()) {
            accountExists = true;
            accountName = 'Bare Account';
            console.log('✅ Found matching bare account');
          }
        }

        // If not a bare account, check named accounts
        if (!accountExists) {
          const namedAccounts = await contractService.getOwnerNamedAccounts(address);
          console.log('📋 Found named accounts:', namedAccounts);

          // Match public key to find the correct named account
          for (const namedAccount of namedAccounts) {
            try {
              const accountPubKey = await contractService.getPublicKeyByName(namedAccount);
              if (accountPubKey.toLowerCase() === publicKeyHex.toLowerCase()) {
                accountExists = true;
                accountName = namedAccount;
                console.log('✅ Found matching named account:', accountName);
                break;
              }
            } catch (error) {
              console.warn('Could not check named account:', namedAccount, error);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error checking account existence:', error);
      }

      // If account doesn't exist on-chain, show error
      if (!accountExists) {
        console.log('❌ No account found for this PIN + wallet combination');
        const errorMsg = 'No account found with this PIN. Please create a new account.';
        setError(errorMsg);
        setLoading(false);
        return { success: false, error: errorMsg };
      }

      // Account exists - save and switch to this mailbox
      const displayName = accountName || 'Account';
      SimpleKeyManager.saveMailboxKeys(pin, keyPair, displayName);
      SimpleKeyManager.switchMailbox(pin);

      console.log('🔄 Switching to mailbox:', displayName);
      console.log('📍 Public key:', publicKeyHex);

      setLoading(false);
      return { success: true, keyPair };
    } catch (error) {
      console.error('❌ Failed to switch mailbox:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to access mailbox';
      setError(errorMsg);
      setLoading(false);
      return { success: false, error: errorMsg };
    }
  };

  const clearError = () => setError(null);

  return {
    switchMailbox,
    loading,
    error,
    clearError,
  };
};
