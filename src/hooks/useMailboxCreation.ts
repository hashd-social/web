import { useState } from 'react';
import { ethers } from 'ethers';
import { contractService } from '../utils/contracts';
import { SimpleKeyManager, SimpleCryptoUtils } from '../utils/crypto-simple';

// Retry transaction with nonce and "already known" handling
async function retryTransaction<T extends ethers.ContractTransactionResponse>(
  txFunction: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const tx = await txFunction();
      return tx;
    } catch (error: any) {
      const isNonceError = 
        error?.code === 'NONCE_EXPIRED' || 
        error?.info?.error?.message?.includes('nonce') ||
        error?.message?.includes('nonce');
      
      const isAlreadyKnown = 
        error?.code === -32603 ||
        error?.error?.message?.includes('already known') ||
        error?.message?.includes('already known');
      
      if (isAlreadyKnown) {
        console.warn('⚠️ Transaction already in mempool, waiting for confirmation...');
        // On MegaETH, blocks are fast (~10ms), wait 1 second for it to clear
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (attempt < maxRetries - 1) {
          console.log('Retrying transaction...');
          continue;
        }
        throw new Error('Transaction already pending. Please wait a moment and try again.');
      }
      
      if (isNonceError && attempt < maxRetries - 1) {
        console.warn(`Nonce error detected, retrying (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Transaction failed after retries');
}

export interface CreationProgress {
  currentStep: number;
  steps: {
    title: string;
    description: string;
    status: 'pending' | 'active' | 'completed' | 'error';
  }[];
}

export interface IncompleteRegistration {
  accountName: string;
  domain: string;
  fullName: string;
}

export const useMailboxCreation = () => {
  const [creationProgress, setCreationProgress] = useState<CreationProgress | null>(null);
  const [incompleteRegistration, setIncompleteRegistration] = useState<IncompleteRegistration | null>(null);

  const detectIncompleteRegistration = async (
    address: string,
    accountName: string,
    domain: string
  ): Promise<{ needsRecovery: boolean; publicKey?: string; fullName?: string }> => {
    try {
      const fullName = `${accountName}@${domain}`;
      const hashIDAccount = await contractService.getHashIDAccount(fullName);

      if (!hashIDAccount.isActive || hashIDAccount.owner === ethers.ZeroAddress) {
        return { needsRecovery: false };
      }

      if (hashIDAccount.owner.toLowerCase() !== address.toLowerCase()) {
        throw new Error(
          `Account ${fullName} is owned by a different wallet (${hashIDAccount.owner}). This may indicate front-running or the name was already taken.`
        );
      }

      const keyExists = await contractService.hasKey(address, hashIDAccount.publicKey);

      if (!keyExists) {
        return {
          needsRecovery: true,
          publicKey: hashIDAccount.publicKey,
          fullName,
        };
      }

      return { needsRecovery: false };
    } catch (error) {
      if (error instanceof Error && error.message.includes('owned by a different wallet')) {
        throw error;
      }
      return { needsRecovery: false };
    }
  };

  const createMailbox = async (
    pin: string,
    name: string,
    accountName?: string,
    domain?: string,
    isFirstMailbox: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    const steps = [
      {
        title: 'Derive Keys',
        description: 'Sign in wallet to generate your encryption keys',
        status: 'active' as const,
      },
      {
        title: 'Verify',
        description: accountName && domain ? `Check ${accountName}@${domain} availability` : 'Ensure keys are unique',
        status: 'pending' as const,
      },
      {
        title: 'Create Account',
        description: accountName && domain ? `Transaction: Register ${accountName}@${domain}` : 'Transaction: Create account on-chain',
        status: 'pending' as const,
      },
      {
        title: 'Link Keys',
        description: 'Transaction: Store public key on-chain',
        status: 'pending' as const,
      },
    ];

    setCreationProgress({ currentStep: 0, steps });

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const newKeyPair = await SimpleKeyManager.generateDeterministicKeys(signer, address, pin);

      // Step 1 complete
      setCreationProgress((prev) =>
        prev
          ? {
              ...prev,
              currentStep: 1,
              steps: prev.steps.map((step, idx) => ({
                ...step,
                status: idx === 0 ? ('completed' as const) : idx === 1 ? ('active' as const) : step.status,
              })),
            }
          : null
      );

      const keyHex = SimpleCryptoUtils.publicKeyToHex(newKeyPair.publicKey);
      const newPublicKeyHash = SimpleCryptoUtils.bytesToHex(newKeyPair.publicKey.slice(0, 16));

      // Check localStorage for duplicates
      const existingMailboxes = SimpleKeyManager.getMailboxList(address);
      const duplicateMailbox = existingMailboxes.find((m) => m.publicKeyHash === newPublicKeyHash);

      if (duplicateMailbox && !isFirstMailbox) {
        throw new Error(
          `This PIN generates the same keys as mailbox "${duplicateMailbox.name}". Please use a different PIN.`
        );
      }

      // Check blockchain for existing key registration
      const keyAlreadyRegistered = await contractService.hasKey(address, keyHex);
      if (keyAlreadyRegistered) {
        throw new Error(
          `This PIN has already been used to create a mailbox. The public key is already registered on-chain. Please use a different PIN.`
        );
      }

      // Check blockchain for existing registrations
      if (accountName && domain) {
        const recoveryInfo = await detectIncompleteRegistration(address, accountName, domain);

        if (recoveryInfo.needsRecovery) {
          // Handle incomplete registration recovery
          setCreationProgress((prev) =>
            prev
              ? {
                  ...prev,
                  currentStep: 3,
                  steps: [
                    { title: 'Generate Keys', description: 'Keys already generated', status: 'completed' as const },
                    {
                      title: 'Check Availability',
                      description: '⚠️ Found incomplete registration - recovering',
                      status: 'completed' as const,
                    },
                    {
                      title: 'Register Account',
                      description: `${recoveryInfo.fullName} already registered (paid)`,
                      status: 'completed' as const,
                    },
                    {
                      title: 'Register Keys',
                      description: 'Completing registration: Linking keys to account',
                      status: 'active' as const,
                    },
                  ],
                }
              : null
          );

          if (!recoveryInfo.publicKey || recoveryInfo.publicKey.toLowerCase() !== keyHex.toLowerCase()) {
            throw new Error(
              'PIN mismatch! The registered account was created with a different PIN. Please use the correct PIN or choose a different name.'
            );
          }

          console.log('📝 Registering key in KeyRegistry (recovery)...');
          const tx = await retryTransaction(() => contractService.registerKey(keyHex, name));
          
          console.log('⏳ Waiting for KeyRegistered event...');
          const keyReceipt = await tx.wait();
          
          if (!keyReceipt || keyReceipt.status !== 1) {
            throw new Error('Key registration failed on-chain');
          }
          
          console.log('✅ KeyRegistered event confirmed in block', keyReceipt.blockNumber);

          const displayName = `${accountName}@${domain}`;
          SimpleKeyManager.saveMailboxKeys(pin, newKeyPair, displayName, address);

          setCreationProgress((prev) =>
            prev
              ? {
                  ...prev,
                  currentStep: 4,
                  steps: prev.steps.map((step) => ({
                    ...step,
                    status: 'completed' as const,
                  })),
                }
              : null
          );

          return { success: true };
        }

        // Check availability
        const isAvailable = await contractService.isNameAvailable(accountName, domain);
        if (!isAvailable) {
          throw new Error(`Name ${accountName}@${domain} is already taken. Please choose a different name.`);
        }

        // Calculate fee
        const fee = await contractService.calculateNameFee(accountName, domain);
        const isFirstAccount = existingMailboxes.length === 0;
        const isFreeEligible = isFirstAccount && accountName.length >= 5;

        // Step 2 complete
        setCreationProgress((prev) =>
          prev
            ? {
                ...prev,
                currentStep: 2,
                steps: prev.steps.map((step, idx) => ({
                  ...step,
                  status: idx <= 1 ? ('completed' as const) : idx === 2 ? ('active' as const) : step.status,
                })),
              }
            : null
        );

        // Register account with HashID with retry
        const namedTx = await retryTransaction(() => 
          contractService.registerAccountWithHashID(
            accountName,
            domain,
            keyHex,
            isFreeEligible ? BigInt(0) : fee
          )
        );
        
        console.log('⏳ Waiting for AccountWithHashIDRegistered event...');
        const receipt = await namedTx.wait();
        
        if (!receipt || receipt.status !== 1) {
          throw new Error('Named account registration failed on-chain');
        }
        
        console.log('✅ NamedAccountRegistered event confirmed in block', receipt.blockNumber);
      }

      // Step 3 complete
      setCreationProgress((prev) =>
        prev
          ? {
              ...prev,
              currentStep: 3,
              steps: prev.steps.map((step, idx) => ({
                ...step,
                status: idx <= 2 ? ('completed' as const) : idx === 3 ? ('active' as const) : step.status,
              })),
            }
          : null
      );

      // Register keys with retry
      console.log('📝 Registering key in KeyRegistry...');
      const tx = await retryTransaction(() => contractService.registerKey(keyHex, name));
      
      console.log('⏳ Waiting for KeyRegistered event...');
      const keyReceipt = await tx.wait();
      
      if (!keyReceipt || keyReceipt.status !== 1) {
        throw new Error('Key registration failed on-chain');
      }
      
      console.log('✅ KeyRegistered event confirmed in block', keyReceipt.blockNumber);

      const displayName = accountName && domain && !isFirstMailbox ? `${accountName}@${domain}` : name;
      SimpleKeyManager.saveMailboxKeys(pin, newKeyPair, displayName, address);

      // Step 4 complete
      setCreationProgress((prev) =>
        prev
          ? {
              ...prev,
              currentStep: 4,
              steps: prev.steps.map((step) => ({
                ...step,
                status: 'completed' as const,
              })),
            }
          : null
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to create mailbox:', error);

      setCreationProgress((prev) =>
        prev
          ? {
              ...prev,
              steps: prev.steps.map((step, idx) => ({
                ...step,
                status: idx === prev.currentStep ? ('error' as const) : step.status,
              })),
            }
          : null
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create mailbox',
      };
    }
  };

  const clearProgress = () => {
    setCreationProgress(null);
  };

  return {
    creationProgress,
    incompleteRegistration,
    setIncompleteRegistration,
    createMailbox,
    clearProgress,
    detectIncompleteRegistration,
  };
};
