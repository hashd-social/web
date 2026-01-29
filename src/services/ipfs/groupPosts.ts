import { ethers } from 'ethers';
import { cidToBytes32, bytes32ToCid } from '../../utils/contracts';

/**
 * Group Posts Storage Service
 * Handles encryption, upload, download, and decryption of group post content
 * 
 * Storage: Uses ByteCave P2P via @gethashd/bytecave-browser
 */

// Get ByteCave retrieve function from window context
// This is set by ByteCaveProvider in App.tsx
const getByteCaveRetrieve = () => {
  const context = (window as any).__BYTECAVE_CONTEXT__;
  if (!context?.retrieve) {
    throw new Error('ByteCave not initialized. Ensure ByteCaveProvider is mounted.');
  }
  return context.retrieve;
};

export interface PostContent {
  title: string;
  text: string;
  image?: string; // Base64 encoded image
  timestamp: number;
  author: string;
}

export interface CommentContent {
  text: string;
  timestamp: number;
  author: string;
}

/**
 * Encrypt content with group's symmetric key
 */
export async function encryptContent(
  content: PostContent | CommentContent,
  groupKey: string
): Promise<Uint8Array> {
  const jsonString = JSON.stringify(content);
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonString);
  
  // Use AES-GCM encryption
  const keyData = ethers.getBytes(ethers.id(groupKey));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData.slice(0, 32), // Use first 32 bytes for AES-256
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  // Combine IV + encrypted data
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);
  
  return result;
}

/**
 * Decrypt content with group's symmetric key
 */
export async function decryptContent(
  encryptedData: Uint8Array,
  groupKey: string
): Promise<PostContent | CommentContent> {
  // Extract IV and encrypted data
  const iv = encryptedData.slice(0, 12);
  const encrypted = encryptedData.slice(12);
  
  // Import key
  const keyData = ethers.getBytes(ethers.id(groupKey));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData.slice(0, 32),
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );
  
  // Parse JSON
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decrypted);
  return JSON.parse(jsonString);
}

/**
 * Upload encrypted content to ByteCave
 * NOTE: This is now handled directly in CreatePost.tsx using bytecave-browser's store()
 * This function is kept for backward compatibility but should not be used for new code
 */
export async function uploadToVault(
  encryptedData: Uint8Array,
  userAddress: string,
  groupPostsAddress: string
): Promise<string> {
  throw new Error('uploadToVault is deprecated. Use bytecave-browser store() directly in components.');
}

// Legacy alias for backward compatibility
export const uploadToIPFS = uploadToVault;

/**
 * Download content from ByteCave using bytecave-browser
 * NOTE: This uses the global ByteCave context from @gethashd/bytecave-browser
 * Components should use useHashdUrl hook for automatic retrieval
 */
export async function downloadFromVault(cid: string): Promise<Uint8Array> {
  const retrieve = getByteCaveRetrieve();
  
  console.log('📥 Downloading from ByteCave P2P:', cid);
  const result = await retrieve(cid);
  
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to retrieve content from ByteCave');
  }
  
  return result.data;
}

// Legacy alias for backward compatibility
export const downloadFromIPFS = downloadFromVault;

// CID conversion functions are imported from utils/contracts.ts
// ByteCave uses SHA-256 hex strings (64 chars) as CIDs
// These are converted to/from bytes32 for on-chain storage
export { cidToBytes32, bytes32ToCid } from '../../utils/contracts';

/**
 * High-level function: Encrypt and upload post content
 */
export async function encryptAndUploadPost(
  content: PostContent,
  groupKey: string,
  userAddress: string,
  groupPostsAddress: string
): Promise<string> {
  const encrypted = await encryptContent(content, groupKey);
  const cid = await uploadToVault(encrypted, userAddress, groupPostsAddress);
  
  return cid;
}

/**
 * High-level function: Download and decrypt post content
 */
export async function downloadAndDecryptPost(
  cid: string,
  groupKey: string
): Promise<PostContent> {
  const encrypted = await downloadFromVault(cid);
  const content = await decryptContent(encrypted, groupKey);
  return content as PostContent;
}

/**
 * High-level function: Encrypt and upload comment content
 */
export async function encryptAndUploadComment(
  content: CommentContent,
  groupKey: string,
  userAddress: string,
  groupPostsAddress: string
): Promise<string> {
  const encrypted = await encryptContent(content, groupKey);
  const cid = await uploadToVault(encrypted, userAddress, groupPostsAddress);
  
  return cid;
}

/**
 * High-level function: Download and decrypt comment content
 */
export async function downloadAndDecryptComment(
  cid: string,
  groupKey: string
): Promise<CommentContent> {
  const encrypted = await downloadFromVault(cid);
  const content = await decryptContent(encrypted, groupKey);
  return content as CommentContent;
}

/**
 * Access levels for posts
 */
export enum AccessLevel {
  PUBLIC = 0,
  MEMBERS_ONLY = 1,
  TOKEN_HOLDERS = 2,
  NFT_HOLDERS = 3
}

/**
 * Derive encryption key for a group with access level
 */
export function deriveGroupKey(groupTokenAddress: string, accessLevel: AccessLevel = AccessLevel.MEMBERS_ONLY): string {
  // Derive a deterministic key from the group token address + access level
  // Different access levels have different encryption keys for better security
  return ethers.id(`group_encryption_key_${groupTokenAddress.toLowerCase()}_level_${accessLevel}`);
}

/**
 * Note: Images are embedded in post content and encrypted together
 * No separate image upload needed - images are part of the encrypted post data
 */

/**
 * Get ByteCave gateway URL for viewing content
 * NOTE: With P2P, we use hashd:// URLs instead of HTTP gateways
 */
export function getVaultGatewayUrl(cid: string): string {
  return `hashd://${cid}`;
}

// Legacy alias for backward compatibility
export const getIPFSGatewayUrl = getVaultGatewayUrl;

