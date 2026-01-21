import { ethers } from 'ethers';

/**
 * Convert bytes32 CID from contract storage to CID string
 * @param bytes32CID The bytes32 CID from contract
 * @returns CID string (e.g., "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi")
 */
export function bytes32ToCID(bytes32CID: string): string {
  if (!bytes32CID || bytes32CID === ethers.ZeroHash) {
    return '';
  }
  
  try {
    // Decode bytes32 to string
    return ethers.decodeBytes32String(bytes32CID);
  } catch (error) {
    console.error('Failed to decode bytes32 CID:', error);
    return '';
  }
}

/**
 * Convert bytes32 CID to hashd:// URL
 * @param bytes32CID The bytes32 CID from contract
 * @returns hashd:// URL (e.g., "hashd://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi")
 */
export function bytes32ToHashdUrl(bytes32CID: string): string {
  const cid = bytes32ToCID(bytes32CID);
  return cid ? `hashd://${cid}` : '';
}

/**
 * Convert CID string to bytes32 for contract storage
 * @param cid The CID string
 * @returns bytes32 representation
 */
export function cidToBytes32(cid: string): string {
  if (!cid) {
    return ethers.ZeroHash;
  }
  
  try {
    return ethers.encodeBytes32String(cid);
  } catch (error) {
    console.error('Failed to encode CID to bytes32:', error);
    return ethers.ZeroHash;
  }
}
