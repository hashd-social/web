import { ethers } from 'ethers';

/**
 * Message structure with signatures and hash chain
 */
export interface SignedMessage {
  // Message identity
  messageId: string;
  index: number;
  
  // Participants
  participants: string[];  // All thread participants (sorted)
  sender: string;
  
  // Encrypted content (one per participant)
  encryptedFor: Record<string, string>;  // address => encrypted content
  encryptedMetadataFor: Record<string, string>;  // address => encrypted metadata
  
  // Blockchain-style linking
  prevHash: string;  // Hash of previous message
  hash: string;      // Hash of THIS message
  
  // Cryptographic proof
  signature: string;  // Sender's signature of the hash
  timestamp: number;
  
  // Thread context
  threadId: string;
  replyTo: string | null;
}

/**
 * Thread file structure (stored on IPFS)
 */
export interface ThreadFile {
  threadId: string;
  participants: string[];  // Sorted list of all participants
  version: number;
  lastUpdated: number;
  messages: SignedMessage[];
}

/**
 * Calculate hash of a message (for chain linking and signing)
 */
export function calculateMessageHash(message: Omit<SignedMessage, 'hash' | 'signature'>): string {
  // Create deterministic hash of all message fields except hash and signature
  // Note: participants are now public key hex strings, not wallet addresses
  return ethers.solidityPackedKeccak256(
    [
      'string',   // messageId
      'uint256',  // index
      'string[]', // participants (public key hex strings, sorted)
      'address',  // sender
      'string',   // encryptedFor (JSON stringified)
      'string',   // encryptedMetadataFor (JSON stringified)
      'bytes32',  // prevHash
      'uint256',  // timestamp
      'bytes32',  // threadId
      'string'    // replyTo (or empty string)
    ],
    [
      message.messageId,
      message.index,
      message.participants,
      message.sender,
      JSON.stringify(message.encryptedFor),
      JSON.stringify(message.encryptedMetadataFor),
      message.prevHash,
      message.timestamp,
      message.threadId,
      message.replyTo || ''
    ]
  );
}

/**
 * Sign a message hash with wallet
 */
export async function signMessage(
  messageHash: string,
  signer: ethers.Signer
): Promise<string> {
  return await signer.signMessage(ethers.getBytes(messageHash));
}

/**
 * Verify a message signature
 */
