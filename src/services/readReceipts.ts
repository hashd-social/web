import { ethers } from 'ethers';
import { contractService } from '../utils/contracts';

export interface ReadStatus {
  lastReadIndex: number;
  totalMessages: number;
  unreadCount: number;
  joinedAtIndex: number;
}

export interface MessageReadStatus {
  messageIndex: number;
  canRead: boolean;
  readBy: {
    address: string;
    readAt: number | null;
  }[];
}

/**
 * Mark thread as read when user opens it (batch read all messages up to index)
 */
export async function markThreadAsRead(
  threadId: string,
  messageIndex: number
): Promise<ethers.ContractTransactionResponse> {
  console.log(`📖 Marking thread ${threadId} as read up to index ${messageIndex}`);
  
  const tx = await contractService.markThreadAsRead(threadId, messageIndex);
  
  console.log(`⏳ Waiting for read receipt tx: ${tx.hash}`);
  await tx.wait();
  
  console.log(`✅ Thread marked as read`);
  return tx;
}

/**
 * Get read status for current user in a thread
 */
export async function getReadStatus(
  threadId: string,
  participant: string
): Promise<ReadStatus> {
  return await contractService.getReadStatus(threadId, participant);
}

/**
 * Batch get read status for multiple threads (for inbox view)
 */
export async function batchGetReadStatus(
  threadIds: string[],
  participant: string
): Promise<Map<string, ReadStatus>> {
  return await contractService.batchGetReadStatus(threadIds, participant);
}

/**
 * Check if participant can read a specific message
 */
export async function canReadMessage(
  threadId: string,
  participant: string,
  messageIndex: number
): Promise<boolean> {
  return await contractService.canReadMessage(threadId, participant, messageIndex);
}

/**
 * Add a participant to a thread (they can only read messages from this point forward)
 */
export async function addParticipantToThread(
  threadId: string,
  participant: string
): Promise<ethers.ContractTransactionResponse> {
  console.log(`👥 Adding participant ${participant} to thread ${threadId}`);
  
  const tx = await contractService.addParticipantToThread(threadId, participant);
  
  console.log(`⏳ Waiting for add participant tx: ${tx.hash}`);
  await tx.wait();
  
  console.log(`✅ Participant added to thread`);
  return tx;
}

/**
 * Generate thread ID from participants (sorted for consistency)
 */
export function generateThreadId(participants: string[]): string {
  const sortedParticipants = [...participants].sort((a, b) => 
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  
  return ethers.solidityPackedKeccak256(
    ['address[]'],
    [sortedParticipants]
  );
}
