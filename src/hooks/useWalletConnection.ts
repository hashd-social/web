import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { contractService } from '../utils/contracts';
import { CryptoKeyPair } from '../utils/crypto-simple';

interface WalletState {
  isConnected: boolean;
  userAddress: string;
  keyPair: CryptoKeyPair | null;
  isKeyRegistered: boolean;
  loading: boolean;
  error: string | null;
  warning: string | null;
}

export const useWalletConnection = () => {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    userAddress: '',
    keyPair: null,
    isKeyRegistered: false,
    loading: false,
    error: null,
    warning: null,
  });

  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  const connectWallet = useCallback(async (): Promise<{ success: boolean; address?: string }> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const connected = await contractService.connect();
      if (!connected) {
        throw new Error('Failed to connect to wallet');
      }

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const walletSigner = await provider.getSigner();
      const address = await walletSigner.getAddress();

      setSigner(walletSigner);

      setState((prev) => ({
        ...prev,
        isConnected: true,
        userAddress: address,
        loading: false,
      }));

      return { success: true, address };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
      return { success: false };
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearWarning = useCallback(() => {
    setState((prev) => ({ ...prev, warning: null }));
  }, []);

  const setKeyPair = useCallback((keyPair: CryptoKeyPair | null) => {
    setState((prev) => ({ ...prev, keyPair }));
  }, []);

  const setIsKeyRegistered = useCallback((isRegistered: boolean) => {
    setState((prev) => ({ ...prev, isKeyRegistered: isRegistered }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setWarning = useCallback((warning: string | null) => {
    setState((prev) => ({ ...prev, warning }));
  }, []);

  return {
    state,
    signer,
    connectWallet,
    clearError,
    clearWarning,
    setKeyPair,
    setIsKeyRegistered,
    setLoading,
    setError,
    setWarning,
  };
};
