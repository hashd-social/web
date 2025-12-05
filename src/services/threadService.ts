import { ethers } from 'ethers';
import { ipfsService } from './ipfs/messaging';
import { contractService } from '../utils/contracts';
import { verifyMessageChain, generateThreadId, SignedMessage, ThreadFile } from '../utils/messageChain';
import { SimpleCryptoUtils, CryptoKeyPair } from '../utils/crypto-simple';

export interface DecryptedMessage extends SignedMessage {
  decryptedContent?: string;
  decryptedMetadata?: any;
  canRead: boolean;
  isBeforeJoinTime: boolean;
  verificationStatus: 'valid' | 'invalid' | 'unchecked';
}

export interface ThreadInfo {
  threadId: string;
  participants: string[];
  lastMessage: DecryptedMessage | null;
  unreadCount: number;
  totalMessages: number;
  joinedAtIndex: number;
  chainValid: boolean;
}

/**
 * Check if a thread can be decrypted with the current key
 */
async function canDecryptThread(
  threadId: string,
  userAddress: string,
  keyPair: CryptoKeyPair
): Promise<boolean> {
  try {
    // Get thread file from IPFS
    const threadFile = await ipfsService.getThread(threadId);
    if (!threadFile || threadFile.messages.length === 0) {
      return false;
    }
    
    // Get current user's public key hex (with 0x prefix to match storage format)
    const userPublicKeyHex = '0x' + SimpleCryptoUtils.bytesToHex(keyPair.publicKey);
    
    // Try to decrypt the first message we should have access to
    const firstMessage = threadFile.messages[0];
    
    // BACKWARD COMPATIBILITY: Try both public key hex (new) and wallet address (old)
    let encrypted = firstMessage.encryptedFor[userPublicKeyHex];
    let encryptedMetadata = firstMessage.encryptedMetadataFor[userPublicKeyHex];
    
    if (!encrypted) {
      // Fall back to old format (wallet address)
      encrypted = firstMessage.encryptedFor[userAddress];
      encryptedMetadata = firstMessage.encryptedMetadataFor[userAddress];
    }
    
    if (!encrypted) {
      return false;
    }
    
    // Attempt decryption
    await SimpleCryptoUtils.decryptFromContract(
      encrypted,
      encryptedMetadata,
      keyPair.privateKey
    );
    
    console.log(`✅ Can decrypt thread ${threadId}`);
    return true; // Decryption succeeded
  } catch (error) {
    console.log(`❌ Cannot decrypt thread ${threadId} with current key`);
    console.log(`   Error:`, error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Get all threads for a user by querying on-chain events
 * Filters out threads that cannot be decrypted with the current key
 */
export async function getUserThreads(
  userAddress: string,
  keyPair?: CryptoKeyPair
): Promise<string[]> {
  const threads = new Set<string>();
  
  try {
    // Get message counts
    const { sent, received } = await contractService.getUserMessageCounts(userAddress);
    console.log(`User has ${sent} sent, ${received} received messages`);
    
    // Query MessageSent events where user is sender or recipient
    // This is more efficient than fetching all messages
    const provider = contractService.getReadProvider();
    const messageContract = contractService.getMessageContract();
    
    if (!messageContract) {
      console.error('Message contract not initialized');
      return [];
    }
    
    // Query events from genesis on localhost, last 10000 blocks on mainnet
    const currentBlock = await provider.getBlockNumber();
    const network = await provider.getNetwork();
    const isLocalhost = Number(network.chainId) === 31337 || Number(network.chainId) === 1337;
    const fromBlock = isLocalhost ? 0 : Math.max(0, currentBlock - 10000);
    
    console.log(`Querying MessageSent events from block ${fromBlock} to ${currentBlock} (network: ${network.chainId})`);
    
    // Compute public key hash for filtering
    const publicKeyHash = keyPair ? ethers.keccak256('0x' + SimpleCryptoUtils.bytesToHex(keyPair.publicKey)) : null;
    console.log(`Public key hash for filtering: ${publicKeyHash}`);
    
    // Query ALL MessageSent events for this wallet (sender OR recipient)
    // We'll filter by public key hash after fetching
    const allEventsFilter = messageContract.filters.MessageSent();
    const allEvents = await messageContract.queryFilter(allEventsFilter, fromBlock, currentBlock);
    
    // Filter to only events where this wallet is sender or recipient
    const relevantEvents = allEvents.filter((event: any) => {
      const sender = event.args?.sender;
      const recipient = event.args?.recipient;
      return sender?.toLowerCase() === userAddress.toLowerCase() || 
             recipient?.toLowerCase() === userAddress.toLowerCase();
    });
    
    console.log(`Found ${relevantEvents.length} events for wallet ${userAddress} (out of ${allEvents.length} total)`);
    
    // Extract thread IDs, filtering by public key hash if available
    const allThreadIds: string[] = [];
    for (const event of relevantEvents) {
      const log = event as any; // Type assertion for event logs
      if (log.args && log.args.threadId) {
        // If we have a public key hash, filter by it
        if (publicKeyHash) {
          const senderPubKeyHash = log.args.senderPublicKeyHash;
          const recipientPubKeyHash = log.args.recipientPublicKeyHash;
          
          // Only include if this mailbox's public key hash matches sender or recipient
          if (senderPubKeyHash === publicKeyHash || recipientPubKeyHash === publicKeyHash) {
            allThreadIds.push(log.args.threadId);
            console.log(`✅ Event matches public key hash - Thread: ${log.args.threadId}`);
          } else {
            console.log(`⚠️ Event skipped - different mailbox (sender: ${senderPubKeyHash}, recipient: ${recipientPubKeyHash}, current: ${publicKeyHash})`);
          }
        } else {
          // No key pair provided, include all
          allThreadIds.push(log.args.threadId);
        }
      }
    }
    
    // Remove duplicates
    const uniqueThreadIds = Array.from(new Set(allThreadIds));
    console.log(`Found ${uniqueThreadIds.length} unique threads`);
    
    // If we filtered by public key hash, we already know these threads are for this mailbox
    // Skip the expensive IPFS decryption check
    if (publicKeyHash) {
      console.log('✅ Threads already filtered by public key hash - skipping decryption check');
      console.log(`   Adding ${uniqueThreadIds.length} threads directly:`, uniqueThreadIds);
      uniqueThreadIds.forEach(id => threads.add(id));
      console.log(`   Total threads after adding: ${threads.size}`);
    } else if (keyPair) {
      // Fallback: Filter threads that can be decrypted with current key (for backward compatibility)
      console.log('Filtering threads by decryption capability...');
      for (const threadId of uniqueThreadIds) {
        const canDecrypt = await canDecryptThread(threadId, userAddress, keyPair);
        if (canDecrypt) {
          threads.add(threadId);
        } else {
          console.log(`⚠️ Skipping thread ${threadId} - encrypted for different mailbox`);
        }
      }
      console.log(`${threads.size} threads accessible with current key`);
    } else {
      // No key pair provided, return all threads
      uniqueThreadIds.forEach(id => threads.add(id));
    }
  } catch (error) {
    console.error('Error getting user threads:', error);
  }
  
  return Array.from(threads);
}

/**
 * Load and decrypt a thread
 */
export async function loadThread(
  threadId: string,
  userAddress: string,
  keyPair: CryptoKeyPair
): Promise<DecryptedMessage[]> {
  console.log(`📂 Loading thread: ${threadId}`);
  
  // Get on-chain status first (source of truth)
  let onChainMessageCount = 0;
  let joinedAtIndex = 0;
  try {
    const readStatus = await contractService.getReadStatus(threadId, userAddress);
    onChainMessageCount = readStatus.totalMessages;
    joinedAtIndex = readStatus.joinedAtIndex;
    console.log(`📊 On-chain: ${onChainMessageCount} messages, joined at index ${joinedAtIndex}`);
  } catch (error) {
    console.log('📊 Thread not on-chain yet, showing 0 messages');
    return []; // No on-chain record = no messages to show
  }
  
  if (onChainMessageCount === 0) {
    console.log('📊 No confirmed messages on-chain');
    return [];
  }
  
  // Get thread file from IPFS (with fallback to contract+gateway)
  let threadFile: ThreadFile | null = null;
  try {
    threadFile = await ipfsService.getThread(threadId);
  } catch (error) {
    console.error('Failed to load thread from IPFS:', error);
    return [];
  }
  
  if (!threadFile) {
    console.log('Thread not found in IPFS');
    return [];
  }
  
  console.log(`Found thread with ${threadFile.messages.length} messages in IPFS`);
  console.log(`📊 Only showing ${onChainMessageCount} confirmed messages`);
  
  // Only use messages that are confirmed on-chain
  const confirmedMessages = threadFile.messages.slice(0, onChainMessageCount);
  
  // Verify chain integrity (only for confirmed messages)
  const verification = verifyMessageChain(confirmedMessages);
  console.log(`Chain verification: ${verification.valid ? '✅ Valid' : '❌ Invalid'}`);
  
  if (!verification.valid) {
    console.warn('⚠️ Chain verification failed:', verification.errors);
  }
  
  // joinedAtIndex already fetched above with onChainMessageCount
  
  // Decrypt only confirmed messages
  const decryptedMessages: DecryptedMessage[] = [];
  
  // Get current user's public key hex for lookups (with 0x prefix to match storage format)
  const userPublicKeyHex = '0x' + SimpleCryptoUtils.bytesToHex(keyPair.publicKey);
  
  for (let i = 0; i < confirmedMessages.length; i++) {
    const msg = confirmedMessages[i];
    const isBeforeJoinTime = i < joinedAtIndex;
    const canRead = !isBeforeJoinTime;
    
    let decryptedContent: string | undefined;
    let decryptedMetadata: any | undefined;
    
    // BACKWARD COMPATIBILITY: Try both public key hex (new) and wallet address (old)
    let encrypted = msg.encryptedFor[userPublicKeyHex];
    let encryptedMetadata = msg.encryptedMetadataFor[userPublicKeyHex];
    
    if (!encrypted) {
      // Fall back to old format (wallet address)
      encrypted = msg.encryptedFor[userAddress];
      encryptedMetadata = msg.encryptedMetadataFor[userAddress];
    }
    
    if (canRead && encrypted) {
      try {
        // Decrypt content using current mailbox's private key
        const result = await SimpleCryptoUtils.decryptFromContract(
          encrypted,
          encryptedMetadata,
          keyPair.privateKey
        );
        
        decryptedContent = result.message;
        decryptedMetadata = result.metadata;
      } catch (error) {
        console.error(`Failed to decrypt message ${msg.messageId}:`, error);
      }
    }
    
    decryptedMessages.push({
      ...msg,
      decryptedContent,
      decryptedMetadata,
      canRead,
      isBeforeJoinTime,
      verificationStatus: verification.valid ? 'valid' : 'invalid'
    });
  }
  
  return decryptedMessages;
}

/**
 * Get thread info with unread count
 */
export async function getThreadInfo(
  threadId: string,
  userAddress: string
): Promise<ThreadInfo | null> {
  try {
    const threadFile: ThreadFile | null = await ipfsService.getThread(threadId);
    
    if (!threadFile) {
      return null;
    }
    
    // Verify chain
    const verification = verifyMessageChain(threadFile.messages);
    
    // Get read status
    const readStatus = await contractService.getReadStatus(threadId, userAddress);
    
    return {
      threadId,
      participants: threadFile.participants,
      lastMessage: threadFile.messages[threadFile.messages.length - 1] as any,
      unreadCount: readStatus.unreadCount,
      totalMessages: readStatus.totalMessages,
      joinedAtIndex: readStatus.joinedAtIndex,
      chainValid: verification.valid
    };
  } catch (error) {
    console.error('Error getting thread info:', error);
    return null;
  }
}

/**
 * Get all thread infos for user (for inbox list)
 */
export async function getAllThreadInfos(
  userAddress: string,
  keyPair?: CryptoKeyPair
): Promise<ThreadInfo[]> {
  const threadIds = await getUserThreads(userAddress, keyPair);
  console.log(`Found ${threadIds.length} threads for user`);
  
  const threadInfos: ThreadInfo[] = [];
  
  for (const threadId of threadIds) {
    const info = await getThreadInfo(threadId, userAddress);
    if (info) {
      threadInfos.push(info);
    }
  }
  
  // Sort by last message timestamp (most recent first)
  threadInfos.sort((a, b) => {
    const aTime = a.lastMessage?.timestamp || 0;
    const bTime = b.lastMessage?.timestamp || 0;
    return bTime - aTime;
  });
  
  return threadInfos;
}

/**
 * Get conversation messages (all messages in a thread, sorted)
 */
export async function getConversationMessages(
  threadId: string,
  userAddress: string,
  keyPair: CryptoKeyPair
): Promise<DecryptedMessage[]> {
  const messages = await loadThread(threadId, userAddress, keyPair);
  
  // Sort by index (chronological order)
  messages.sort((a, b) => a.index - b.index);
  
  return messages;
}

/**
 * Mark thread as read
 */
export async function markThreadAsRead(
  threadId: string,
  lastMessageIndex: number
): Promise<void> {
  try {
    await contractService.markThreadAsRead(threadId, lastMessageIndex);
    console.log(`✅ Marked thread ${threadId} as read up to index ${lastMessageIndex}`);
  } catch (error) {
    console.error('Error marking thread as read:', error);
    throw error;
  }
}

// ============================================
// Thread Backup & Restore
// ============================================

export interface ThreadBackup {
  version: string;
  threadId: string;
  exportedAt: number;
  messages: DecryptedMessage[];
}

/**
 * Export thread backup to file
 * Note: Backup contains decrypted messages, so it should be stored securely
 */
export async function exportThreadBackup(
  threadId: string,
  messages: DecryptedMessage[]
): Promise<void> {
  const backup: ThreadBackup = {
    version: '1.0',
    threadId,
    exportedAt: Date.now(),
    messages: messages.map(msg => ({
      ...msg,
      // Only include decrypted content, not encrypted versions
      encryptedFor: {},
      encryptedMetadataFor: {}
    }))
  };

  const backupJson = JSON.stringify(backup, null, 2);
  
  // Create download
  const blob = new Blob([backupJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `thread-backup-${threadId.slice(0, 8)}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Store in localStorage as well
  storeLocalBackup(threadId, backupJson);
  
  console.log(`✅ Exported backup for thread ${threadId}`);
}

/**
 * Restore thread from backup file
 */
export async function restoreThreadFromFile(
  file: File
): Promise<ThreadBackup> {
  const text = await file.text();
  const backup: ThreadBackup = JSON.parse(text);
  
  // Validate backup structure
  if (!backup.version || !backup.threadId || !backup.messages) {
    throw new Error('Invalid backup file format');
  }
  
  // Store in localStorage
  storeLocalBackup(backup.threadId, text);
  
  console.log(`✅ Restored backup for thread ${backup.threadId}`);
  return backup;
}

/**
 * Restore thread from localStorage
 */
export async function restoreThreadFromLocal(
  threadId: string
): Promise<ThreadBackup | null> {
  const backupJson = loadLocalBackup(threadId);
  if (!backupJson) return null;
  
  const backup: ThreadBackup = JSON.parse(backupJson);
  return backup;
}

/**
 * Check if local backup exists
 */
export function hasLocalBackup(threadId: string): boolean {
  return loadLocalBackup(threadId) !== null;
}

/**
 * Store backup in localStorage
 */
function storeLocalBackup(threadId: string, encryptedBackup: string): void {
  try {
    const backups = JSON.parse(localStorage.getItem('threadBackups') || '{}');
    backups[threadId] = {
      encrypted: encryptedBackup,
      exportedAt: Date.now()
    };
    localStorage.setItem('threadBackups', JSON.stringify(backups));
  } catch (error) {
    console.error('Error storing backup:', error);
  }
}

/**
 * Load backup from localStorage
 */
function loadLocalBackup(threadId: string): string | null {
  try {
    const backups = JSON.parse(localStorage.getItem('threadBackups') || '{}');
    return backups[threadId]?.encrypted || null;
  } catch (error) {
    console.error('Error loading backup:', error);
    return null;
  }
}

/**
 * Delete local backup
 */
export function deleteLocalBackup(threadId: string): void {
  try {
    const backups = JSON.parse(localStorage.getItem('threadBackups') || '{}');
    delete backups[threadId];
    localStorage.setItem('threadBackups', JSON.stringify(backups));
  } catch (error) {
    console.error('Error deleting backup:', error);
  }
}
