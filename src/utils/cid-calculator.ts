/**
 * CID Calculator
 * Calculate ByteCave CID (SHA-256 hash) from file data without uploading
 */

/**
 * Calculate CID from file data
 * ByteCave uses SHA-256 hash as CID
 * @param data File data as Uint8Array
 * @returns CID as hex string (64 characters, no 0x prefix)
 */
export async function calculateCID(data: Uint8Array): Promise<string> {
  // Calculate SHA-256 hash
  // Cast to ArrayBuffer to satisfy TypeScript
  const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}
