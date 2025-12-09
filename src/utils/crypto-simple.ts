// Secure encryption utilities using AES-GCM + ECDH
import { ethers } from 'ethers';
import { p256 } from '@noble/curves/nist.js';

export interface CryptoKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface EncryptedMessage {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
}

export class SimpleCryptoUtils {
  private static readonly KEY_SIZE = 32; // 256 bits
  private static readonly NONCE_SIZE = 12; // 96 bits for AES-GCM
  
  /**
   * Generate a cryptographically secure key pair using Web Crypto API
   * Uses ECDH with P-256 curve for key exchange
   */
  static async generateKeyPair(): Promise<CryptoKeyPair> {
    // Generate ECDH key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveKey', 'deriveBits']
    );
    
    // Export keys to raw format
    const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    const privateKeyRaw = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    
    return {
      publicKey: new Uint8Array(publicKeyRaw),
      privateKey: new Uint8Array(privateKeyRaw)
    };
  }
  
  /**
   * Derive shared secret using ECDH
   */
  private static async deriveSharedSecret(
    privateKey: Uint8Array,
    publicKey: Uint8Array
  ): Promise<Uint8Array> {
    try {
      console.log('🔐 Deriving shared secret...');
      console.log('Private key length:', privateKey.length, 'bytes');
      console.log('Public key length:', publicKey.length, 'bytes');
      console.log('Public key first byte:', publicKey[0].toString(16));
      
      // Check if private key is raw scalar (32 bytes) or PKCS#8 format (138 bytes)
      if (privateKey.length === 32) {
        // Raw scalar format - use @noble/curves for ECDH
        console.log('Using @noble/curves for ECDH (raw scalar private key)...');
        const sharedSecret = p256.getSharedSecret(privateKey, publicKey);
        console.log('✅ Shared secret derived');
        return new Uint8Array(sharedSecret);
      }
      
      // PKCS#8 format - use Web Crypto API
      console.log('Importing private key (PKCS#8)...');
      const privateKeyCrypto = await crypto.subtle.importKey(
        'pkcs8',
        privateKey as BufferSource,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        false,
        ['deriveKey', 'deriveBits']
      );
      console.log('✅ Private key imported');
      
      // Web Crypto API requires uncompressed keys (65 bytes)
      // Uncompressed keys start with 0x04
      if (publicKey.length !== 65) {
        throw new Error(`Public key must be uncompressed (65 bytes), got ${publicKey.length} bytes. Please regenerate keys.`);
      }
      
      if (publicKey[0] !== 0x04) {
        throw new Error(`Public key must be uncompressed (start with 0x04), got 0x${publicKey[0].toString(16)}. Please regenerate keys.`);
      }
      
      // Import public key for ECDH
      console.log('Importing public key (raw uncompressed)...');
      const publicKeyCrypto = await crypto.subtle.importKey(
        'raw',
        publicKey as BufferSource,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        false,
        []
      );
      console.log('✅ Public key imported');
      
      // Derive shared secret
      const sharedSecret = await crypto.subtle.deriveBits(
        {
          name: 'ECDH',
          public: publicKeyCrypto
        },
        privateKeyCrypto,
        256 // 256 bits
      );
      
      return new Uint8Array(sharedSecret);
    } catch (error) {
      console.error('ECDH derivation error:', error);
      throw new Error('Failed to derive shared secret');
    }
  }
  
  // NOTE: Old encrypt/decrypt functions removed - they used @noble/curves which is not needed
  // The app uses encryptForContract/decryptFromContract which use Web Crypto API's ECDH

  // Contract interaction methods
  static async encryptForContract(
    message: string,
    recipientPublicKey: Uint8Array,
    senderPrivateKey: Uint8Array,
    senderPublicKey: Uint8Array,
    txHash?: string
  ): Promise<{
    encryptedContent: string;
    encryptedMetadata: string;
  }> {
    // Derive shared secret using Web Crypto API
    const sharedSecret = await this.deriveSharedSecret(senderPrivateKey, recipientPublicKey);
    
    // Derive AES key from shared secret
    const sharedSecretKey = await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );
    
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new Uint8Array(0),
        info: new TextEncoder().encode('HASHD-AES-Key')
      },
      sharedSecretKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Generate random nonce
    const nonce = crypto.getRandomValues(new Uint8Array(this.NONCE_SIZE));
    
    // Encrypt message
    const messageBytes = new TextEncoder().encode(message);
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: nonce,
        tagLength: 128
      },
      aesKey,
      messageBytes
    );
    
    const contentData = {
      ciphertext: Array.from(new Uint8Array(ciphertext)),
      nonce: Array.from(nonce)
    };
    
    // Include recipient public key hash in metadata
    const publicKeyHash = this.bytesToHex(recipientPublicKey.slice(0, 16));
    
    const metadata: any = {
      timestamp: Date.now(),
      version: '4.0.0',
      algorithm: 'aes-256-gcm-ecdh',
      compression: 'none',
      recipientKeyHash: publicKeyHash,
      senderPublicKey: this.bytesToHex(senderPublicKey)
    };
    
    if (txHash) {
      metadata.txHash = txHash;
    }
    
    return {
      encryptedContent: '0x' + this.bytesToHex(new TextEncoder().encode(JSON.stringify(contentData))),
      encryptedMetadata: '0x' + this.bytesToHex(new TextEncoder().encode(JSON.stringify(metadata)))
    };
  }

  static async decryptFromContract(
    encryptedContent: string,
    encryptedMetadata: string,
    recipientPrivateKey: Uint8Array
  ): Promise<{ message: string; metadata: any }> {
    try {
      console.log('Decrypting from contract...');
      
      // Remove '0x' prefix and convert from hex
      const contentHex = encryptedContent.startsWith('0x') ? encryptedContent.slice(2) : encryptedContent;
      const metadataHex = encryptedMetadata.startsWith('0x') ? encryptedMetadata.slice(2) : encryptedMetadata;
      
      const contentBytes = this.hexToBytes(contentHex);
      const metadataBytes = this.hexToBytes(metadataHex);
      
      console.log('Content hex length:', contentHex.length);
      console.log('Metadata hex length:', metadataHex.length);
      console.log('Content bytes length:', contentBytes.length);
      console.log('Metadata bytes length:', metadataBytes.length);
      
      const contentJson = new TextDecoder().decode(contentBytes);
      const metadataJson = new TextDecoder().decode(metadataBytes);
      
      console.log('Content JSON string:', contentJson);
      console.log('Metadata JSON string:', metadataJson);
      
      if (!contentJson || contentJson.trim() === '') {
        throw new Error('Content JSON is empty or invalid');
      }
      
      if (!metadataJson || metadataJson.trim() === '') {
        throw new Error('Metadata JSON is empty or invalid');
      }
      
      let contentData, metadata;
      try {
        contentData = JSON.parse(contentJson);
      } catch (error) {
        console.error('Failed to parse content JSON:', contentJson);
        throw new Error(`Content JSON parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      try {
        metadata = JSON.parse(metadataJson);
      } catch (error) {
        console.error('Failed to parse metadata JSON:', metadataJson);
        throw new Error(`Metadata JSON parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      console.log('Metadata version:', metadata.version);
      
      // Extract sender's public key from metadata
      if (!metadata.senderPublicKey) {
        throw new Error('Sender public key not found in metadata');
      }
      const senderPublicKey = this.hexToBytes(metadata.senderPublicKey);
      console.log('Extracted sender public key from metadata');
      
      const ciphertext = new Uint8Array(contentData.ciphertext);
      const nonce = new Uint8Array(contentData.nonce);
      
      console.log('Encrypted ciphertext:', Array.from(ciphertext));
      console.log('Encrypted nonce:', Array.from(nonce));
      
      // Derive shared secret using Web Crypto API
      const sharedSecret = await this.deriveSharedSecret(recipientPrivateKey, senderPublicKey);
      
      // Derive AES key from shared secret
      const sharedSecretKey = await crypto.subtle.importKey(
        'raw',
        sharedSecret,
        { name: 'HKDF' },
        false,
        ['deriveKey']
      );
      
      const aesKey = await crypto.subtle.deriveKey(
        {
          name: 'HKDF',
          hash: 'SHA-256',
          salt: new Uint8Array(0),
          info: new TextEncoder().encode('HASHD-AES-Key')
        },
        sharedSecretKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      
      // Decrypt message
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: nonce,
          tagLength: 128
        },
        aesKey,
        ciphertext
      );
      
      const decryptedMessage = new TextDecoder().decode(decrypted);
      
      return {
        message: decryptedMessage,
        metadata
      };
    } catch (error) {
      console.error('Contract decryption error:', error);
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Utility methods
  static publicKeyToHex(publicKey: Uint8Array): string {
    return '0x' + this.bytesToHex(publicKey);
  }

  static publicKeyFromHex(hex: string): Uint8Array {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    return this.hexToBytes(cleanHex);
  }

  static bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  static hexStringToBytes(hex: string): Uint8Array {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    return this.hexToBytes(cleanHex);
  }

  private static hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * Get public key from private key
   */
  static async getPublicKeyFromPrivate(privateKey: Uint8Array): Promise<Uint8Array> {
    try {
      // Import private key
      const privateKeyCrypto = await crypto.subtle.importKey(
        'pkcs8',
        privateKey as BufferSource,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        ['deriveKey', 'deriveBits']
      );
      
      // Export as JWK to get public key
      const jwk = await crypto.subtle.exportKey('jwk', privateKeyCrypto);
      
      // Import public key from JWK
      const publicKeyCrypto = await crypto.subtle.importKey(
        'jwk',
        {
          kty: jwk.kty,
          crv: jwk.crv,
          x: jwk.x,
          y: jwk.y
        },
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        []
      );
      
      // Export to raw format
      const publicKeyRaw = await crypto.subtle.exportKey('raw', publicKeyCrypto);
      return new Uint8Array(publicKeyRaw);
    } catch (error) {
      console.error('Error deriving public key:', error);
      throw new Error('Failed to derive public key from private key');
    }
  }
  
  // Compression preview (dummy for compatibility)
  static async getCompressionPreview(message: string): Promise<any> {
    return {
      compressed: message,
      originalSize: message.length,
      compressedSize: message.length,
      compressionRatio: 0,
      algorithm: 'none'
    };
  }
}

// Mailbox information
export interface MailboxInfo {
  pin: string;
  name: string;
  publicKeyHash: string;
  publicKey?: string; // Full public key hex for comparison with blockchain accounts
  createdAt: number;
  lastUsed: number;
  isIncomplete?: boolean;
  needsCompletion?: boolean;
}

// Key management with PIN-based mailboxes
export class SimpleKeyManager {
  private static readonly MAILBOXES_KEY = 'hashd_mailboxes';
  private static readonly VERSION_KEY = 'hashd_key_version';
  private static readonly CURRENT_VERSION = 'v1-deterministic';
  
  // Legacy constants (only used for cleanup of old insecure storage)
  private static readonly KEYS_PREFIX = 'hashd_keys_';
  private static readonly CURRENT_MAILBOX_KEY = 'hashd_current_mailbox';
  
  // Check and migrate version
  static checkVersion(): void {
    const storedVersion = localStorage.getItem(this.VERSION_KEY);
    if (storedVersion !== this.CURRENT_VERSION) {
      console.warn('⚠️ Key generation version changed');
      console.warn(`  Old version: ${storedVersion || 'none'}`);
      console.warn(`  New version: ${this.CURRENT_VERSION}`);
      console.warn('  Please recreate your mailboxes with the same PINs');
      
      // Clear old KEY data only (not mailbox metadata)
      // Mailbox metadata (names, hashes) should persist so users can restore
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('hashd_keys_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Set new version
      localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
      
      console.log('✅ Version updated - mailbox metadata preserved');
    }
  }
  
  // In-memory key storage (keys only exist in RAM during session)
  private static sessionKeys = new Map<string, CryptoKeyPair>();
  
  // Get wallet-specific storage keys
  private static getWalletKey(baseKey: string, walletAddress?: string): string {
    if (!walletAddress) {
      // Fallback to non-namespaced key for backward compatibility
      return baseKey;
    }
    return `${baseKey}_${walletAddress.toLowerCase()}`;
  }
  
  // Generate PIN hash for secure storage
  private static getPinHash(pin: string, walletAddress?: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(pin + (walletAddress || '')));
  }
  
  // Save keys for a specific mailbox (identified by PIN)
  // SECURITY: Keys are ONLY stored in memory. PINs are NEVER stored.
  static async saveMailboxKeys(pin: string, keyPair: CryptoKeyPair, name: string = 'Default', walletAddress?: string): Promise<void> {
    const pinHash = this.getPinHash(pin, walletAddress);
    const sessionKey = `${walletAddress}_${pinHash}`;
    
    // Store in session memory ONLY (Map in RAM)
    this.sessionKeys.set(sessionKey, keyPair);
    console.log('🔐 Keys stored in memory only (RAM) - never persisted');
    
    // REMOVED: All localStorage and sessionStorage key storage
    // REMOVED: PIN storage in any form
    // Keys exist ONLY in memory and are wiped on page refresh/close
    
    // Update mailbox metadata list (non-sensitive data only)
    const mailboxes = this.getMailboxList(walletAddress);
    const publicKeyHash = SimpleCryptoUtils.bytesToHex(keyPair.publicKey.slice(0, 16));
    
    // Store only: name, publicKeyHash (for identification), timestamps
    // DO NOT store: PIN, keys, or any sensitive data
    const existingIndex = mailboxes.findIndex(m => m.publicKeyHash === publicKeyHash);
    
    // Preserve existing name if mailbox already exists (don't overwrite custom names)
    const finalName = existingIndex >= 0 ? mailboxes[existingIndex].name : name;
    
    const mailboxInfo: MailboxInfo = {
      pin: '', // NEVER store PIN
      name: finalName,
      publicKeyHash,
      createdAt: existingIndex >= 0 ? mailboxes[existingIndex].createdAt : Date.now(),
      lastUsed: Date.now()
    };
    
    if (existingIndex >= 0) {
      mailboxes[existingIndex] = mailboxInfo;
    } else {
      mailboxes.push(mailboxInfo);
    }
    
    const mailboxesKey = this.getWalletKey(this.MAILBOXES_KEY, walletAddress);
    localStorage.setItem(mailboxesKey, JSON.stringify(mailboxes));
    
    // REMOVED: PIN storage - user must re-enter PIN on each session
    console.log('✅ Mailbox metadata saved (no sensitive data persisted)');
  }
  
  // Load keys for a specific mailbox
  // SECURITY: Keys only exist in memory. If not found, user must unlock again.
  static async loadMailboxKeys(pin: string, walletAddress?: string): Promise<CryptoKeyPair | null> {
    const pinHash = this.getPinHash(pin, walletAddress);
    const sessionKey = `${walletAddress}_${pinHash}`;
    
    // Check session memory ONLY (no persistent storage)
    if (this.sessionKeys.has(sessionKey)) {
      console.log('🔐 Keys loaded from session memory (RAM)');
      return this.sessionKeys.get(sessionKey)!;
    }
    
    // REMOVED: All localStorage and sessionStorage key loading
    // If keys are not in memory, user must unlock mailbox again with PIN
    
    console.log('🔒 No active session - user must unlock mailbox with PIN');
    return null;
  }
  
  // Load current mailbox keys
  // SECURITY: No current PIN is stored, so this always returns null
  // Use SecureMailboxManager.unlockMailbox() instead
  static async loadKeyPair(walletAddress?: string): Promise<CryptoKeyPair | null> {
    console.log('⚠️ loadKeyPair() deprecated - no PIN stored. Use SecureMailboxManager.unlockMailbox()');
    return null;
  }
  
  // Get list of all mailboxes
  static getMailboxList(walletAddress?: string): MailboxInfo[] {
    const mailboxesKey = this.getWalletKey(this.MAILBOXES_KEY, walletAddress);
    const mailboxesJson = localStorage.getItem(mailboxesKey);
    if (!mailboxesJson) return [];
    
    try {
      const mailboxes = JSON.parse(mailboxesJson);
      return mailboxes;
    } catch (error) {
      console.error('Failed to parse mailboxes:', error);
      return [];
    }
  }
  
  /**
   * Save mailboxes to localStorage (replaces entire list)
   * Safety: Will not save empty array if mailboxes already exist (prevents accidental wipe)
   */
  static saveMailboxList(mailboxes: MailboxInfo[], walletAddress: string, force = false): boolean {
    if (!walletAddress) {
      console.warn('⚠️ Cannot save mailboxes without wallet address');
      return false;
    }
    
    const mailboxesKey = this.getWalletKey(this.MAILBOXES_KEY, walletAddress);
    
    // Safety: Don't overwrite existing mailboxes with empty array unless forced
    if (mailboxes.length === 0 && !force) {
      const existing = localStorage.getItem(mailboxesKey);
      if (existing) {
        console.warn('⚠️ Refusing to overwrite existing mailboxes with empty array');
        return false;
      }
    }
    
    localStorage.setItem(mailboxesKey, JSON.stringify(mailboxes));
    return true;
  }
  
  /**
   * Update a specific mailbox by publicKeyHash
   */
  static updateMailbox(
    walletAddress: string, 
    publicKeyHash: string, 
    updates: Partial<Omit<MailboxInfo, 'publicKeyHash'>>
  ): boolean {
    if (!walletAddress) return false;
    
    const mailboxes = this.getMailboxList(walletAddress);
    const index = mailboxes.findIndex(m => m.publicKeyHash === publicKeyHash);
    
    if (index === -1) {
      console.warn(`⚠️ Mailbox not found: ${publicKeyHash}`);
      return false;
    }
    
    mailboxes[index] = { ...mailboxes[index], ...updates };
    return this.saveMailboxList(mailboxes, walletAddress, true);
  }
  
  /**
   * Rename a mailbox
   */
  static renameMailbox(walletAddress: string, publicKeyHash: string, newName: string): boolean {
    return this.updateMailbox(walletAddress, publicKeyHash, { name: newName });
  }
  
  /**
   * Delete a specific mailbox by publicKeyHash
   */
  static deleteMailboxByHash(publicKeyHash: string, walletAddress: string): boolean {
    if (!walletAddress) return false;
    
    const mailboxes = this.getMailboxList(walletAddress);
    const filtered = mailboxes.filter(m => m.publicKeyHash !== publicKeyHash);
    
    if (filtered.length === mailboxes.length) {
      console.warn(`⚠️ Mailbox not found: ${publicKeyHash}`);
      return false;
    }
    
    return this.saveMailboxList(filtered, walletAddress, true);
  }
  
  /**
   * Clear all mailboxes for a wallet (use with caution)
   */
  static clearMailboxes(walletAddress: string): void {
    if (!walletAddress) return;
    const mailboxesKey = this.getWalletKey(this.MAILBOXES_KEY, walletAddress);
    localStorage.removeItem(mailboxesKey);
  }
  
  // Get current mailbox PIN
  // SECURITY: PINs are NEVER stored. This always returns null.
  static getCurrentMailboxPin(walletAddress?: string): string | null {
    console.log('⚠️ getCurrentMailboxPin() deprecated - PINs are never stored for security');
    return null;
  }
  
  // Switch to a different mailbox
  // SECURITY: PINs are never stored. Use SecureMailboxManager.switchMailbox() instead.
  static switchMailbox(pin: string, walletAddress?: string): boolean {
    const mailboxes = this.getMailboxList(walletAddress);
    
    // Update last used timestamp only (no PIN storage)
    const pinHash = this.getPinHash(pin, walletAddress);
    const sessionKey = `${walletAddress}_${pinHash}`;
    const keyPair = this.sessionKeys.get(sessionKey);
    
    if (!keyPair) {
      console.log('⚠️ No active session for this PIN');
      return false;
    }
    
    const publicKeyHash = SimpleCryptoUtils.bytesToHex(keyPair.publicKey.slice(0, 16));
    const mailbox = mailboxes.find(m => m.publicKeyHash === publicKeyHash);
    
    if (!mailbox) return false;
    
    mailbox.lastUsed = Date.now();
    const mailboxesKey = this.getWalletKey(this.MAILBOXES_KEY, walletAddress);
    localStorage.setItem(mailboxesKey, JSON.stringify(mailboxes));
    
    console.log('✅ Mailbox switched (no PIN stored)');
    return true;
  }
  
  // Delete a mailbox
  static deleteMailbox(publicKeyHash: string, walletAddress?: string): void {
    // Clear from memory
    const mailboxes = this.getMailboxList(walletAddress);
    const mailbox = mailboxes.find(m => m.publicKeyHash === publicKeyHash);
    
    if (mailbox) {
      // Remove from session memory if present
      this.sessionKeys.forEach((value, key) => {
        const keyPublicHash = SimpleCryptoUtils.bytesToHex(value.publicKey.slice(0, 16));
        if (keyPublicHash === publicKeyHash) {
          this.sessionKeys.delete(key);
          console.log('🗑️ Mailbox keys removed from memory');
        }
      });
    }
    
    // Remove from mailbox list
    const filtered = mailboxes.filter(m => m.publicKeyHash !== publicKeyHash);
    const mailboxesKey = this.getWalletKey(this.MAILBOXES_KEY, walletAddress);
    localStorage.setItem(mailboxesKey, JSON.stringify(filtered));
    
    console.log('✅ Mailbox deleted (metadata removed)');
  }
  
  /**
   * Clear session keys (memory only)
   * Does NOT clear mailbox metadata - that should persist for restoration
   */
  static clearKeys(walletAddress?: string): void {
    // Clear session memory (RAM)
    this.sessionKeys.clear();
    console.log('🗑️ Cleared session memory');
    
    // Clear legacy key storage from localStorage (hashd_keys_*)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.KEYS_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear current mailbox pointer (but NOT mailbox list)
    if (walletAddress) {
      const currentKey = this.getWalletKey(this.CURRENT_MAILBOX_KEY, walletAddress);
      localStorage.removeItem(currentKey);
    }
    
    // NOTE: Mailbox metadata (hashd_mailboxes_*) is NOT cleared
    // This allows users to restore their mailboxes by entering their PIN
    console.log('🗑️ Cleared keys (mailbox metadata preserved)');
  }
  
  /**
   * Generate deterministic keys from wallet signature + PIN
   * Uses wallet signature as entropy to derive ECDH key pair
   */
  static async generateDeterministicKeys(
    signer: any,
    userAddress: string,
    pin: string
  ): Promise<CryptoKeyPair> {
    // Create deterministic message with PIN
    const keyDerivationMessage = `HASHD Mailbox Creation v1\nAddress: ${userAddress}\nPIN: ${pin}\nAlgorithm: AES-256-GCM-ECDH`;
    console.log('🔐 Signing message for deterministic key derivation');
    
    const signature = await signer.signMessage(keyDerivationMessage);
    console.log('✅ Wallet signature received');
    
    // Derive keys from signature using HKDF
    const signatureBytes = ethers.getBytes(signature);
    
    // Use signature as key material for HKDF
    const hkdfKey = await crypto.subtle.importKey(
      'raw',
      signatureBytes as BufferSource,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );
    
    // Derive AES key first (as intermediate step)
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new TextEncoder().encode('hashd-v4'),
        info: new TextEncoder().encode(userAddress + pin)
      },
      hkdfKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt']
    );
    
    // Use the derived key bytes as the ECDH private key seed
    const seedBytes = await crypto.subtle.exportKey('raw', derivedKey);
    
    // Use the first 32 bytes as the P-256 private key scalar
    const privateKeyScalar = new Uint8Array(seedBytes).slice(0, 32);
    
    // Generate deterministic public key from private key using @noble/curves
    // This ensures the same PIN always generates the same key pair
    const publicKeyUncompressed = p256.getPublicKey(privateKeyScalar, false); // false = uncompressed
    
    // For Web Crypto API compatibility, we need to convert the private key to PKCS#8 format
    // We'll store the raw 32-byte scalar and convert it when needed
    const privateKey = privateKeyScalar;
    const publicKey = publicKeyUncompressed;
    
    console.log('✅ Generated deterministic ECDH key pair');
    console.log('Private key length:', privateKey.byteLength, 'bytes (raw scalar)');
    console.log('Public key length:', publicKey.byteLength, 'bytes (uncompressed)');
    console.log('Public key starts with:', publicKey[0] === 0x04 ? '0x04 (uncompressed)' : `0x${publicKey[0].toString(16)}`);
    
    return {
      publicKey,
      privateKey
    };
  }
}
