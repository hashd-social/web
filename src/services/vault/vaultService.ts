/**
 * Vault Service
 * 
 * Handles direct communication with vault nodes for storage operations.
 * Replaces relayer-based storage with on-chain authorized vault storage.
 */

import { ethers } from 'ethers';

// Types
export type AuthorizationType = 'group_post' | 'group_comment' | 'message' | 'token_distribution';

export interface StorageAuthorization {
  type: AuthorizationType;
  sender: string;
  signature: string;
  timestamp: number;
  nonce: string;
  contentHash: string;
  groupPostsAddress?: string;
  postId?: number;
  threadId?: string;
  participants?: string[];
  tokenAddress?: string;
}

export interface VaultNode {
  nodeId: string;
  url: string;
  owner: string;
  active: boolean;
}

export interface StoreResponse {
  success: boolean;
  cid: string;
  timestamp: number;
  replicationStatus?: {
    target: number;
    confirmed: number;
  };
}

// Signature message format (must match vault service)
const SIGNATURE_MESSAGE_TEMPLATE = `HASHD Vault Storage Request
Type: {type}
Content Hash: {contentHash}
Context: {context}
Timestamp: {timestamp}
Nonce: {nonce}`;

// Default vault URL (used if settings not available)
const DEFAULT_VAULT_URL = process.env.REACT_APP_VAULT_API_URL || 'http://localhost:3004';

// Import settings store helpers (lazy to avoid circular deps)
const getVaultSettings = (): { primaryNode: string; strategy: 'auto' | 'primary' | 'all' } => {
  try {
    const { getVaultPrimaryNode, getVaultFallbackStrategy } = require('../../store/settingsStore');
    return {
      primaryNode: getVaultPrimaryNode() || DEFAULT_VAULT_URL,
      strategy: getVaultFallbackStrategy() || 'auto'
    };
  } catch {
    return { primaryNode: DEFAULT_VAULT_URL, strategy: 'auto' };
  }
};

// Import registry lookup
const getNodesFromRegistry = async (): Promise<{ nodeId: string; url: string; active: boolean }[]> => {
  try {
    const { getVaultNodesFromRegistry } = require('../../utils/contracts');
    return await getVaultNodesFromRegistry();
  } catch {
    return [];
  }
};

class VaultService {
  private vaultNodes: VaultNode[] = [];
  private lastNodeFetch: number = 0;
  private readonly NODE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get the primary vault URL from settings or default
   */
  getVaultUrl(): string {
    return getVaultSettings().primaryNode;
  }

  /**
   * Get all available node URLs for racing
   * Returns primary node + registry nodes
   */
  private async getAvailableNodeUrls(): Promise<string[]> {
    const settings = getVaultSettings();
    const urls = new Set<string>();
    
    // Always include primary node
    urls.add(settings.primaryNode);
    
    // Add registry nodes if strategy is auto or all
    if (settings.strategy !== 'primary') {
      const registryNodes = await getNodesFromRegistry();
      for (const node of registryNodes) {
        if (node.active) {
          urls.add(node.url);
        }
      }
    }
    
    // Also add default if different
    if (DEFAULT_VAULT_URL !== settings.primaryNode) {
      urls.add(DEFAULT_VAULT_URL);
    }
    
    return Array.from(urls);
  }

  /**
   * Race multiple nodes for fastest response (for GET requests)
   * Returns the first successful response
   */
  private async raceNodes<T>(
    path: string,
    parseResponse: (response: Response) => Promise<T>
  ): Promise<T> {
    const nodeUrls = await this.getAvailableNodeUrls();
    
    if (nodeUrls.length === 0) {
      throw new Error('No vault nodes available');
    }
    
    if (nodeUrls.length === 1) {
      const response = await fetch(`${nodeUrls[0]}${path}`);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return parseResponse(response);
    }
    
    // Race all nodes - first successful response wins
    return new Promise((resolve, reject) => {
      let resolved = false;
      let errorCount = 0;
      const errors: Error[] = [];
      
      nodeUrls.forEach(async (url) => {
        try {
          const response = await fetch(`${url}${path}`, {
            signal: AbortSignal.timeout(10000) // 10 second timeout per node
          });
          
          if (resolved) return; // Another node already won
          
          if (response.ok) {
            resolved = true;
            const result = await parseResponse(response);
            console.log(`🏆 Race winner: ${url}`);
            resolve(result);
          } else {
            throw new Error(`${url}: ${response.status}`);
          }
        } catch (error) {
          errorCount++;
          errors.push(error as Error);
          
          // If all nodes failed, reject with combined error
          if (errorCount === nodeUrls.length && !resolved) {
            reject(new Error(`All nodes failed: ${errors.map(e => e.message).join(', ')}`));
          }
        }
      });
    });
  }

