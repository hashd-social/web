import { ethers } from 'ethers';
import { getVaultPrimaryNode } from '../../store/settingsStore';
import { vaultService } from '../vault';

/**
 * IPFS Service for Group Posts
 * Handles encryption, upload, download, and decryption of group post content
 * 
 * Storage: Uses vault nodes with on-chain authorization verification
 */

// Helper to get current vault node URL
const getVaultUrl = () => getVaultPrimaryNode();

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
 * Upload encrypted content to vault
 * Uses vault nodes with on-chain authorization verification
 */
export async function uploadToIPFS(
  encryptedData: Uint8Array,
  userAddress: string,
  groupPostsAddress: string
): Promise<string> {
  console.log('📤 Uploading to vault...');
  try {
    const cid = await vaultService.uploadGroupPost(encryptedData, groupPostsAddress);
    console.log(`✅ Uploaded to vault: ${cid}`);
    return cid;
  } catch (error) {
    console.error('Vault upload error:', error);
    throw error;
  }
}

/**
 * Download content from vault
 */
export async function downloadFromIPFS(cid: string): Promise<Uint8Array> {
  try {
    console.log('📥 Downloading from vault:', cid);
    const data = await vaultService.getBlobWithFallback(cid);
    return data;
  } catch (error) {
    console.error('Vault download error:', error);
    throw error;
  }
}

// LocalStorage key for CID mapping
const CID_MAPPING_KEY = 'ipfs_cid_mapping';

/**
 * Store CID mapping in localStorage
 */
function storeCidMapping(bytes32: string, cid: string) {
  try {
    const mapping = JSON.parse(localStorage.getItem(CID_MAPPING_KEY) || '{}');
    mapping[bytes32] = cid;
    localStorage.setItem(CID_MAPPING_KEY, JSON.stringify(mapping));
  } catch (error) {
    console.error('Error storing CID mapping:', error);
  }
}

/**
 * Get CID from bytes32
 */
function getCidFromBytes32(bytes32: string): string | null {
  try {
    const mapping = JSON.parse(localStorage.getItem(CID_MAPPING_KEY) || '{}');
    return mapping[bytes32] || null;
  } catch (error) {
    console.error('Error getting CID mapping:', error);
    return null;
  }
}

/**
 * Convert CID string to bytes32 for smart contract storage
 */
export function cidToBytes32(cid: string): string {
  // Hash the CID to get bytes32
  const bytes32 = ethers.id(cid);
  
  // Store the mapping for retrieval
  storeCidMapping(bytes32, cid);
  
  return bytes32;
}

/**
 * Convert bytes32 back to CID using localStorage mapping
 */
export function bytes32ToCid(bytes32: string): string {
  // Try to get from localStorage
  const cid = getCidFromBytes32(bytes32);
  
  if (cid) {
    return cid;
  }
  
  // If not found, return the bytes32 as-is (will fail but shows the issue)
  console.warn(`CID not found for bytes32: ${bytes32}`);
  return bytes32;
}

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
  const cid = await uploadToIPFS(encrypted, userAddress, groupPostsAddress);
  
  return cid;
}

/**
 * High-level function: Download and decrypt post content
 */
export async function downloadAndDecryptPost(
  cid: string,
  groupKey: string
): Promise<PostContent> {
  const encrypted = await downloadFromIPFS(cid);
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
  const cid = await uploadToIPFS(encrypted, userAddress, groupPostsAddress);
  
  return cid;
}

/**
 * High-level function: Download and decrypt comment content
 */
export async function downloadAndDecryptComment(
  cid: string,
  groupKey: string
): Promise<CommentContent> {
  const encrypted = await downloadFromIPFS(cid);
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
 * Get IPFS gateway URL for viewing content
 */
export function getIPFSGatewayUrl(cid: string): string {
  return `${getVaultUrl()}/blob/${cid}`;
}

/**
 * Upload token distribution data to vault
 * Stores JSON and CSV data for token airdrops
 */
export async function uploadTokenDistribution(
  tokenAddress: string,
  distributionData: {
    tokenName: string;
    tokenSymbol: string;
    totalSupply: string;
    merkleRoot: string;
    recipients: Array<{ address: string; amount: string; proof: string[] }>;
    ownerPercentage: number;
    bondingCurvePercentage: number;
    timestamp: string;
  },
  userAddress: string
): Promise<{ jsonCid: string; csvCid: string }> {
  try {
    // Create JSON data
    const jsonData = JSON.stringify(distributionData, null, 2);
    const jsonBytes = new TextEncoder().encode(jsonData);
    
    // Create CSV data
    const csvHeader = 'Address,Amount,Proof\n';
    const csvRows = distributionData.recipients.map(r => 
      `${r.address},${r.amount},"${r.proof.join(',')}"`
    ).join('\n');
    const csvData = csvHeader + csvRows;
    const csvBytes = new TextEncoder().encode(csvData);
    
    // Upload JSON to vault
    const jsonCid = await vaultService.uploadTokenDistribution(jsonBytes, tokenAddress);
    
    // Upload CSV to vault
    const csvCid = await vaultService.uploadTokenDistribution(csvBytes, tokenAddress);
    
    console.log('✅ Token distribution uploaded to vault:', {
      tokenAddress,
      jsonCid,
      csvCid
    });
    
    return { jsonCid, csvCid };
  } catch (error) {
    console.error('Token distribution upload error:', error);
    throw error;
  }
}
