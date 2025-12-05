import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IPFSProvider, IPFSCredentials } from '../services/ipfs/userCredentials';

interface SettingsState {
  rpcUrl: string;
  ipfsGateway: string;
  ipfsCredentials: IPFSCredentials | null;
  passkeyProtectionEnabled: boolean;
  setRpcUrl: (url: string) => void;
  setIPFSGateway: (url: string) => void;
  setIPFSCredentials: (credentials: IPFSCredentials | null) => void;
  setPasskeyProtectionEnabled: (enabled: boolean) => void;
  resetToDefaults: () => void;
}

const DEFAULT_RPC_URL = process.env.REACT_APP_RPC_URL || 'http://localhost:8545';
const DEFAULT_IPFS_GATEWAY = process.env.REACT_APP_IPFS_GATEWAY || 'https://3oh.myfilebase.com/ipfs';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      rpcUrl: DEFAULT_RPC_URL,
      ipfsGateway: DEFAULT_IPFS_GATEWAY,
      ipfsCredentials: null,
      passkeyProtectionEnabled: false,
      setRpcUrl: (url: string) => set({ rpcUrl: url }),
      setIPFSGateway: (url: string) => set({ ipfsGateway: url }),
      setIPFSCredentials: (credentials: IPFSCredentials | null) => set({ ipfsCredentials: credentials }),
      setPasskeyProtectionEnabled: (enabled: boolean) => set({ passkeyProtectionEnabled: enabled }),
      resetToDefaults: () => set({ 
        rpcUrl: DEFAULT_RPC_URL,
        ipfsGateway: DEFAULT_IPFS_GATEWAY,
        ipfsCredentials: null,
        passkeyProtectionEnabled: false
      }),
    }),
    {
      name: 'hashd-settings',
    }
  )
);

// Helper to get current IPFS gateway (for use outside React components)
export const getIPFSGateway = (): string => {
  return useSettingsStore.getState().ipfsGateway;
};