  /**
   * Query all nodes and verify consistency (for "All Nodes" mode)
   * Fetches from multiple nodes and verifies they return identical data
   * Throws if nodes return different data (potential attack detected)
   */
  private async verifyConsistency(
    cid: string
  ): Promise<{ data: Uint8Array; verifiedNodes: number; totalNodes: number }> {
    const nodeUrls = await this.getAvailableNodeUrls();
    
    if (nodeUrls.length === 0) {
      throw new Error('No vault nodes available');
    }
    
    console.log(`🔍 Verifying consistency across ${nodeUrls.length} nodes for CID: ${cid.slice(0, 16)}...`);
    
    // Fetch from all nodes in parallel
    const results = await Promise.allSettled(
      nodeUrls.map(async (url) => {
        const response = await fetch(`${url}/blob/${cid}`, {
          signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) {
          throw new Error(`${response.status}`);
        }
        const json = await response.json();
        return { url, ciphertext: json.ciphertext };
      })
    );
    
    // Collect successful responses
    const successfulResults: { url: string; ciphertext: string }[] = [];
    const failedNodes: string[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value);
      } else {
        failedNodes.push(nodeUrls[index]);
      }
    });
    
    if (successfulResults.length === 0) {
      throw new Error(`All ${nodeUrls.length} nodes failed to respond`);
    }
    
    // Verify all successful responses have identical ciphertext
    const firstCiphertext = successfulResults[0].ciphertext;
    const inconsistentNodes: string[] = [];
    
    for (let i = 1; i < successfulResults.length; i++) {
      if (successfulResults[i].ciphertext !== firstCiphertext) {
        inconsistentNodes.push(successfulResults[i].url);
      }
    }
    
    if (inconsistentNodes.length > 0) {
      console.error('🚨 CONSISTENCY VIOLATION DETECTED!');
      console.error('  Reference node:', successfulResults[0].url);
      console.error('  Inconsistent nodes:', inconsistentNodes);
      throw new Error(
        `DATA CONSISTENCY VIOLATION: ${inconsistentNodes.length} node(s) returned different data. ` +
        `This may indicate a targeted attack. Inconsistent: ${inconsistentNodes.join(', ')}`
      );
    }
    
    // All nodes agree - decode and return
    const binaryString = atob(firstCiphertext);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    console.log(`✅ Consistency verified: ${successfulResults.length}/${nodeUrls.length} nodes agree`);
    if (failedNodes.length > 0) {
      console.warn(`⚠️ ${failedNodes.length} node(s) failed to respond:`, failedNodes);
    }
    
    return {
      data: bytes,
      verifiedNodes: successfulResults.length,
      totalNodes: nodeUrls.length
    };
  }

  /**
   * Generate a random nonce for replay protection
   */
  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Create the signature message for authorization
   */
  private createSignatureMessage(
    type: AuthorizationType,
    contentHash: string,
    context: string,
    timestamp: number,
    nonce: string
  ): string {
    return SIGNATURE_MESSAGE_TEMPLATE
      .replace('{type}', type)
      .replace('{contentHash}', contentHash)
      .replace('{context}', context)
      .replace('{timestamp}', timestamp.toString())
      .replace('{nonce}', nonce);
  }

  /**
   * Get context string based on authorization type
   */
  private getContext(
    type: AuthorizationType,
    options: {
      groupPostsAddress?: string;
      threadId?: string;
      tokenAddress?: string;
    }
  ): string {
    switch (type) {
      case 'group_post':
      case 'group_comment':
        return options.groupPostsAddress || '';
      case 'message':
        return options.threadId || '';
      case 'token_distribution':
        return options.tokenAddress || '';
      default:
        return '';
    }
  }

  /**
   * Create authorization object with signature
   */
  async createAuthorization(
    type: AuthorizationType,
    data: Uint8Array,
    options: {
      groupPostsAddress?: string;
      postId?: number;
      threadId?: string;
      participants?: string[];
      tokenAddress?: string;
    }
  ): Promise<StorageAuthorization> {
    // Get signer
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const sender = await signer.getAddress();

    // Create content hash
    const contentHash = ethers.keccak256(data);

    // Generate timestamp and nonce
    const timestamp = Date.now();
    const nonce = this.generateNonce();

    // Get context for signature
    const context = this.getContext(type, options);

    // Create and sign message
    const message = this.createSignatureMessage(type, contentHash, context, timestamp, nonce);
    const signature = await signer.signMessage(message);

    // Build authorization object
    const authorization: StorageAuthorization = {
      type,
      sender,
      signature,
      timestamp,
      nonce,
      contentHash,
    };

    // Add type-specific fields
    if (options.groupPostsAddress) {
      authorization.groupPostsAddress = options.groupPostsAddress;
    }
    if (options.postId !== undefined) {
      authorization.postId = options.postId;
    }
    if (options.threadId) {
      authorization.threadId = options.threadId;
    }
    if (options.participants) {
      authorization.participants = options.participants;
    }
    if (options.tokenAddress) {
      authorization.tokenAddress = options.tokenAddress;
    }

    return authorization;
  }

  /**
   * Upload data to vault with authorization
   */
  async uploadToVault(
    data: Uint8Array,
    type: AuthorizationType,
    options: {
      groupPostsAddress?: string;
      postId?: number;
      threadId?: string;
      participants?: string[];
      tokenAddress?: string;
    }
  ): Promise<StoreResponse> {
    // Create authorization
    const authorization = await this.createAuthorization(type, data, options);

    // Convert data to base64 for JSON transport
    const base64Data = btoa(Array.from(data).map(b => String.fromCharCode(b)).join(''));

    // Build request body
    const requestBody = {
      ciphertext: base64Data,
      mimeType: 'application/octet-stream',
      authorization,
    };

    // Upload to vault
    const response = await fetch(`${this.getVaultUrl()}/store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Vault upload failed: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return {
      success: true,
      cid: result.cid,
      timestamp: result.timestamp || Date.now(),
      replicationStatus: result.replicationStatus,
    };
  }

  /**
   * Upload a group post to vault
   */
  async uploadGroupPost(
    encryptedData: Uint8Array,
    groupPostsAddress: string
  ): Promise<string> {
    const result = await this.uploadToVault(encryptedData, 'group_post', {
      groupPostsAddress,
    });
    return result.cid;
  }

  /**
   * Upload a group comment to vault
   */
  async uploadGroupComment(
    encryptedData: Uint8Array,
    groupPostsAddress: string,
    postId: number
  ): Promise<string> {
    const result = await this.uploadToVault(encryptedData, 'group_comment', {
      groupPostsAddress,
      postId,
    });
    return result.cid;
  }

  /**
   * Upload a message thread file to vault
   */
  async uploadMessage(
    encryptedData: Uint8Array,
    threadId: string,
    participants: string[]
  ): Promise<string> {
    const result = await this.uploadToVault(encryptedData, 'message', {
      threadId,
      participants,
    });
    return result.cid;
  }

  /**
   * Upload token distribution data to vault
   */
  async uploadTokenDistribution(
    data: Uint8Array,
    tokenAddress: string
  ): Promise<string> {
    const result = await this.uploadToVault(data, 'token_distribution', {
      tokenAddress,
    });
    return result.cid;
  }

  /**
   * Parse blob response and decode to Uint8Array
   */
  private async parseBlobResponse(response: Response): Promise<Uint8Array> {
    const result = await response.json();
    const binaryString = atob(result.ciphertext);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Compute SHA-256 hash of data and return as hex string (matching CID format)
   */
  private async computeHash(data: Uint8Array): Promise<string> {
    // Create a new ArrayBuffer copy to avoid SharedArrayBuffer issues
    const buffer = new ArrayBuffer(data.length);
    new Uint8Array(buffer).set(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify that data matches the expected CID (SHA-256 hash)
   * Throws if hash doesn't match - indicates fake/tampered data
   */
  private async verifyDataIntegrity(data: Uint8Array, expectedCid: string): Promise<void> {
    const actualHash = await this.computeHash(data);
    
    // Normalize CID (remove 0x prefix if present)
    const normalizedCid = expectedCid.startsWith('0x') 
      ? expectedCid.slice(2).toLowerCase() 
      : expectedCid.toLowerCase();
    
    if (actualHash !== normalizedCid) {
      console.error('🚨 DATA INTEGRITY VIOLATION!');
      console.error('  Expected CID:', normalizedCid);
      console.error('  Actual hash:', actualHash);
      throw new Error(
        `DATA INTEGRITY VIOLATION: Received data does not match CID. ` +
        `Expected: ${normalizedCid.slice(0, 16)}..., Got: ${actualHash.slice(0, 16)}... ` +
        `This indicates the vault node returned fake/tampered data.`
      );
    }
  }

  /**
   * Retrieve blob from vault by CID
   * Strategy:
   * - 'auto': Race all nodes, first response wins + verify hash
   * - 'primary': Only use configured primary node + verify hash
   * - 'all': Query all nodes, verify consistency + verify hash
   * 
   * ALL modes verify that returned data hashes to the expected CID
   */
  async getBlob(cid: string): Promise<Uint8Array> {
    const settings = getVaultSettings();
    let data: Uint8Array;
    
    // All nodes mode - verify consistency across nodes
    if (settings.strategy === 'all') {
      const result = await this.verifyConsistency(cid);
      data = result.data;
    }
    // Auto mode - race all nodes, first response wins
    else if (settings.strategy === 'auto') {
      data = await this.raceNodes(`/blob/${cid}`, this.parseBlobResponse.bind(this));
    }
    // Primary only mode
    else {
      const response = await fetch(`${this.getVaultUrl()}/blob/${cid}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Blob not found: ${cid}`);
        }
        throw new Error(`Failed to retrieve blob: ${response.status}`);
      }

      data = await this.parseBlobResponse(response);
    }
    
    // CRITICAL: Verify data integrity - hash must match CID
    await this.verifyDataIntegrity(data, cid);
    
    return data;
  }

  /**
   * Retrieve blob with fallback to multiple nodes
   * @deprecated Use getBlob() which now handles fallback via race strategy
   */
  async getBlobWithFallback(cid: string): Promise<Uint8Array> {
    return this.getBlob(cid);
  }

  /**
   * Check vault health
   */
  async checkHealth(): Promise<{ status: string; healthy: boolean }> {
    try {
      const response = await fetch(`${this.getVaultUrl()}/health`);
      const data = await response.json();
      return {
        status: data.status,
        healthy: data.status === 'healthy',
      };
    } catch (error) {
      return {
        status: 'unreachable',
        healthy: false,
      };
    }
  }
}

// Export singleton instance
export const vaultService = new VaultService();

/**
 * Test function to verify hash checking works
 * Call from browser console: window.testVaultIntegrity()
 */
(window as any).testVaultIntegrity = async () => {
  console.log('🧪 Testing vault data integrity verification...\n');
  
  // Test 1: Verify computeHash works
  console.log('Test 1: Hash computation');
  const testData = new TextEncoder().encode('Hello, World!');
  const hash = await (vaultService as any).computeHash(testData);
  console.log('  Input: "Hello, World!"');
  console.log('  SHA-256:', hash);
  console.log('  Expected: dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f');
  console.log('  Match:', hash === 'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f' ? '✅' : '❌');
  
  // Test 2: Verify integrity check passes for valid data
  console.log('\nTest 2: Valid data integrity check');
  try {
    await (vaultService as any).verifyDataIntegrity(testData, 'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f');
    console.log('  ✅ Valid data passed integrity check');
  } catch (e: any) {
    console.log('  ❌ Valid data failed:', e.message);
  }
  
  // Test 3: Verify integrity check FAILS for tampered data
  console.log('\nTest 3: Tampered data integrity check');
  const tamperedData = new TextEncoder().encode('Hello, World! TAMPERED');
  try {
    await (vaultService as any).verifyDataIntegrity(tamperedData, 'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f');
    console.log('  ❌ Tampered data passed (THIS IS BAD!)');
  } catch (e: any) {
    console.log('  ✅ Tampered data correctly rejected');
    console.log('  Error:', e.message.slice(0, 80) + '...');
  }
  
  console.log('\n🧪 Tests complete!');
};
