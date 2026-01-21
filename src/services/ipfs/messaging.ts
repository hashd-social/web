import { getVaultPrimaryNode } from '../../store/settingsStore';
import { contractService, bytes32ToCid } from '../../utils/contracts';
import { vaultService } from '../vault';

interface Message {
  messageId: number;
  sender: string;
  recipient: string;
  encryptedContent: string;
  encryptedMetadata: string;
  timestamp: number;
  txHash: string;
  replyTo: number | null;
  isRead: boolean;
}

interface Thread {
  threadId: string;
  participants: string[];
  subject: string;
  createdAt: number;
  lastMessageAt: number;
  messageCount: number;
  unreadCount: number;
  messages: Message[];
  isGroup: boolean;
}

interface UserMessageFile {
  owner: string;
  publicKey: string;
  currentCID: string;
  ipnsName: string;
  lastUpdated: number;
  version: number;
  messages: Message[];
}

export class IPFSService {

  /**
   * Get user messages - fetches from vault by CID
   */
  async getUserMessages(userAddress: string, cid?: string): Promise<UserMessageFile> {
    if (cid) {
      try {
        const data = await vaultService.getBlobWithFallback(cid);
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(data));
      } catch (err) {
        console.error('Failed to fetch from vault:', err);
      }
    }
    
