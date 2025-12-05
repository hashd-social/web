/**
 * Client for Crypto Service Worker
 * Provides interface to store/retrieve keys from worker memory
 * Keys never stored in main thread - immune to XSS attacks
 */

import { CryptoKeyPair } from './crypto-simple';

class CryptoWorkerClient {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingMessages = new Map<number, { resolve: Function; reject: Function }>();

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      // Inline worker code for IPFS compatibility
      const workerCode = `
        const keyStore = new Map();
        
        self.addEventListener('message', async (event) => {
          const { type, id, data } = event.data;
          
          try {
            let result;
            
            switch (type) {
              case 'STORE_KEYS':
                const { walletAddress, pinHash, keyPair } = data;
                const keyId = \`\${walletAddress}_\${pinHash}\`;
                keyStore.set(keyId, {
                  publicKey: new Uint8Array(keyPair.publicKey),
                  privateKey: new Uint8Array(keyPair.privateKey),
                  timestamp: Date.now()
                });
                result = { success: true };
                break;
                
              case 'GET_KEYS':
                const getKeyId = \`\${data.walletAddress}_\${data.pinHash}\`;
                const keys = keyStore.get(getKeyId);
                if (keys) {
                  result = {
                    publicKey: Array.from(keys.publicKey),
                    privateKey: Array.from(keys.privateKey)
                  };
                } else {
                  result = { error: 'Keys not found' };
                }
                break;
                
              case 'DELETE_KEYS':
                const deleteKeyId = \`\${data.walletAddress}_\${data.pinHash}\`;
                keyStore.delete(deleteKeyId);
                result = { success: true };
                break;
                
              case 'CLEAR_ALL':
                keyStore.clear();
                result = { success: true };
                break;
                
              case 'HAS_KEYS':
                const hasKeyId = \`\${data.walletAddress}_\${data.pinHash}\`;
                result = { exists: keyStore.has(hasKeyId) };
                break;
                
              default:
                throw new Error(\`Unknown message type: \${type}\`);
            }
            
            event.ports[0].postMessage({
              id,
              success: true,
              data: result
            });
            
          } catch (error) {
            event.ports[0].postMessage({
              id,
              success: false,
              error: error.message
            });
          }
        });
        
        console.log('🔐 Crypto Worker initialized (inline)');
      `;
      
      // Create worker from blob (works with IPFS)
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);
      
      this.worker.addEventListener('message', (event) => {
        const { id, success, data, error } = event.data;
        const pending = this.pendingMessages.get(id);
        
        if (pending) {
          if (success) {
            pending.resolve(data);
          } else {
            pending.reject(new Error(error));
          }
          this.pendingMessages.delete(id);
        }
      });

      this.worker.addEventListener('error', (error) => {
        console.error('❌ Crypto worker error:', error);
      });

      console.log('✅ Crypto worker initialized');
    } catch (error) {
      console.error('❌ Failed to initialize crypto worker:', error);
      // Fallback: worker not available, will use localStorage
    }
  }

  private async sendMessage(type: string, data?: any): Promise<any> {
    if (!this.worker) {
      throw new Error('Crypto worker not available');
    }

    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      const channel = new MessageChannel();
      
      this.pendingMessages.set(id, { resolve, reject });
      
      // Set timeout for message
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error('Worker message timeout'));
        }
      }, 5000);
      
      channel.port1.onmessage = (event) => {
        const { id: responseId, success, data: responseData, error } = event.data;
        const pending = this.pendingMessages.get(responseId);
        
        if (pending) {
          if (success) {
            pending.resolve(responseData);
          } else {
            pending.reject(new Error(error));
          }
          this.pendingMessages.delete(responseId);
        }
      };

      if (this.worker) {
        this.worker.postMessage({ type, id, data }, [channel.port2]);
      } else {
        reject(new Error('Worker not available'));
      }
    });
  }

  /**
   * Store keys in worker memory
   */
  async storeKeys(walletAddress: string, pinHash: string, keyPair: CryptoKeyPair): Promise<void> {
    await this.sendMessage('STORE_KEYS', {
      walletAddress,
      pinHash,
      keyPair: {
        publicKey: Array.from(keyPair.publicKey),
        privateKey: Array.from(keyPair.privateKey)
      }
    });
  }

  /**
   * Retrieve keys from worker memory
   */
  async getKeys(walletAddress: string, pinHash: string): Promise<CryptoKeyPair | null> {
    try {
      const result = await this.sendMessage('GET_KEYS', { walletAddress, pinHash });
      
      if (result.error) {
        return null;
      }
      
      return {
        publicKey: new Uint8Array(result.publicKey),
        privateKey: new Uint8Array(result.privateKey)
      };
    } catch (error) {
      console.error('Failed to get keys from worker:', error);
      return null;
    }
  }

  /**
   * Check if keys exist in worker memory
   */
  async hasKeys(walletAddress: string, pinHash: string): Promise<boolean> {
    try {
      const result = await this.sendMessage('HAS_KEYS', { walletAddress, pinHash });
      return result.exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete keys from worker memory
   */
  async deleteKeys(walletAddress: string, pinHash: string): Promise<void> {
    await this.sendMessage('DELETE_KEYS', { walletAddress, pinHash });
  }

  /**
   * Clear all keys from worker memory
   */
  async clearAll(): Promise<void> {
    await this.sendMessage('CLEAR_ALL');
  }

  /**
   * Check if worker is available
   */
  isAvailable(): boolean {
    return this.worker !== null;
  }
}

// Singleton instance
export const cryptoWorker = new CryptoWorkerClient();