export function verifyMessageSignature(message: SignedMessage): boolean {
  try {
    const recoveredSigner = ethers.verifyMessage(
      ethers.getBytes(message.hash),
      message.signature
    );
    
    return recoveredSigner.toLowerCase() === message.sender.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Verify entire message chain integrity
 */
export interface ChainVerificationResult {
  valid: boolean;
  errors: Array<{
    index: number;
    messageId: string;
    error: string;
    severity: 'CRITICAL' | 'WARNING';
  }>;
  totalMessages: number;
  verifiedMessages: number;
}

export function verifyMessageChain(messages: SignedMessage[]): ChainVerificationResult {
  const errors: ChainVerificationResult['errors'] = [];
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    
    // 1. Verify signature
    if (!verifyMessageSignature(msg)) {
      errors.push({
        index: i,
        messageId: msg.messageId,
        error: 'Invalid signature - message may be forged',
        severity: 'CRITICAL'
      });
    }
    
    // 2. Verify hash matches content
    const calculatedHash = calculateMessageHash({
      messageId: msg.messageId,
      index: msg.index,
      participants: msg.participants,
      sender: msg.sender,
      encryptedFor: msg.encryptedFor,
      encryptedMetadataFor: msg.encryptedMetadataFor,
      prevHash: msg.prevHash,
      timestamp: msg.timestamp,
      threadId: msg.threadId,
      replyTo: msg.replyTo
    });
    
    if (calculatedHash !== msg.hash) {
      errors.push({
        index: i,
        messageId: msg.messageId,
        error: 'Hash mismatch - content has been tampered with',
        severity: 'CRITICAL'
      });
    }
    
    // 3. Verify chain link
    if (i === 0) {
      if (msg.prevHash !== ethers.ZeroHash) {
        errors.push({
          index: i,
          messageId: msg.messageId,
          error: 'First message must have zero prevHash',
          severity: 'WARNING'
        });
      }
    } else {
      const prevMsg = messages[i - 1];
      if (msg.prevHash !== prevMsg.hash) {
        errors.push({
          index: i,
          messageId: msg.messageId,
          error: 'Chain broken - prevHash does not match previous message hash',
          severity: 'CRITICAL'
        });
      }
    }
    
    // 4. Verify index sequence
    if (msg.index !== i) {
      errors.push({
        index: i,
        messageId: msg.messageId,
        error: `Index mismatch: expected ${i}, got ${msg.index}`,
        severity: 'WARNING'
      });
    }
  }
  
  const criticalErrors = errors.filter(e => e.severity === 'CRITICAL').length;
  
  return {
    valid: criticalErrors === 0,
    errors,
    totalMessages: messages.length,
    verifiedMessages: messages.length - criticalErrors
  };
}

/**
 * Create a new signed message
 */
export async function createSignedMessage(
  messageData: {
    participants: string[];
    sender: string;
    encryptedFor: Record<string, string>;
    encryptedMetadataFor: Record<string, string>;
    threadId: string;
    replyTo?: string;
  },
  previousMessage: SignedMessage | null,
  signer: ethers.Signer
): Promise<SignedMessage> {
  const messageId = Date.now().toString();
  const index = previousMessage ? previousMessage.index + 1 : 0;
  const timestamp = Date.now();
  const prevHash = previousMessage ? previousMessage.hash : ethers.ZeroHash;
  
  // Sort participants for consistency
  const sortedParticipants = [...messageData.participants].sort((a, b) => 
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  
  // Create message without hash and signature
  const messageWithoutProof: Omit<SignedMessage, 'hash' | 'signature'> = {
    messageId,
    index,
    participants: sortedParticipants,
    sender: messageData.sender,
    encryptedFor: messageData.encryptedFor,
    encryptedMetadataFor: messageData.encryptedMetadataFor,
    prevHash,
    timestamp,
    threadId: messageData.threadId,
    replyTo: messageData.replyTo || null
  };
  
  // Calculate hash
  const hash = calculateMessageHash(messageWithoutProof);
  
  // Sign the hash
  const signature = await signMessage(hash, signer);
  
  return {
    ...messageWithoutProof,
    hash,
    signature
  };
}

/**
 * Generate thread ID from participants (sorted for consistency)
 * Can use either wallet addresses OR public keys for mailbox-specific threads
 */
export function generateThreadId(participants: string[]): string {
  const sortedParticipants = [...participants].sort((a, b) => 
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  
  // Detect if using public keys (longer than addresses) or addresses
  const isPublicKey = sortedParticipants[0].length > 42;
  
  if (isPublicKey) {
    // For public keys, use solidityPackedKeccak256 with proper string encoding
    // This avoids buffer issues with raw bytes
    return ethers.solidityPackedKeccak256(
      ['string', 'string'],
      sortedParticipants
    );
  } else {
    // Use address[] for wallet addresses (backward compatibility)
    return ethers.solidityPackedKeccak256(
      ['address[]'],
      [sortedParticipants]
    );
  }
}

/**
 * Export thread for legal/archival purposes
 */
export interface ThreadArchive {
  // Metadata
  exportedBy: string;
  exportedAt: number;
  threadId: string;
  participants: string[];
  
  // Verification proof
  chainVerification: ChainVerificationResult;
  
  // Messages with full cryptographic proof
  messages: SignedMessage[];
  
  // Read receipt data (per participant)
  readReceipts?: {
    [participantAddress: string]: {
      lastReadIndex: number;
      totalMessages: number;
      unreadCount: number;
      joinedAtIndex: number;
      lastReadTimestamp?: number;
    };
  };
  
  // Archive signature (proves who exported it)
  archiveHash: string;
  archiveSignature: string;
  
  // Version info
  version: string;
  format: string;
}

/**
 * Export thread with verification
 */
export async function exportThreadArchive(
  threadFile: ThreadFile,
  exporterAddress: string,
  signer: ethers.Signer
): Promise<ThreadArchive> {
  // Verify chain before export
  const verification = verifyMessageChain(threadFile.messages);
  
  // Fetch read receipt data for all participants (if contractService is available)
  let readReceipts: ThreadArchive['readReceipts'] = {};
  try {
    // Import contractService dynamically to avoid circular dependency
    const { contractService } = await import('../utils/contracts');
    
    // Fetch read status for each participant
    for (const participant of threadFile.participants) {
      try {
        const status = await contractService.getReadStatus(threadFile.threadId, participant);
        readReceipts[participant] = {
          lastReadIndex: Number(status.lastReadIndex),
          totalMessages: Number(status.totalMessages),
          unreadCount: Number(status.unreadCount),
          joinedAtIndex: Number(status.joinedAtIndex)
        };
      } catch (error) {
        console.warn(`Could not fetch read status for ${participant}:`, error);
      }
    }
  } catch (error) {
    console.warn('Could not fetch read receipts:', error);
  }
  
  // Create archive
  const archive: Omit<ThreadArchive, 'archiveHash' | 'archiveSignature'> = {
    exportedBy: exporterAddress,
    exportedAt: Date.now(),
    threadId: threadFile.threadId,
    participants: threadFile.participants,
    chainVerification: verification,
    messages: threadFile.messages,
    readReceipts,
    version: '1.0.0',
    format: 'hashd-thread-archive'
  };
  
  // Sign the archive
  const archiveHash = ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'bytes32', 'uint256'],
    [archive.exportedBy, archive.exportedAt, archive.threadId, archive.messages.length]
  );
  
  const archiveSignature = await signer.signMessage(ethers.getBytes(archiveHash));
  
  return {
    ...archive,
    archiveHash,
    archiveSignature
  };
}

/**
 * Verify exported archive
 */
export function verifyArchive(archive: ThreadArchive): {
  archiveValid: boolean;
  chainValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // 1. Verify archive signature
  const archiveHash = ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'bytes32', 'uint256'],
    [archive.exportedBy, archive.exportedAt, archive.threadId, archive.messages.length]
  );
  
  let archiveValid = false;
  try {
    const archiveSigner = ethers.verifyMessage(
      ethers.getBytes(archiveHash),
      archive.archiveSignature
    );
    archiveValid = archiveSigner.toLowerCase() === archive.exportedBy.toLowerCase();
  } catch (error) {
    errors.push('Archive signature invalid - may be tampered');
  }
  
  // 2. Verify message chain
  const chainVerification = verifyMessageChain(archive.messages);
  
  if (!chainVerification.valid) {
    errors.push(...chainVerification.errors.map(e => e.error));
  }
  
  return {
    archiveValid,
    chainValid: chainVerification.valid,
    errors
  };
}
