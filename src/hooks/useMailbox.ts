import { useState, useEffect, useCallback } from 'react';
import { SimpleKeyManager, MailboxInfo } from '../utils/crypto-simple';
import { contractService } from '../utils/contracts';

export const useMailbox = (userAddress: string | null) => {
  const [mailboxes, setMailboxes] = useState<MailboxInfo[]>([]);
  const [currentMailbox, setCurrentMailbox] = useState<MailboxInfo | null>(null);

  const refreshMailboxes = useCallback(async () => {
    if (!userAddress) {
      setMailboxes([]);
      setCurrentMailbox(null);
      return;
    }

    try {
      const allMailboxes = SimpleKeyManager.getMailboxList();
      setMailboxes(allMailboxes);

      const currentPin = SimpleKeyManager.getCurrentMailboxPin();
      if (currentPin) {
        const current = allMailboxes.find(m => m.pin === currentPin);
        if (current) {
          setCurrentMailbox(current);
        } else if (allMailboxes.length > 0) {
          setCurrentMailbox(allMailboxes[0]);
        }
      } else if (allMailboxes.length > 0) {
        setCurrentMailbox(allMailboxes[0]);
      }
    } catch (error) {
      console.error('Failed to refresh mailboxes:', error);
    }
  }, [userAddress]);

  // Resolve actual account names from blockchain
  const resolveMailboxAccountNames = useCallback(async () => {
    if (!userAddress) return;

    try {
      const namedAccounts = await contractService.getOwnerNamedAccounts(userAddress);
      console.log('📋 Named accounts for wallet:', namedAccounts);

      const updatedMailboxes = await Promise.all(
        mailboxes.map(async (mailbox) => {
          try {
            for (const namedAccount of namedAccounts) {
              const accountPubKey = await contractService.getPublicKeyByName(namedAccount);
              if (accountPubKey.toLowerCase() === mailbox.publicKeyHash.toLowerCase()) {
                return { ...mailbox, name: namedAccount };
              }
            }
          } catch (error) {
            console.warn('Could not resolve name for mailbox:', mailbox.name, error);
          }
          return mailbox;
        })
      );

      setMailboxes(updatedMailboxes);

      if (currentMailbox) {
        const updatedCurrent = updatedMailboxes.find(
          (m) => m.publicKeyHash === currentMailbox.publicKeyHash
        );
        if (updatedCurrent) {
          setCurrentMailbox(updatedCurrent);
        }
      }
    } catch (error) {
      console.error('Failed to resolve mailbox names:', error);
    }
  }, [userAddress, mailboxes, currentMailbox]);

  useEffect(() => {
    refreshMailboxes();
  }, [refreshMailboxes]);

  return {
    mailboxes,
    currentMailbox,
    refreshMailboxes,
    resolveMailboxAccountNames,
  };
};
