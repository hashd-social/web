import { ethers } from 'ethers';
import { getIPFSGateway } from '../../store/settingsStore';

/**
 * IPFS Service for Filebase
 * Handles encryption, upload, download, and decryption of group post content
 */

// Relayer backend for IPFS uploads (uses Filebase S3)
const RELAYER_URL = process.env.REACT_APP_RELAYER_URL || 'http://localhost:3001';
const DEFAULT_IPFS_GATEWAY = process.env.REACT_APP_IPFS_GATEWAY || 'https://3oh.myfilebase.com/ipfs';

// Helper to get current gateway (from settings or default)
const getGateway = () => getIPFSGateway() || DEFAULT_IPFS_GATEWAY;

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
 * Upload encrypted content to IPFS
 * Uses user's Pinata credentials if available, otherwise falls back to relayer
 */
export async function uploadToIPFS(
  encryptedData: Uint8Array,
  userAddress: string,
  groupPostsAddress: string
): Promise<string> {
  // Check for user Pinata credentials
  const { useSettingsStore } = await import('../../store/settingsStore');
  const ipfsCredentials = useSettingsStore.getState().ipfsCredentials;
  console.log('🔍 IPFS Credentials from store:', ipfsCredentials);
  
  // If user has Pinata configured, try that first
  if (ipfsCredentials && ipfsCredentials.provider === 'pinata') {
    try {
      console.log('📤 Uploading with user Pinata credentials...');
      const { ipfsUploadService } = await import('./userCredentials');
      const result = await ipfsUploadService.upload(encryptedData, ipfsCredentials);
      console.log(`✅ Uploaded via Pinata:`, result.cid);
      return result.cid;
    } catch (pinataError) {
      console.warn('Pinata upload failed, falling back to relayer:', pinataError);
    }
  }
  
  // Use relayer (either as fallback or primary method)
  console.log('📤 Uploading via relayer...');
  try {
    
    // Compute content hash
    const contentHash = ethers.keccak256(encryptedData);
    
    // Get signer to sign message
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    
    // Create signature payload
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(7);
    const message = `Upload to ${groupPostsAddress}\nHash: ${contentHash}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
    const signature = await signer.signMessage(message);
    
    // Create FormData with the encrypted content
    const formData = new FormData();
    const arrayBuffer = encryptedData.buffer.slice(encryptedData.byteOffset, encryptedData.byteOffset + encryptedData.byteLength) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
    formData.append('file', blob, 'encrypted-content');
    formData.append('userAddress', userAddress);
    formData.append('groupPostsAddress', groupPostsAddress);
    formData.append('signature', signature);
    formData.append('timestamp', timestamp.toString());
    formData.append('nonce', nonce);
    formData.append('contentHash', contentHash);
    
    // Upload to relayer
    const response = await fetch(`${RELAYER_URL}/api/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`IPFS upload failed: ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    
    // Return CID from relayer
    return result.cid;
  } catch (error) {
    console.error('Relayer upload error:', error);
    throw error;
  }
}

/**
 * Download content from IPFS via Filebase
 */
export async function downloadFromIPFS(cid: string): Promise<Uint8Array> {
  try {
    const url = `${getGateway()}/${cid}`;
    console.log('📥 Downloading from IPFS:', url);
    
    // Use your Filebase gateway (faster and more reliable)
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`IPFS download failed: ${response.statusText} - ${errorText}`);
    }
    
    // Get binary data directly from response
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error('IPFS download error:', error);
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
  return `${getGateway()}/${cid}`;
}

/**
 * Upload token distribution data to IPFS
 * Stores CSV and merkle data in a 'tokens/{tokenAddress}' folder
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
    // Get signer to sign message
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    
    // Create JSON file
    const jsonData = JSON.stringify(distributionData, null, 2);
    const jsonBlob = new Blob([jsonData], { type: 'application/json' });
    
    // Create CSV file
    const csvHeader = 'Address,Amount,Proof\n';
    const csvRows = distributionData.recipients.map(r => 
      `${r.address},${r.amount},"${r.proof.join(',')}"`
    ).join('\n');
    const csvData = csvHeader + csvRows;
    const csvBlob = new Blob([csvData], { type: 'text/csv' });
    
    // Upload JSON - use same message format as posts
    const jsonTimestamp = Date.now();
    const jsonNonce = Math.random().toString(36).substring(7);
    const jsonHash = ethers.keccak256(new Uint8Array(await jsonBlob.arrayBuffer()));
    const jsonMessage = `Upload to ${tokenAddress}\nHash: ${jsonHash}\nTimestamp: ${jsonTimestamp}\nNonce: ${jsonNonce}`;
    const jsonSignature = await signer.signMessage(jsonMessage);
    
    const jsonFormData = new FormData();
    jsonFormData.append('file', jsonBlob, `${tokenAddress}_distribution.json`);
    jsonFormData.append('userAddress', userAddress);
    jsonFormData.append('groupPostsAddress', tokenAddress); // Use token address as identifier
    jsonFormData.append('signature', jsonSignature);
    jsonFormData.append('timestamp', jsonTimestamp.toString());
    jsonFormData.append('nonce', jsonNonce);
    jsonFormData.append('contentHash', jsonHash);
    jsonFormData.append('folder', `tokens/${tokenAddress.toLowerCase()}`);
    
    const jsonResponse = await fetch(`${RELAYER_URL}/api/upload`, {
      method: 'POST',
      body: jsonFormData
    });
    
    if (!jsonResponse.ok) {
      const errorText = await jsonResponse.text();
      throw new Error(`JSON upload failed: ${jsonResponse.statusText} - ${errorText}`);
    }
    
    const jsonResult = await jsonResponse.json();
    
    // Upload CSV - use same message format as posts
    const csvTimestamp = Date.now();
    const csvNonce = Math.random().toString(36).substring(7);
    const csvHash = ethers.keccak256(new Uint8Array(await csvBlob.arrayBuffer()));
    const csvMessage = `Upload to ${tokenAddress}\nHash: ${csvHash}\nTimestamp: ${csvTimestamp}\nNonce: ${csvNonce}`;
    const csvSignature = await signer.signMessage(csvMessage);
    
    const csvFormData = new FormData();
    csvFormData.append('file', csvBlob, `${tokenAddress}_recipients.csv`);
    csvFormData.append('userAddress', userAddress);
    csvFormData.append('groupPostsAddress', tokenAddress);
    csvFormData.append('signature', csvSignature);
    csvFormData.append('timestamp', csvTimestamp.toString());
    csvFormData.append('nonce', csvNonce);
    csvFormData.append('contentHash', csvHash);
    csvFormData.append('folder', `tokens/${tokenAddress.toLowerCase()}`);
    
    const csvResponse = await fetch(`${RELAYER_URL}/api/upload`, {
      method: 'POST',
      body: csvFormData
    });
    
    if (!csvResponse.ok) {
      const errorText = await csvResponse.text();
      throw new Error(`CSV upload failed: ${csvResponse.statusText} - ${errorText}`);
    }
    
    const csvResult = await csvResponse.json();
    
    console.log('✅ Token distribution uploaded to IPFS:', {
      tokenAddress,
      jsonCid: jsonResult.cid,
      csvCid: csvResult.cid
    });
    
    return {
      jsonCid: jsonResult.cid,
      csvCid: csvResult.cid
    };
  } catch (error) {
    console.error('Token distribution upload error:', error);
    throw error;
  }
}
