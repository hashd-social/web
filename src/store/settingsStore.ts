import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type VaultFallbackStrategy = 'auto' | 'primary' | 'all';

interface SettingsState {
  rpcUrl: string;
  vaultPrimaryNode: string;
  vaultFallbackStrategy: VaultFallbackStrategy;
  passkeyProtectionEnabled: boolean;
  setRpcUrl: (url: string) => void;
  setVaultPrimaryNode: (url: string) => void;
  setVaultFallbackStrategy: (strategy: VaultFallbackStrategy) => void;
  setPasskeyProtectionEnabled: (enabled: boolean) => void;
  resetToDefaults: () => void;
}

const DEFAULT_RPC_URL = process.env.REACT_APP_RPC_URL || 'http://localhost:8545';
const DEFAULT_VAULT_NODE = process.env.REACT_APP_VAULT_API_URL || 'http://localhost:3004';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      rpcUrl: DEFAULT_RPC_URL,
      vaultPrimaryNode: DEFAULT_VAULT_NODE,
      vaultFallbackStrategy: 'auto' as VaultFallbackStrategy,
      passkeyProtectionEnabled: false,
      setRpcUrl: (url: string) => set({ rpcUrl: url }),
      setVaultPrimaryNode: (url: string) => set({ vaultPrimaryNode: url }),
      setVaultFallbackStrategy: (strategy: VaultFallbackStrategy) => set({ vaultFallbackStrategy: strategy }),
      setPasskeyProtectionEnabled: (enabled: boolean) => set({ passkeyProtectionEnabled: enabled }),
      resetToDefaults: () => set({ 
        rpcUrl: DEFAULT_RPC_URL,
        vaultPrimaryNode: DEFAULT_VAULT_NODE,
        vaultFallbackStrategy: 'auto' as VaultFallbackStrategy,
        passkeyProtectionEnabled: false
      }),
    }),
    {
      name: 'hashd-settings',
    }
  )
);

// Helper to get current vault node (for use outside React components)
export const getVaultPrimaryNode = (): string => {
  return useSettingsStore.getState().vaultPrimaryNode;
};

export const getVaultFallbackStrategy = (): VaultFallbackStrategy => {
  return useSettingsStore.getState().vaultFallbackStrategy;
};
