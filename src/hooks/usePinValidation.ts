import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { contractService } from '../utils/contracts';
import { SimpleKeyManager, SimpleCryptoUtils } from '../utils/crypto-simple';

export const usePinValidation = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const checkPinAvailability = useCallback(async (pinToCheck: string, accountName?: string) => {
    if (pinToCheck.length < 4) {
      setError('');
      return;
    }

    setIsChecking(true);
    setError('');

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const keyPair = await SimpleKeyManager.generateDeterministicKeys(signer, address, pinToCheck);
      const publicKeyHash = SimpleCryptoUtils.bytesToHex(keyPair.publicKey);

      // Check localStorage for duplicates
      const existingMailboxes = SimpleKeyManager.getMailboxList();
      const duplicateMailbox = existingMailboxes.find((m) => m.publicKeyHash === publicKeyHash);

      if (duplicateMailbox) {
        setError(
          `This PIN is already used for mailbox "${duplicateMailbox.name}". Please use a different PIN or switch to that mailbox.`
        );
        setIsChecking(false);
        return;
      }

      // Check blockchain
      const keyHex = SimpleCryptoUtils.publicKeyToHex(keyPair.publicKey);

      // Check all accounts for this address
      try {
        const accountCount = await contractService.getAccountCount(address);
        for (let i = 0; i < accountCount; i++) {
          const account = await contractService.getAccount(address, i);
          if (account.isActive && account.publicKey.toLowerCase() === keyHex.toLowerCase()) {
            const accountName = account.hashIDName || `Account ${i + 1}`;
            setError(`This PIN is already used for "${accountName}". Please use a different PIN.`);
            setIsChecking(false);
            return;
          }
        }
      } catch (error) {
        console.log('Error checking accounts:', error);
      }

      // Check HashID accounts
      const allHashIDs = await contractService.getOwnerHashIDs(address);

      for (const existingAccount of allHashIDs) {
        try {
          const existingPubKey = await contractService.getPublicKeyByName(existingAccount);

          if (existingPubKey.toLowerCase() === keyHex.toLowerCase()) {
            const fullAccountName = accountName ? `${accountName}.mega` : '';

            if (existingAccount === fullAccountName) {
              // Same account, allow re-registration
              console.log('✅ Re-registering existing named account:', existingAccount);
            } else {
              // Different account with same PIN - NOT ALLOWED
              setError(
                `This PIN is already used for named account "${existingAccount}". Please use a different PIN or access that account instead.`
              );
              setIsChecking(false);
              return;
            }
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes('This PIN is already used')) {
            throw error;
          }
          console.warn('Could not check named account:', existingAccount, error);
        }
      }

      setError('');
    } catch (error) {
      console.error('Failed to check PIN availability:', error);
      if (error instanceof Error && error.message.includes('This PIN is already used')) {
        setError(error.message);
      }
    } finally {
      setIsChecking(false);
    }
  }, []);

  const validateAndSetPin = useCallback(
    (input: string, accountName?: string) => {
      const validPin = input.replace(/\D/g, '').slice(0, 8);
      setPin(validPin);

      if (validPin.length >= 4) {
        checkPinAvailability(validPin, accountName);
      } else {
        setError('');
      }

      return validPin;
    },
    [checkPinAvailability]
  );

  const clearPin = useCallback(() => {
    setPin('');
    setError('');
  }, []);

  const isValid = pin.length >= 4 && pin.length <= 8 && !error;

  return {
    pin,
    error,
    isChecking,
    isValid,
    validateAndSetPin,
    checkPinAvailability,
    clearPin,
  };
};
