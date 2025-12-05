/**
 * IPFS Upload Service
 * Supports multiple upload strategies:
 * 1. User's own Pinata credentials (BYOK)
 * 2. Relayer fallback (uses server-side credentials)
 */

export type IPFSProvider = 'pinata' | 'none';

export interface IPFSCredentials {
  provider: IPFSProvider;
  apiKey: string;
}

export interface UploadResult {
  cid: string;
  method: 'user-ipfs' | 'relayer';
}

export class IPFSUploadService {
  private relayerUrl: string;

  constructor(relayerUrl: string = 'http://localhost:3001') {
    this.relayerUrl = relayerUrl;
  }

  /**
   * Upload encrypted data to IPFS
   * Tries user credentials first, falls back to relayer
   */
  async upload(
    encryptedData: Uint8Array,
    userCredentials?: IPFSCredentials
  ): Promise<UploadResult> {
    
    console.log('📤 IPFSUploadService.upload called with credentials:', userCredentials);
    
    // Try user's own IPFS credentials first
    if (userCredentials && userCredentials.provider !== 'none') {
      try {
        console.log(`📤 Uploading with user ${userCredentials.provider} credentials...`);
        const cid = await this.uploadWithUserCredentials(encryptedData, userCredentials);
        return { cid, method: 'user-ipfs' };
      } catch (error) {
        console.warn(`User ${userCredentials.provider} upload failed:`, error);
        console.log('📤 Falling back to relayer...');
      }
    } else {
      console.log('📤 No user credentials, using relayer');
    }

    // Fallback to relayer
    try {
      const cid = await this.uploadViaRelayer(encryptedData);
      return { cid, method: 'relayer' };
    } catch (error) {
      console.error('All upload methods failed:', error);
      throw new Error('Failed to upload to IPFS. Please check your connection and try again.');
    }
  }

  /**
   * Upload using user's Pinata credentials
   */
  private async uploadToPinata(
    data: Uint8Array,
    apiKey: string
  ): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([data as any], { type: 'application/octet-stream' });
    formData.append('file', blob, 'encrypted.bin');

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinata upload failed: ${error}`);
    }

    const result = await response.json();
    console.log('✅ Uploaded to Pinata:', result.IpfsHash);
    return result.IpfsHash;
  }


  /**
   * Upload using user's own credentials
   */
  private async uploadWithUserCredentials(
    data: Uint8Array,
    credentials: IPFSCredentials
  ): Promise<string> {
    
    if (credentials.provider === 'pinata') {
      return await this.uploadToPinata(data, credentials.apiKey);
    }

    throw new Error(`Unsupported provider: ${credentials.provider}`);
  }

  /**
   * Upload via relayer (fallback method)
   */
  private async uploadViaRelayer(data: Uint8Array): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([data as any], { type: 'application/octet-stream' });
    formData.append('file', blob, 'encrypted.bin');

    const response = await fetch(`${this.relayerUrl}/api/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Relayer upload failed: ${error}`);
    }

    const result = await response.json();
    console.log('✅ Uploaded via relayer:', result.cid);
    return result.cid;
  }

  /**
   * Download from IPFS (works with any CID regardless of upload method)
   */
  async download(cid: string): Promise<Uint8Array> {
    // Try multiple IPFS gateways for reliability
    const gateways = [
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `${this.relayerUrl}/api/ipfs/${cid}` // Relayer gateway
    ];

    for (const gateway of gateways) {
      try {
        const response = await fetch(gateway);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          return new Uint8Array(arrayBuffer);
        }
      } catch (error) {
        console.warn(`Failed to download from ${gateway}:`, error);
      }
    }

    throw new Error(`Failed to download from IPFS: ${cid}`);
  }

  /**
   * Test user credentials
   */
  async testCredentials(credentials: IPFSCredentials): Promise<boolean> {
    try {
      const testData = new Uint8Array([1, 2, 3, 4, 5]); // Small test file
      await this.uploadWithUserCredentials(testData, credentials);
      return true;
    } catch (error) {
      console.error('Credentials test failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const ipfsUploadService = new IPFSUploadService();
