import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { contractService, cidToBytes32 } from '../../utils/contracts';
import { ipfsService } from '../../services/ipfs/messaging';
import { SimpleCryptoUtils, CryptoKeyPair } from '../../utils/crypto-simple';
import { createSignedMessage, generateThreadId, SignedMessage } from '../../utils/messageChain';
import { ContractErrorHandler } from '../../utils/contractErrors';
import { Lock, CheckCircle, XCircle, Shield, Loader2, Download, ExternalLink, Database, FileJson, Send as SendIcon, Zap } from 'lucide-react';
import { NeonModal, NeonField, NeonButton } from './NeonModal';
import { MatrixNotify } from '../MatrixNotify';
import { useSettingsStore } from '../../store/settingsStore';

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

interface SendMessageProps {
  userAddress: string;
  keyPair: CryptoKeyPair;
  onError: (error: string) => void;
  onMessageSent: (threadId?: string) => void;
  // Account abstraction props
  sessionEnabled?: boolean;
  onSendWithSession?: (recipient: string, encryptedContent: Uint8Array, encryptedMetadata: Uint8Array, senderEncryptedContent: Uint8Array, senderEncryptedMetadata: Uint8Array) => Promise<string | null>;
}

export const SendMessage: React.FC<SendMessageProps> = ({
  userAddress,
  keyPair,
  onError,
  onMessageSent,
  sessionEnabled = false,
  onSendWithSession
}) => {
  const { ipfsGateway } = useSettingsStore();

  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipientKeyValid, setRecipientKeyValid] = useState<boolean | null>(null);
  const [isSameWallet, setIsSameWallet] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState<{
    publicKey: string;
    walletAddress: string;
    accountName: string;
    domain: string;
  } | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [sentThreadId, setSentThreadId] = useState<string | null>(null);
  const [ipfsCID, setIpfsCID] = useState<string>('');
  const [messageId, setMessageId] = useState<string>('');
  const [useSession, setUseSession] = useState(false);
  const [loadingAccountSelection, setLoadingAccountSelection] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [replyThreadId, setReplyThreadId] = useState<string | null>(null);
  const [requireAcknowledgements, setRequireAcknowledgements] = useState(false);
  const [threadAckRequired, setThreadAckRequired] = useState<boolean | null>(null);
  const [isNewThread, setIsNewThread] = useState(true);

  // Check for reply thread info on mount
  useEffect(() => {
    const replyInfo = sessionStorage.getItem('replyToThread');
    if (replyInfo) {
      try {
        const { threadId, participants } = JSON.parse(replyInfo);
        setReplyThreadId(threadId);
        setIsNewThread(false);
        
        // Query thread's ackRequired setting
        contractService.isAckRequired(threadId).then(ackRequired => {
          setThreadAckRequired(ackRequired);
          console.log(`Thread ${threadId} ackRequired: ${ackRequired}`);
        }).catch(err => {
          console.warn('Could not query thread ack setting:', err);
        });
        
        // Pre-fill recipient with the other participant
        const otherParticipant = participants.find(
          (p: string) => p.toLowerCase() !== userAddress.toLowerCase()
        );
        
        if (otherParticipant) {
          setRecipient(otherParticipant);
          validateRecipient(otherParticipant);
        }
        
        // Clear the session storage
        sessionStorage.removeItem('replyToThread');
      } catch (error) {
        console.error('Failed to parse reply thread info:', error);
      }
    }
  }, []);

  const validateRecipient = async (input: string) => {
    if (!input.trim()) {
      setRecipientKeyValid(null);
      setRecipientInfo(null);
      setIsValidating(false);
      return;
    }

    try {
      // Check if it's an account address (contains @ or .)
      const isAccountAddress = input.includes('@') || input.includes('.');
      
      if (isAccountAddress && !input.startsWith('0x')) {
        
        // Parse account name and domain (format: name@domain)
        let accountName, domain;
        const parts = input.split('@');
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
          setRecipientKeyValid(false);
          setRecipientInfo(null);
          return;
        }
        [accountName, domain] = parts;
        
        // Get account info from AccountRegistry
        try {
          
          // Try to get the public key using the helper method (supports both bare and named)
          let publicKey;
          try {
            publicKey = await contractService.resolveRecipientPublicKey(input);
          } catch (pkError) {
            console.error('❌ Failed to get public key:', pkError);
            setRecipientKeyValid(false);
            setRecipientInfo(null);
            return;
          }
          
          if (!publicKey || publicKey === '0x' || publicKey === '0x00') {
            setRecipientKeyValid(false);
            setRecipientInfo(null);
            return;
          }
          
          // Try to get full account data for wallet address
          let walletAddress = 'Unknown';
          try {
            // Check if it's a HashdTag account (contains @)
            // Contract stores accounts as "name@domain" format
            if (input.includes('@')) {
              const accountData = await contractService.getHashdTagAccount(input);
              walletAddress = accountData.owner;
              
              if (!accountData.isActive) {
                setRecipientKeyValid(false);
                setRecipientInfo(null);
                return;
              }
            } else {
              // It's a wallet address - check if they have any active account
              walletAddress = input;
              const accountCount = await contractService.getAccountCount(input);
              if (accountCount === 0) {
                setRecipientKeyValid(false);
                setRecipientInfo(null);
                return;
              }
              // Check if at least one account is active
              let hasActiveAccount = false;
              for (let i = 0; i < accountCount; i++) {
                const account = await contractService.getAccount(input, i);
                if (account.isActive) {
                  hasActiveAccount = true;
                  break;
                }
              }
              if (!hasActiveAccount) {
                setRecipientKeyValid(false);
                setRecipientInfo(null);
                return;
              }
            }
          } catch (adError) {
            console.warn('⚠️ Could not get full account data, but public key exists:', adError);
            // Continue with just the public key
          }
          
          // Set recipient info with available data
          setRecipientInfo({
            publicKey,
            walletAddress,
            accountName,
            domain
          });
          
          // Check if same wallet
          const sameWallet = walletAddress.toLowerCase() === userAddress.toLowerCase();
          setIsSameWallet(sameWallet);
          setRecipientKeyValid(true);
          
        } catch (error) {
          console.error('❌ Account resolution failed:', error);
          setRecipientKeyValid(false);
          setRecipientInfo(null);
        }
      } else {
        // Wallet address validation and account lookup
        if (input.length !== 42 || !input.startsWith('0x')) {
          setRecipientKeyValid(false);
          setRecipientInfo(null);
          setAvailableAccounts([]);
          return;
        }
        
        const isRegistered = await contractService.isKeyRegistered(input);
        
        if (isRegistered) {
          // Look up active accounts owned by this wallet
          try {
            const accounts = await contractService.getAccounts(input);
            // Filter for active accounts and build display names
            const activeAccounts = accounts
              .filter(acc => acc.isActive)
              .map(acc => acc.hasHashdTagAttached ? acc.hashdTagName : `Bare Account (${acc.publicKey.slice(0, 10)}...)`);
            
            setAvailableAccounts(activeAccounts);
            
            // If there are active accounts, use the first one by default
            if (activeAccounts.length > 0) {
              const firstAccount = accounts.find(acc => acc.isActive);
              if (firstAccount) {
                setSelectedAccount(activeAccounts[0]);
                
                if (firstAccount.hasHashdTagAttached) {
                  const [accName, domain] = firstAccount.hashdTagName.split('@');
                  setRecipientInfo({
                    publicKey: firstAccount.publicKey,
                    walletAddress: input,
                    accountName: accName,
                    domain: domain
                  });
                } else {
                  setRecipientInfo({
                    publicKey: firstAccount.publicKey,
                    walletAddress: input,
                    accountName: 'Bare Account',
                    domain: 'wallet'
                  });
                }
                
                // Check if same wallet
                const sameWallet = input.toLowerCase() === userAddress.toLowerCase();
                setIsSameWallet(sameWallet);
              }
            } else {
              // No active accounts
              setRecipientKeyValid(false);
              setRecipientInfo(null);
            }
          } catch (error) {
            console.warn('Could not fetch accounts for wallet:', error);
            setAvailableAccounts([]);
            setRecipientKeyValid(false);
            setRecipientInfo(null);
          }
        } else {
          setRecipientInfo(null);
          setAvailableAccounts([]);
        }
        
        setRecipientKeyValid(isRegistered);
      }
    } catch (error) {
      console.error('Error validating recipient:', error);
      setRecipientKeyValid(false);
      setRecipientInfo(null);
    } finally {
      setIsValidating(false);
    }
  };

  // Debounced validation effect
  useEffect(() => {
    // Clear previous state
    setRecipientKeyValid(null);
    setRecipientInfo(null);
    setAvailableAccounts([]);
    setSelectedAccount('');

    if (!recipient.trim()) {
      setIsValidating(false);
      return;
    }

    // Show spinner immediately
    setIsValidating(true);

    // Debounce the validation
    const timeoutId = setTimeout(() => {
      validateRecipient(recipient);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [recipient]);

  const handleAccountSelection = async (accountDisplayName: string) => {
    setSelectedAccount(accountDisplayName);
    setLoadingAccountSelection(true);
    
    try {
      // Check if this is a HashdTag account (contains @) or a bare account
      if (accountDisplayName.includes('@')) {
        // HashdTag account
        const publicKey = await contractService.getPublicKeyByName(accountDisplayName);
        const [accName, domain] = accountDisplayName.split('@');
        
        // Get the wallet address from AccountRegistry
        let walletAddress = recipient; // Fallback to input value
        try {
          const accountData = await contractService.getHashdTagAccount(accountDisplayName);
          walletAddress = accountData.owner;
        } catch (error) {
          console.warn('Could not get wallet address from AccountRegistry, using input value');
        }
        
        setRecipientInfo({
          publicKey,
          walletAddress,
          accountName: accName,
          domain: domain
        });
      } else {
        // Bare account - extract public key prefix from display name and find matching account
        const accounts = await contractService.getAccounts(recipient);
        const publicKeyPrefix = accountDisplayName.match(/\(0x[a-fA-F0-9]+\.\.\.\)/)?.[0]?.slice(1, -4) || '';
        const matchingAccount = accounts.find(acc => 
          acc.isActive && !acc.hasHashdTagAttached && acc.publicKey.startsWith(publicKeyPrefix)
        );
        
        if (matchingAccount) {
          setRecipientInfo({
            publicKey: matchingAccount.publicKey,
            walletAddress: recipient,
            accountName: 'Bare Account',
            domain: 'wallet'
          });
        }
      }
    } catch (error) {
      console.error('Error getting account public key:', error);
    } finally {
      setLoadingAccountSelection(false);
    }
  };

  const sendMessage = async () => {
    if (!recipient || !message || !recipientKeyValid || !recipientInfo) return;

    setLoading(true);
    
    try {
      // Check if sender has registered key
      const senderHasKey = await contractService.isKeyRegistered(userAddress);
      if (!senderHasKey) {
        throw new Error('You must register your public key before sending messages. Go to the Key Management tab.');
      }

      // Use the resolved recipient info
      
      // For account addresses, we already have the wallet address from AccountRegistry
      // For wallet addresses, we use the address directly
      const targetWalletAddress = recipientInfo.walletAddress;
      
      // CRITICAL: Verify recipient wallet has registered key
      const recipientHasKey = await contractService.isKeyRegistered(targetWalletAddress);
      if (!recipientHasKey) {
        throw new Error(`Recipient wallet ${targetWalletAddress} has not registered a key. They need to create a mailbox first.`);
      }
      
      console.log('✅ Recipient wallet has registered key:', targetWalletAddress);
      
      const recipientPublicKey = SimpleCryptoUtils.publicKeyFromHex(recipientInfo.publicKey);
      const recipientKeyHash = SimpleCryptoUtils.bytesToHex(recipientPublicKey.slice(0, 16));
      
      // Encrypt the message TWICE - once for recipient, once for sender
      const senderPublicKey = keyPair.publicKey;
      const senderPrivateKey = keyPair.privateKey;
      const senderKeyHash = SimpleCryptoUtils.bytesToHex(senderPublicKey.slice(0, 16));
      
      console.log('🔑 Key details before encryption:');
      console.log('  Sender private key length:', senderPrivateKey.length, 'bytes');
      console.log('  Sender public key length:', senderPublicKey.length, 'bytes');
      console.log('  Recipient public key length:', recipientPublicKey.length, 'bytes');
      console.log('  Sender private key first 10 bytes:', Array.from(senderPrivateKey.slice(0, 10)));
      console.log('  Sender public key first byte:', senderPublicKey[0]);
      console.log('  Recipient public key first byte:', recipientPublicKey[0]);
      
      // Encrypt for recipient (using sender's private key + recipient's public key)
      const { encryptedContent, encryptedMetadata } = await SimpleCryptoUtils.encryptForContract(
        message,
        recipientPublicKey,
        senderPrivateKey,
        senderPublicKey  // Include sender's public key in metadata
      );
      
      // Check if sender and recipient have the same public key
      const recipientPubKeyHex = SimpleCryptoUtils.bytesToHex(recipientPublicKey);
      const senderPubKeyHex = SimpleCryptoUtils.bytesToHex(senderPublicKey);
      
      // Encrypt for sender (so sender can read their own sent messages)
      // Both copies use the SAME ECDH shared secret: ECDH(sender_priv, recipient_pub)
      // 
      // Recipient's copy:
      //   - Encrypted with: ECDH(sender_priv, recipient_pub)
      //   - Metadata stores: sender_pub
      //   - Decrypts with: ECDH(recipient_priv, sender_pub) ✅ same shared secret
      //
      // Sender's copy:
      //   - Encrypted with: ECDH(sender_priv, recipient_pub)  
      //   - Metadata stores: recipient_pub
      //   - Decrypts with: ECDH(sender_priv, recipient_pub) ✅ same shared secret
      const { encryptedContent: senderEncryptedContent, encryptedMetadata: senderEncryptedMetadata } = await SimpleCryptoUtils.encryptForContract(
        message,
        recipientPublicKey,   // Encrypt TO recipient's public key
        senderPrivateKey,     // FROM sender's private key
        recipientPublicKey    // Store RECIPIENT's public key in metadata (for sender to decrypt later)
      );
      

      // Validate message size (convert hex string length to actual byte length)
      const contentByteLength = (encryptedContent.length - 2) / 2; // Remove "0x" and divide by 2
      const metadataByteLength = (encryptedMetadata.length - 2) / 2; // Remove "0x" and divide by 2
      
      
      if (contentByteLength > 4096) {
        throw new Error(`Encrypted message content is too large (${contentByteLength} bytes, max 4096 bytes)`);
      }
      if (metadataByteLength > 512) {
        throw new Error(`Encrypted message metadata is too large (${metadataByteLength} bytes, max 512 bytes)`);
      }
      
      // Send the encrypted message to the wallet address (not the account address)
      
      let txHash: string;
      let threadId: string = '';
      
      console.log('🔍 Send method check:', {
        useSession,
        sessionEnabled,
        hasCallback: !!onSendWithSession
      });
      
      if (useSession && sessionEnabled && onSendWithSession) {
        // Use session key for frictionless sending
        console.log('📱 Using session key (no signature required)');
        const contentBytes = SimpleCryptoUtils.hexStringToBytes(encryptedContent);
        const metadataBytes = SimpleCryptoUtils.hexStringToBytes(encryptedMetadata);
        const senderContentBytes = SimpleCryptoUtils.hexStringToBytes(senderEncryptedContent);
        const senderMetadataBytes = SimpleCryptoUtils.hexStringToBytes(senderEncryptedMetadata);
        
        const sessionTxHash = await onSendWithSession(targetWalletAddress, contentBytes, metadataBytes, senderContentBytes, senderMetadataBytes);
        if (!sessionTxHash) {
          throw new Error('Failed to send message via session key');
        }
        txHash = sessionTxHash;
      } else {
        console.log('✍️ Using wallet signature (MetaMask prompt will appear)');
        
        // NEW ARCHITECTURE: Shared thread files with signatures and hash chains
        console.log('📤 Creating signed message...');
        
        // Generate thread ID from PUBLIC KEYS (not wallet addresses!)
        // This ensures each mailbox has separate threads
        const senderPubKeyHex = '0x' + SimpleCryptoUtils.bytesToHex(senderPublicKey);
        const recipientPubKeyHex = '0x' + SimpleCryptoUtils.bytesToHex(recipientPublicKey);
        
        console.log('  Sender public key length:', senderPublicKey.length, 'bytes');
        console.log('  Recipient public key length:', recipientPublicKey.length, 'bytes');
        console.log('  Sender public key hex:', senderPubKeyHex);
        console.log('  Recipient public key hex:', recipientPubKeyHex);
        
        const publicKeyParticipants = [senderPubKeyHex, recipientPubKeyHex];
        
        // Use existing threadId if replying, otherwise generate new one
        if (replyThreadId) {
          threadId = replyThreadId;
          console.log('  Using existing thread ID (reply):', threadId);
        } else {
          threadId = generateThreadId(publicKeyParticipants);
          console.log('  Generated new thread ID:', threadId);
        }
        console.log('  Mailbox participants:', publicKeyParticipants);
        
        // Keep wallet addresses for contract interactions
        const participants = [userAddress, targetWalletAddress];
        console.log('  Wallet participants:', participants);
        
        // Check CONTRACT first (source of truth for message count)
        console.log('🔍 Checking contract for thread message count...');
        console.log('  Thread ID being checked:', threadId);
        let contractMessageCount = 0;
        try {
          const status = await contractService.getReadStatus(threadId, userAddress);
          contractMessageCount = Number(status.totalMessages);
          console.log('  📊 Contract says thread has', contractMessageCount, 'messages');
        } catch (error) {
          console.log('  📊 Thread does not exist on contract yet (new thread)');
          console.log('  Error:', error);
        }
        
        // Get existing thread from IPFS only if contract has messages
        let previousMessage = null;
        if (contractMessageCount > 0) {
          console.log('🔍 Fetching existing thread from IPFS...');
          const threadFile = await ipfsService.getThread(threadId);
          
          // IMPORTANT: Use contractMessageCount to get the last CONFIRMED message
          // IPFS may have more messages that weren't confirmed on-chain
          const confirmedMessageIndex = contractMessageCount - 1;
          previousMessage = threadFile?.messages?.[confirmedMessageIndex] || null;
          
          if (previousMessage) {
            console.log('  ✅ Found thread with', threadFile.messages.length, 'messages in IPFS');
            console.log('  📊 Using confirmed message at index', confirmedMessageIndex, '(contract has', contractMessageCount, 'messages)');
            console.log('  Last confirmed message hash:', previousMessage.hash);
          } else {
            console.warn('  ⚠️ Could not find confirmed message at index', confirmedMessageIndex);
          }
        } else {
          console.log('  📂 Starting fresh thread (contract has 0 messages, ignoring any stale IPFS data)');
          previousMessage = null; // Explicitly set to null to ensure fresh start
        }
        
        console.log('  📝 Previous message for signing:', previousMessage ? `index ${previousMessage.index}` : 'null (first message)');
        
        // Get signer for signing the message
        if (!window.ethereum) {
          throw new Error('No Ethereum provider found');
        }
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        // Create signed message with hash chain
        console.log('✍️ Signing message...');
        console.log('  Sender public key:', senderPubKeyHex.slice(0, 20) + '...');
        console.log('  Recipient public key:', recipientPubKeyHex.slice(0, 20) + '...');
        
        const signedMessage: SignedMessage = await createSignedMessage(
          {
            participants: participants, // Wallet addresses for participant identification
            sender: userAddress,
            encryptedFor: {
              [senderPubKeyHex]: senderEncryptedContent,
              [recipientPubKeyHex]: encryptedContent
            },
            encryptedMetadataFor: {
              [senderPubKeyHex]: senderEncryptedMetadata,
              [recipientPubKeyHex]: encryptedMetadata
            },
            threadId: threadId,
            replyTo: undefined
          },
          previousMessage,
          signer
        );
        
        console.log('✅ Message signed!');
        console.log('  Message ID:', signedMessage.messageId);
        console.log('  Index:', signedMessage.index);
        console.log('  Hash:', signedMessage.hash);
        console.log('  Signature:', signedMessage.signature.slice(0, 20) + '...');
        console.log('  PrevHash:', signedMessage.prevHash);
        
        // Send to relayer
        console.log('📤 Uploading to IPFS via relayer...');
        const result = await ipfsService.sendSignedMessage(signedMessage, threadId);
        
        console.log('✅ Message uploaded to shared thread!');
        console.log('  Thread CID:', result.threadCID);
        console.log('  Message index:', result.messageIndex);
        console.log('  Total messages in thread:', result.threadMessageCount);
        
        // Store IPFS data for success modal
        setIpfsCID(result.threadCID);
        setMessageId(result.messageId);
        
        // Record on-chain (stores thread CID)
        console.log('📝 Recording message on-chain...');
        const threadCIDBytes32 = cidToBytes32(result.threadCID);
        console.log('  Sender:', userAddress);
        console.log('  Recipient:', targetWalletAddress);
        console.log('  Thread ID:', threadId);
        console.log('  Thread CID bytes32:', threadCIDBytes32);
        
        // VALIDATION: Check recipient is initialized (has received at least one message or initialized)
        console.log('🔍 Checking recipient initialization...');
        try {
          const recipientMessages = await contractService.getUserMessages(targetWalletAddress);
          console.log('  Recipient initialized:', recipientMessages.initialized);
          
          // Note: Recipient doesn't need to be initialized to receive first message
          // The contract will auto-initialize them on first message receipt
        } catch (err) {
          console.log('  Recipient not yet initialized (this is OK for first message)');
        }
        
        // VALIDATION: Verify sender and recipient are not the same
        if (userAddress.toLowerCase() === targetWalletAddress.toLowerCase()) {
          throw new Error('Cannot send message to yourself');
        }
        
        // VALIDATION: Verify threadId is valid bytes32
        if (!threadId.startsWith('0x') || threadId.length !== 66) {
          throw new Error(`Invalid threadId format: ${threadId}`);
        }
        
        // VALIDATION: Verify threadCIDBytes32 is valid bytes32
        if (!threadCIDBytes32.startsWith('0x') || threadCIDBytes32.length !== 66) {
          throw new Error(`Invalid CID bytes32 format: ${threadCIDBytes32}`);
        }
        
        // VALIDATION: Check if thread is terminated
        console.log('🔍 Checking if thread is terminated...');
        try {
          const isTerminated = await contractService.isThreadTerminated(threadId);
          console.log('  Thread terminated:', isTerminated);
          if (isTerminated) {
            throw new Error('This conversation thread has been terminated and cannot receive new messages.');
          }
        } catch (err: any) {
          if (err.message.includes('terminated')) throw err;
          console.log('  Could not check thread termination, continuing...');
        }
        
        // VALIDATION: Check if sender is permitted (not blocked)
        console.log('🔍 Checking if sender is permitted...');
        try {
          const isPermitted = await contractService.isSenderPermitted(targetWalletAddress, userAddress);
          console.log('  Sender permitted:', isPermitted);
          if (!isPermitted) {
            throw new Error('You have been blocked by this recipient and cannot send messages to them.');
          }
        } catch (err: any) {
          if (err.message.includes('blocked')) throw err;
          console.log('  Could not check sender permission, continuing...');
        }
        
        // Check if sender is initialized
        console.log('🔍 Checking sender initialization...');
        let senderInitialized = false;
        try {
          const senderMessages = await contractService.getUserMessages(userAddress);
          console.log('  Sender initialized:', senderMessages.initialized);
          senderInitialized = senderMessages.initialized;
        } catch (err) {
          console.log('  Could not check sender initialization, assuming not initialized');
        }
        
        if (!senderInitialized) {
          console.log('📝 Initializing sender on-chain...');
          try {
            const initTx = await contractService.initializeUserIPFS(userAddress);
            console.log('  Init TX sent:', initTx.hash);
            await initTx.wait();
            console.log('✅ Sender initialized');
          } catch (initErr: any) {
            console.log('  Initialization may have failed or user already initialized:', initErr.message);
            // Continue anyway - the recordMessage call will handle it
          }
        }
        
        // Determine ackRequired: use requireAcknowledgements for new threads, inherit for replies
        const ackRequired = isNewThread ? requireAcknowledgements : (threadAckRequired ?? false);
        console.log(`  ackRequired: ${ackRequired} (${isNewThread ? 'new thread' : 'reply'})`);
        
        console.log('📤 Calling recordMessage with params:');
        console.log('  - sender:', userAddress);
        console.log('  - recipient:', targetWalletAddress);
        console.log('  - threadId:', threadId);
        console.log('  - replyTo:', 0);
        console.log('  - senderNewCID:', threadCIDBytes32);
        console.log('  - ackRequired:', ackRequired);
        
        // Compute public key hashes for event indexing
        const senderPublicKeyHash = ethers.keccak256(senderPubKeyHex);
        const recipientPublicKeyHash = ethers.keccak256(recipientPubKeyHex);
        
        console.log('  - senderPublicKeyHash:', senderPublicKeyHash);
        console.log('  - recipientPublicKeyHash:', recipientPublicKeyHash);
        
        let tx;
        try {
          tx = await contractService.recordMessage(
            userAddress,
            targetWalletAddress,
            threadId,
            0, // replyTo
            threadCIDBytes32,
            ackRequired,
            senderPublicKeyHash,
            recipientPublicKeyHash
          );
        } catch (recordErr: any) {
          console.error('❌ recordMessage call failed:', recordErr);
          console.error('  Error code:', recordErr.code);
          console.error('  Error data:', recordErr.data);
          console.error('  Error info:', recordErr.info);
          console.error('  Transaction:', recordErr.transaction);
          throw recordErr;
        }
        
        console.log('⏳ Waiting for confirmation...');
        console.log('  TX hash:', tx.hash);
        const receipt = await tx.wait();
        txHash = tx.hash;
        
        console.log('✅ Message recorded on-chain!');
        console.log('  TX:', txHash);
        console.log('  Block:', receipt?.blockNumber);
        console.log('  Gas:', receipt?.gasUsed?.toString());
      }
      
      // Show success content in same modal
      console.log('✅ Message sent successfully!');
      console.log('  TX Hash:', txHash);
      
      // Store data and show success
      setTransactionHash(txHash);
      setSentThreadId(threadId);
      setShowSuccessModal(true);
      
      // Reset form
      setRecipient('');
      setMessage('');
      setRecipientKeyValid(null);
      setRecipientInfo(null);
      setAvailableAccounts([]);
      setSelectedAccount('');
    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      console.error('  Error details:', error instanceof Error ? error.message : error);
      console.error('  Stack:', error instanceof Error ? error.stack : 'No stack');
      
      // Try to decode contract error
      let errorMessage = 'Failed to send message';
      
      if (error?.data) {
        console.error('  Error data:', error.data);
        try {
          // Try to decode the error using ethers Interface
          const iface = new ethers.Interface([
            "error NotInitialized()",
            "error KeyNotRegistered(address user)",
            "error SenderBlocked(address sender)",
            "error ThreadTerminated(bytes32 threadId)",
            "error InvalidReplyTo(uint256 replyTo)",
            "error Unauthorized()"
          ]);
          
          const decodedError = iface.parseError(error.data);
          if (decodedError) {
            console.error('  Decoded error:', decodedError.name, decodedError.args);
            
            switch (decodedError.name) {
              case 'NotInitialized':
                errorMessage = 'User not initialized. This should have been handled automatically.';
                break;
              case 'KeyNotRegistered':
                errorMessage = `Key not registered for address: ${decodedError.args[0]}`;
                break;
              case 'SenderBlocked':
                errorMessage = 'You have been blocked by this recipient.';
                break;
              case 'ThreadTerminated':
                errorMessage = 'This conversation thread has been terminated.';
                break;
              case 'InvalidReplyTo':
                errorMessage = 'Invalid reply reference.';
                break;
              case 'Unauthorized':
                errorMessage = 'You are not authorized to perform this action.';
                break;
              default:
                errorMessage = `Contract error: ${decodedError.name}`;
            }
          }
        } catch (decodeError) {
          console.error('  Could not decode error:', decodeError);
        }
      }
      
      // Check for common error patterns
      if (error?.message) {
        if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds to pay for gas';
        } else if (error.message.includes('nonce')) {
          errorMessage = 'Transaction nonce error. Please try again.';
        } else if (error.message.includes('already known')) {
          errorMessage = 'Transaction already pending. Please wait.';
        } else if (error.message.includes('execution reverted')) {
          // Extract revert reason if available
          const match = error.message.match(/execution reverted: "([^"]+)"/);
          if (match) {
            errorMessage = `Contract error: ${match[1]}`;
          } else {
            errorMessage = 'Transaction reverted. Check console for details.';
          }
        } else if (!error.data) {
          // If no error.data, use the error message directly
          errorMessage = error.message;
        }
      }
      
      console.error('  Final error message:', errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show success content or form
  if (showSuccessModal) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 border-2 border-green-500/30 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-sm text-gray-300 font-mono">
            Your encrypted message has been successfully processed and recorded
          </p>
        </div>

        {/* Process Overview */}
        <div className="bg-cyan-900/10 rounded-lg p-4">
          <h4 className="text-xs font-bold text-cyan-400 uppercase font-mono mb-3 flex items-center gap-2">
            <Database className="w-4 h-4" />
            What Happened
          </h4>
          <div className="space-y-2 text-xs text-gray-300 font-mono">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span><strong className="text-white">Encrypted:</strong> Message encrypted with recipient's public key using AES-256-GCM</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span><strong className="text-white">Uploaded to IPFS:</strong> Encrypted thread data stored on decentralized IPFS network</span>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span><strong className="text-white">Blockchain Record:</strong> Message metadata and IPFS CID recorded on MegaETH</span>
            </div>
          </div>
        </div>

        {/* Transaction Hash */}
        <NeonField label="🔗 Transaction Hash">
          <p className="text-sm text-cyan-300 font-mono break-all mb-3">
            {transactionHash}
          </p>
          <a
            href={`http://localhost:8545/tx/${transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-mono"
          >
            <ExternalLink className="w-4 h-4" />
            View on Block Explorer
          </a>
        </NeonField>

        {/* IPFS Data */}
        <NeonField label="📦 IPFS Content Identifier">
          <p className="text-sm text-cyan-300 font-mono break-all mb-3">
            {ipfsCID}
          </p>
          <div className="flex gap-2">
            <a
              href={`${ipfsGateway}/${ipfsCID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-mono"
            >
              <ExternalLink className="w-4 h-4" />
              View on Gateway
            </a>
            <button
              onClick={() => {
                const data = JSON.stringify({ cid: ipfsCID, messageId }, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `message-${messageId}.json`;
                a.click();
              }}
              className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-mono"
            >
              <Download className="w-4 h-4" />
              Download JSON
            </button>
          </div>
        </NeonField>

        {/* Message ID */}
        <NeonField label="📨 Message ID">
          <p className="text-sm text-cyan-300 font-mono">
            #{messageId}
          </p>
        </NeonField>


        {/* Close Button */}
        <NeonButton
          onClick={() => {
            setShowSuccessModal(false);
            onMessageSent(sentThreadId || undefined);
          }}
          variant="cyan"
          className="w-full"
        >
          CLOSE
        </NeonButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
                <p className="text-sm text-gray-400 font-mono mb-6">Send encrypted messages with end-to-end security</p>
          
      {/* Recipient Address Field */}
      <div className="mb-6">
        <label className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 block font-mono flex items-center gap-2">
          <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
          {replyThreadId ? 'Thread Participants' : 'Recipient Wallet or HASHDtag *'}
        </label>
        {replyThreadId ? (
          <div className="px-4 py-3 bg-gray-900/50 border border-cyan-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Replying to:</span>
              <span className="text-cyan-400 font-mono">
                {recipientInfo?.accountName && recipientInfo?.domain 
                  ? `${recipientInfo.accountName}@${recipientInfo.domain}`
                  : recipient.slice(0, 6) + '...' + recipient.slice(-4)
                }
              </span>
              <span className="text-gray-500 font-mono text-xs">
                ({recipient.slice(0, 6)}...{recipient.slice(-4)})
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-mono">
              Recipients are fixed for this thread
            </p>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="alexx@hashd or 0x1234...abcd"
              className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 font-mono text-sm transition-colors"
              disabled={loading}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {isValidating && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                </div>
              )}
              {!isValidating && recipientKeyValid === true && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
              )}
              {!isValidating && recipientKeyValid === false && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
              )}
            </div>
          </div>
        )}
        {recipientKeyValid === false && (
          <MatrixNotify 
            title={recipient.includes('@') ? 'ACCOUNT.NOT.FOUND' : 'KEY.NOT.REGISTERED'} 
            variant="error"
            icon={XCircle}
          >
            <p className="text-sm text-white font-mono">
              {recipient.includes('@') 
                ? 'This account does not exist or the HASHDtag is not linked to an encryption key. Please try another address.'
                : 'This wallet address has not registered their encryption key. They need to create a mailbox first.'
              }
            </p>
          </MatrixNotify>
        )}
        {recipientKeyValid === true && recipientInfo && isSameWallet && (
          <MatrixNotify 
            title="CANNOT.SEND.TO.OWN.WALLET" 
            variant="error"
            icon={XCircle}
          >
            <div className="text-xs text-gray-200 space-y-2 font-mono">
              {recipientInfo.domain !== 'wallet' && (
                <div>
                  <strong className="text-white">Account:</strong> {recipientInfo.accountName}@{recipientInfo.domain}
                </div>
              )}
              <div>
                <strong className="text-white">Wallet:</strong> {recipientInfo.walletAddress}
              </div>
              <div className="mt-3 pt-3 border-t border-red-500/30">
                <p className="text-sm text-red-200 font-bold">
                  ⚠️ You cannot send messages to different mailboxes on the same wallet.
                </p>
      
              </div>
            </div>
          </MatrixNotify>
        )}
        {!replyThreadId && recipientKeyValid === true && recipientInfo && !isSameWallet && (
          <MatrixNotify title="RECIPIENT.FOUND - READY.TO.ENCRYPT" variant="success">
            {loadingAccountSelection ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-green-400 animate-spin" />
                <span className="ml-2 text-xs text-white">Loading account details...</span>
              </div>
            ) : (
              <div className="text-xs text-gray-200 space-y-2 font-mono">
                {recipientInfo.domain !== 'wallet' && (
                  <div>
                    <strong className="text-white">Account:</strong> {recipientInfo.accountName}@{recipientInfo.domain}
                  </div>
                )}
                <div>
                  <strong className="text-white">Wallet:</strong> {recipientInfo.walletAddress}
                </div>
                <div>
                  <strong className="text-white">Public Key:</strong> {recipientInfo.publicKey.slice(0, 20)}...{recipientInfo.publicKey.slice(-8)}
                </div>
              </div>
            )}
            
            {/* Account Selection for Wallet Addresses */}
            {availableAccounts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-green-500/30">
                <p className="text-xs font-bold text-white mb-2 font-mono">Available Accounts:</p>
                <div className="space-y-1">
                  {availableAccounts.map((account) => (
                    <button
                      key={account}
                      onClick={() => handleAccountSelection(account)}
                      className={`w-full text-left px-3 py-2 rounded text-xs transition-colors font-mono ${
                        selectedAccount === account
                          ? 'bg-green-500/20 text-white font-bold border border-green-500/40'
                          : 'hover:bg-green-500/10 text-gray-200 border border-transparent'
                      }`}
                    >
                      {account}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </MatrixNotify>
        )}
      </div>

      {/* Message Content Field */}
      <div>
        <label className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 block font-mono flex items-center gap-2">
          <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
          Message Content *
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your private message here..."
          rows={6}
          className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 resize-none font-mono text-sm transition-colors"
          disabled={loading}
        />
      </div>

      {/* Read Receipt Toggle - Only for NEW threads */}
      {isNewThread && (
        <div className="bg-cyan-900/10 border border-cyan-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-sm font-semibold text-cyan-400 font-mono">REQUIRE ACKNOWLEDGEMENTS</p>
                <p className="text-xs text-gray-400 font-mono">
                  {requireAcknowledgements 
                    ? "Recipient must send a transaction to mark messages as received"
                    : "Recipient can read messages without any transaction"}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={requireAcknowledgements}
                onChange={(e) => setRequireAcknowledgements(e.target.checked)}
                className="sr-only peer"
                disabled={loading}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>
        </div>
      )}

      {/* Thread Setting Display - For REPLIES */}
      {!isNewThread && threadAckRequired !== null && (
        <div className="bg-gray-900/50 border border-gray-500/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-semibold text-gray-300 font-mono">THREAD SETTING</p>
              <p className="text-xs text-gray-400 font-mono">
                {threadAckRequired 
                  ? "This thread requires on-chain acknowledgements"
                  : "This thread allows free reading (no acknowledgement needed)"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Session Key Toggle */}
      {/* {useSession !== undefined && (
        <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm font-semibold text-purple-400 font-mono">USE SESSION KEY</p>
                <p className="text-xs text-gray-400 font-mono">Send without wallet signature (faster)</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useSession}
                onChange={(e) => setUseSession(e.target.checked)}
                className="sr-only peer"
                disabled={!sessionEnabled}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>
      )} */}
      {/* Encryption Notice */}
      <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-4">
        <p className="text-sm text-gray-300 font-mono flex items-start gap-2">
          <Shield className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
          <span>
            <strong className="text-green-400">🔒 Your message will be encrypted before sending</strong><br />
            Only you and the recipient can decrypt this message. The blockchain only stores encrypted data.
          </span>
        </p>
      </div>
      {/* Send Button */}
      <div className="pt-4 border-t border-cyan-500/20">
        <NeonButton
          onClick={sendMessage}
          disabled={!recipient || !message || !recipientKeyValid || loading || isSameWallet}
          variant="cyan"
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
              SENDING...
            </>
          ) : (
            'SEND MESSAGE'
          )}
        </NeonButton>
      </div>
    </div>
  );
};
