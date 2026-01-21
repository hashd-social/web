/**
 * useByteCaveClient Hook
 * 
 * Provides a singleton ByteCave client instance for the entire app.
 * Handles initialization, connection state, and peer discovery.
 */

import { useState, useEffect, useRef } from 'react';
import { ByteCaveClient } from '@gethashd/bytecave-browser';

interface UseByteCaveClientReturn {
  client: ByteCaveClient | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  peerCount: number;
}

let globalClient: ByteCaveClient | null = null;
let initializationPromise: Promise<void> | null = null;

export const useByteCaveClient = (): UseByteCaveClientReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peerCount, setPeerCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const initializeClient = async () => {
      // If already initialized or initializing, wait for it
      if (globalClient) {
        setIsConnected(true);
        setIsConnecting(false);
        updatePeerCount();
        return;
      }

      if (initializationPromise) {
        await initializationPromise;
        if (mountedRef.current) {
          setIsConnected(true);
          setIsConnecting(false);
          updatePeerCount();
        }
        return;
      }

      // Start initialization
      if (mountedRef.current) {
        setIsConnecting(true);
        setError(null);
      }

      initializationPromise = (async () => {
        try {
          const relayPeersEnv = process.env.REACT_APP_RELAY_PEERS || '';
          const contractAddress = process.env.REACT_APP_VAULT_REGISTRY || '';
          const rpcUrl = process.env.REACT_APP_RPC_URL || 'http://localhost:8545';

          const relayPeers = relayPeersEnv 
            ? relayPeersEnv.split(',').map(p => p.trim()).filter(p => p)
            : [];

          if (relayPeers.length === 0) {
            throw new Error('REACT_APP_RELAY_PEERS not configured');
          }

          console.log('[ByteCaveClient] Initializing with relay peers:', relayPeers);

          globalClient = new ByteCaveClient({
            relayPeers,
            contractAddress: contractAddress || undefined,
            rpcUrl: contractAddress ? rpcUrl : undefined,
            maxPeers: 10,
            connectionTimeout: 30000
          });

          await globalClient.start();

          console.log('[ByteCaveClient] Client started successfully');

          if (mountedRef.current) {
            setIsConnected(true);
            setIsConnecting(false);
            updatePeerCount();
          }
        } catch (err: any) {
          console.error('[ByteCaveClient] Initialization failed:', err);
          if (mountedRef.current) {
            setError(err.message || 'Failed to initialize ByteCave client');
            setIsConnecting(false);
          }
          globalClient = null;
          initializationPromise = null;
        }
      })();

      await initializationPromise;
    };

    const updatePeerCount = async () => {
      if (globalClient && mountedRef.current) {
        try {
          const peers = await globalClient.getPeers();
          if (mountedRef.current) {
            setPeerCount(peers.length);
          }
        } catch (err) {
          console.error('[ByteCaveClient] Failed to get peer count:', err);
        }
      }
    };

    initializeClient();

    // Update peer count periodically
    const peerCountInterval = setInterval(updatePeerCount, 10000);

    return () => {
      mountedRef.current = false;
      clearInterval(peerCountInterval);
    };
  }, []);

  return {
    client: globalClient,
    isConnected,
    isConnecting,
    error,
    peerCount
  };
};
