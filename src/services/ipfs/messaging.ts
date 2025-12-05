import axios from 'axios';
import { getIPFSGateway } from '../../store/settingsStore';
import { contractService, bytes32ToCid } from '../../utils/contracts';

const RELAYER_URL = process.env.REACT_APP_RELAYER_URL || 'http://localhost:3001';
const DEFAULT_IPFS_GATEWAY = process.env.REACT_APP_IPFS_GATEWAY || 'https://3oh.myfilebase.com/ipfs';

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
  async initializeUser(userAddress: string, publicKey: string): Promise<{ ipnsName: string; cid: string }> {
    const response = await axios.post(`${RELAYER_URL}/api/messages/initialize`, {
      userAddress,
      publicKey
    });
    return response.data;
  }

  async getUserMessages(userAddress: string, cid?: string): Promise<UserMessageFile> {
    // If CID is provided, fetch directly from IPFS gateway
    if (cid) {
      try {
        const gateway = getIPFSGateway() || DEFAULT_IPFS_GATEWAY;
        const response = await axios.get(`${gateway}/${cid}`, { timeout: 10000 });
        return response.data;
      } catch (err) {
        console.error('Failed to fetch from IPFS gateway:', err);
      }
    }
    
    // Fallback to relayer (for backwards compatibility or if CID not provided)
    const response = await axios.get(`${RELAYER_URL}/api/messages/user/${userAddress}`);
    return response.data.data;
  }

  // NEW: Send signed message to shared thread
  async sendSignedMessage(
    signedMessage: any,
    threadId: string
  ): Promise<{ messageId: string; threadCID: string; messageIndex: number; threadMessageCount: number }> {
    const response = await axios.post(`${RELAYER_URL}/api/messages/send`, {
      signedMessage,
      threadId
    });
    return response.data;
  }

  // Get thread file - tries relayer first, then contract+IPFS gateway fallback
  // Priority: 1. Relayer (fastest), 2. Cached CID, 3. Contract CID
  async getThread(threadId: string): Promise<any> {
    // First check if we have a cached CID (allows offline-first)
    const cachedCID = this.getCachedThreadCID(threadId);
    
    try {
      const response = await axios.get(`${RELAYER_URL}/api/threads/${threadId}`, { timeout: 10000 });
      
      // Cache the CID from response for future fallback
      if (response.data.cid) {
        this.cacheThreadCID(threadId, response.data.cid);
      }
      
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Thread doesn't exist yet
        return null;
      }
      
      // Relayer unavailable - try fallbacks
      console.warn('⚠️ Relayer unavailable, trying fallbacks...');
      
      // Fallback 1: Try cached CID
      if (cachedCID) {
        console.log(`   Trying cached CID ${cachedCID.slice(0, 12)}...`);
        try {
          const data = await this.getThreadByCID(cachedCID);
          console.log('✅ Loaded thread from IPFS gateway (cached CID)');
          return data;
        } catch (ipfsError) {
          console.warn('   Cached CID fetch failed, trying contract...');
        }
      }
      
      // Fallback 2: Get CID from contract (decentralized source of truth)
      try {
        console.log('   Fetching CID from contract...');
        console.log('   Thread ID:', threadId);
        const cidBytes32 = await contractService.getThreadCID(threadId);
        console.log('   Raw bytes32 from contract:', cidBytes32);
        
        if (cidBytes32 && cidBytes32 !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
          const cid = bytes32ToCid(cidBytes32);
          console.log(`   Contract CID: ${cid}`);
          
          // Cache it for future use
          this.cacheThreadCID(threadId, cid);
          
          const data = await this.getThreadByCID(cid);
          console.log('✅ Loaded thread from IPFS gateway (contract CID)');
          return data;
        } else {
          console.log('   Thread has no CID on contract yet (returned zero bytes)');
        }
      } catch (contractError) {
        console.error('   Contract fetch failed:', contractError);
        console.error('   Error details:', contractError instanceof Error ? contractError.message : String(contractError));
      }
      
      throw error;
    }
  }

  // Get thread file with CID - tries relayer first, then contract+IPFS gateway fallback
  async getThreadWithCID(threadId: string): Promise<{ data: any; cid: string | null } | null> {
    try {
      const response = await axios.get(`${RELAYER_URL}/api/threads/${threadId}`, { timeout: 10000 });
      const cid = response.data.cid || null;
      
      // Cache the CID for fallback use
      if (cid) {
        this.cacheThreadCID(threadId, cid);
      }
      
      return {
        data: response.data.data,
        cid: cid
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      
      // Relayer unavailable - try fallbacks
      console.warn('⚠️ Relayer unavailable, trying fallbacks...');
      
      // Fallback 1: Try cached CID
      const cachedCID = this.getCachedThreadCID(threadId);
      if (cachedCID) {
        console.log(`   Trying cached CID ${cachedCID.slice(0, 12)}...`);
        try {
          const data = await this.getThreadByCID(cachedCID);
          console.log('✅ Loaded thread from IPFS gateway (cached CID)');
          return { data, cid: cachedCID };
        } catch (ipfsError) {
          console.warn('   Cached CID fetch failed, trying contract...');
        }
      }
      
      // Fallback 2: Get CID from contract (decentralized source of truth)
      try {
        console.log('   Fetching CID from contract...');
        console.log('   Thread ID:', threadId);
        const cidBytes32 = await contractService.getThreadCID(threadId);
        console.log('   Raw bytes32 from contract:', cidBytes32);
        
        if (cidBytes32 && cidBytes32 !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
          const cid = bytes32ToCid(cidBytes32);
          console.log(`   Contract CID: ${cid}`);
          
          // Cache it for future use
          this.cacheThreadCID(threadId, cid);
          
          const data = await this.getThreadByCID(cid);
          console.log('✅ Loaded thread from IPFS gateway (contract CID)');
          return { data, cid };
        } else {
          console.log('   Thread has no CID on contract yet (returned zero bytes)');
        }
      } catch (contractError) {
        console.error('   Contract fetch failed:', contractError);
        console.error('   Error details:', contractError instanceof Error ? contractError.message : String(contractError));
      }
      
      throw error;
    }
  }

  // Fetch thread directly from IPFS by CID (no relayer needed)
  async getThreadByCID(cid: string): Promise<any> {
    const gateway = getIPFSGateway() || DEFAULT_IPFS_GATEWAY;
    const response = await axios.get(`${gateway}/${cid}`, { timeout: 10000 });
    return response.data;
  }

  // Cache thread CIDs in localStorage for fallback
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

  // LEGACY: Old sendMessage (deprecated)
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
    console.warn('⚠️ Using legacy sendMessage - should migrate to sendSignedMessage');
    const response = await axios.post(`${RELAYER_URL}/api/messages/send`, {
      sender,
      recipient,
      senderPublicKey,
      recipientPublicKey,
      senderEncryptedContent,
      recipientEncryptedContent,
      senderEncryptedMetadata,
      recipientEncryptedMetadata,
      subject,
      replyTo
    });
    return response.data;
  }

  async markAsRead(
    userAddress: string,
    userPublicKey: string,
    messageId: number
  ): Promise<{ cid: string }> {
    const response = await axios.post(`${RELAYER_URL}/api/messages/mark-read`, {
      userAddress,
      userPublicKey,
      messageId
    });
    return response.data;
  }

  getInboxMessages(messageFile: UserMessageFile, userAddress: string): Message[] {
    // Inbox = messages where user is recipient
    // These come from OTHER users' files (fetched via on-chain lookups)
    return messageFile.messages
      .filter(msg => msg.recipient.toLowerCase() === userAddress.toLowerCase())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getSentMessages(messageFile: UserMessageFile, userAddress: string): Message[] {
    // Sent = messages where user is sender
    // These come from the user's own file
    return messageFile.messages
      .filter(msg => msg.sender.toLowerCase() === userAddress.toLowerCase())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getUnreadCount(messageFile: UserMessageFile, userAddress: string): number {
    // Count unread messages where user is recipient
    return messageFile.messages.filter(
      msg => msg.recipient.toLowerCase() === userAddress.toLowerCase() && !msg.isRead
    ).length;
  }
}

export const ipfsService = new IPFSService();
