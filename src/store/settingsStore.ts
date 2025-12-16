import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type VaultFallbackStrategy = 'auto' | 'primary' | 'all';
export type ContentType = 'messages' | 'posts' | 'media' | 'listings';

export interface ContentTypeNodePreferences {
  messages: string | null;
  posts: string | null;
  media: string | null;
  listings: string | null;
}

interface SettingsState {
  rpcUrl: string;
  vaultPrimaryNode: string;
  vaultFallbackStrategy: VaultFallbackStrategy;
  passkeyProtectionEnabled: boolean;
  contentTypeNodes: ContentTypeNodePreferences;
  contentTypeOverrides: Partial<ContentTypeNodePreferences>;
  setRpcUrl: (url: string) => void;
  setVaultPrimaryNode: (url: string) => void;
  setVaultFallbackStrategy: (strategy: VaultFallbackStrategy) => void;
  setPasskeyProtectionEnabled: (enabled: boolean) => void;
  setContentTypeNodes: (nodes: ContentTypeNodePreferences) => void;
  setContentTypeOverride: (contentType: ContentType, nodeUrl: string | null) => void;
  clearContentTypeOverride: (contentType: ContentType) => void;
  resetToDefaults: () => void;
}

const DEFAULT_RPC_URL = process.env.REACT_APP_RPC_URL || 'http://localhost:8545';
const DEFAULT_VAULT_NODE = process.env.REACT_APP_VAULT_API_URL || 'http://localhost:3004';

const DEFAULT_CONTENT_TYPE_NODES: ContentTypeNodePreferences = {
  messages: null,
  posts: null,
  media: null,
  listings: null
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      rpcUrl: DEFAULT_RPC_URL,
      vaultPrimaryNode: DEFAULT_VAULT_NODE,
      vaultFallbackStrategy: 'auto' as VaultFallbackStrategy,
      passkeyProtectionEnabled: false,
      contentTypeNodes: DEFAULT_CONTENT_TYPE_NODES,
      contentTypeOverrides: {},
      setRpcUrl: (url: string) => set({ rpcUrl: url }),
      setVaultPrimaryNode: (url: string) => set({ vaultPrimaryNode: url }),
      setVaultFallbackStrategy: (strategy: VaultFallbackStrategy) => set({ vaultFallbackStrategy: strategy }),
      setPasskeyProtectionEnabled: (enabled: boolean) => set({ passkeyProtectionEnabled: enabled }),
      setContentTypeNodes: (nodes: ContentTypeNodePreferences) => set({ contentTypeNodes: nodes }),
      setContentTypeOverride: (contentType: ContentType, nodeUrl: string | null) => 
        set((state) => ({ 
          contentTypeOverrides: { ...state.contentTypeOverrides, [contentType]: nodeUrl } 
        })),
      clearContentTypeOverride: (contentType: ContentType) => 
        set((state) => {
          const newOverrides = { ...state.contentTypeOverrides };
          delete newOverrides[contentType];
          return { contentTypeOverrides: newOverrides };
        }),
      resetToDefaults: () => set({ 
        rpcUrl: DEFAULT_RPC_URL,
        vaultPrimaryNode: DEFAULT_VAULT_NODE,
        vaultFallbackStrategy: 'auto' as VaultFallbackStrategy,
        passkeyProtectionEnabled: false,
        contentTypeNodes: DEFAULT_CONTENT_TYPE_NODES,
        contentTypeOverrides: {}
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

// Get the preferred node for a specific content type
// Returns override if set, otherwise auto-assigned node, otherwise primary node
export const getNodeForContentType = (contentType: ContentType): string => {
  const state = useSettingsStore.getState();
  
  // Check for manual override first
  const override = state.contentTypeOverrides[contentType];
  if (override) return override;
  
  // Check for auto-assigned node
  const autoAssigned = state.contentTypeNodes[contentType];
  if (autoAssigned) return autoAssigned;
  
  // Fall back to primary node
  return state.vaultPrimaryNode;
};

// Get content type preferences (for use in vaultService)
export const getContentTypePreferences = () => {
  const state = useSettingsStore.getState();
  return {
    contentTypeNodes: state.contentTypeNodes,
    contentTypeOverrides: state.contentTypeOverrides,
    primaryNode: state.vaultPrimaryNode
  };
};