    // Return empty structure if no CID
    return {
      owner: userAddress,
      publicKey: '',
      currentCID: '',
      ipnsName: '',
      lastUpdated: Date.now(),
      version: 0,
      messages: []
    };
  }

  /**
   * Send signed message to shared thread
   * Uploads directly to vault and returns CID for on-chain recording
   */
  async sendSignedMessage(
    signedMessage: any,
    threadId: string,
    participants: string[]
  ): Promise<{ messageId: string; threadCID: string; messageIndex: number; threadMessageCount: number }> {
    // Get current thread or create new one
    let threadData = await this.getThread(threadId);
    
    if (!threadData) {
      threadData = {
        threadId,
        participants,
        messages: [],
        version: 0,
        lastUpdated: Date.now()
      };
    }
    
    // Add message to thread
    const messageIndex = threadData.messages.length;
    threadData.messages.push(signedMessage);
    threadData.version++;
    threadData.lastUpdated = Date.now();
    
    // Encrypt and upload to vault
    const encoder = new TextEncoder();
    const threadBytes = encoder.encode(JSON.stringify(threadData));
    
    // TODO: Get appId from ByteCave context
    const appId = 'hashd';
    const threadCID = await vaultService.storeMessage(threadBytes, threadId, participants, appId);
    
    // Cache the new CID
    this.cacheThreadCID(threadId, threadCID);
    
    return {
      messageId: `${threadId}-${messageIndex}`,
      threadCID,
      messageIndex,
      threadMessageCount: threadData.messages.length
    };
  }

  /**
   * Get thread file - tries vault first, then contract CID fallback
   */
  async getThread(threadId: string): Promise<any> {
    const cachedCID = this.getCachedThreadCID(threadId);
    
    // Try cached CID first (fastest)
    if (cachedCID) {
      try {
        const data = await this.getThreadByCID(cachedCID);
        console.log('✅ Loaded thread from vault (cached CID)');
        return data;
      } catch (err) {
        console.warn('Cached CID fetch failed, trying contract...');
      }
    }
    
    // Fallback: Get CID from contract
    try {
      console.log('Fetching CID from contract for thread:', threadId);
      const cidBytes32 = await contractService.getThreadCID(threadId);
      
      if (cidBytes32 && cidBytes32 !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        const cid = bytes32ToCid(cidBytes32);
        console.log(`Contract CID: ${cid}`);
        
        this.cacheThreadCID(threadId, cid);
        
        const data = await this.getThreadByCID(cid);
        console.log('✅ Loaded thread from vault (contract CID)');
        return data;
      } else {
        console.log('Thread has no CID on contract yet');
        return null;
      }
    } catch (contractError: any) {
      // 404 is expected for new threads - don't log as error
      const is404 = contractError?.message?.includes('404') || contractError?.message?.includes('Not Found');
      if (!is404) {
        console.error('Contract fetch failed:', contractError);
      }
      return null;
    }
  }

  /**
   * Get thread file with CID - tries vault first, then contract fallback
   */
  async getThreadWithCID(threadId: string): Promise<{ data: any; cid: string | null } | null> {
    const cachedCID = this.getCachedThreadCID(threadId);
    
    if (cachedCID) {
      try {
        const data = await this.getThreadByCID(cachedCID);
        return { data, cid: cachedCID };
      } catch (err) {
        console.warn('Cached CID fetch failed');
      }
    }
    
    // Try contract
    try {
      const cidBytes32 = await contractService.getThreadCID(threadId);
      if (cidBytes32 && cidBytes32 !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        const cid = bytes32ToCid(cidBytes32);
        this.cacheThreadCID(threadId, cid);
        const data = await this.getThreadByCID(cid);
        return { data, cid };
      }
    } catch (err: any) {
      // 404 is expected for new threads - don't log as error
      const is404 = err?.message?.includes('404') || err?.message?.includes('Not Found');
      if (!is404) {
        console.error('Contract fetch failed:', err);
      }
    }
    
    return null;
  }

  /**
   * Fetch thread directly from vault by CID
   */
  async getThreadByCID(cid: string): Promise<any> {
    const data = await vaultService.getBlobWithFallback(cid);
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(data));
  }

  /**
   * Cache thread CIDs in localStorage for fallback
   */
  private cacheThreadCID(threadId: string, cid: string): void {
    try {
      const cache = JSON.parse(localStorage.getItem('threadCIDCache') || '{}');
      cache[threadId] = { cid, timestamp: Date.now() };
      // Keep only last 100 entries
      const entries = Object.entries(cache);
      if (entries.length > 100) {
        const sorted = entries.sort((a: any, b: any) => b[1].timestamp - a[1].timestamp);
        const trimmed = Object.fromEntries(sorted.slice(0, 100));
        localStorage.setItem('threadCIDCache', JSON.stringify(trimmed));
      } else {
        localStorage.setItem('threadCIDCache', JSON.stringify(cache));
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  private getCachedThreadCID(threadId: string): string | null {
    try {
      const cache = JSON.parse(localStorage.getItem('threadCIDCache') || '{}');
      const entry = cache[threadId];
      if (entry) {
        // Cache valid for 24 hours
        if (Date.now() - entry.timestamp < 24 * 60 * 60 * 1000) {
          return entry.cid;
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    return null;
  }

  /**
   * Legacy sendMessage - deprecated, throws error
   */
  async sendMessage(
    sender: string,
    recipient: string,
    senderPublicKey: string,
    recipientPublicKey: string,
    senderEncryptedContent: string,
    recipientEncryptedContent: string,
    senderEncryptedMetadata: string,
    recipientEncryptedMetadata: string,
    subject?: string,
    replyTo?: number
  ): Promise<{ messageId: number; senderCID: string; recipientCID: string }> {
    console.warn('⚠️ Legacy sendMessage called - use sendSignedMessage instead');
    throw new Error('Legacy sendMessage is deprecated. Use sendSignedMessage with vault storage.');
  }

  /**
   * Mark message as read - now handled client-side
   */
  async markAsRead(
    userAddress: string,
    userPublicKey: string,
    messageId: number
  ): Promise<{ cid: string }> {
    console.log('markAsRead called - read receipts now handled client-side');
    return { cid: '' };
  }

  getInboxMessages(messageFile: UserMessageFile, userAddress: string): Message[] {
    return messageFile.messages
      .filter(msg => msg.recipient.toLowerCase() === userAddress.toLowerCase())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getSentMessages(messageFile: UserMessageFile, userAddress: string): Message[] {
    return messageFile.messages
      .filter(msg => msg.sender.toLowerCase() === userAddress.toLowerCase())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getUnreadCount(messageFile: UserMessageFile, userAddress: string): number {
    return messageFile.messages.filter(
      msg => msg.recipient.toLowerCase() === userAddress.toLowerCase() && !msg.isRead
    ).length;
  }
}

export const ipfsService = new IPFSService();
