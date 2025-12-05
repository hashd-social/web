import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConnectionState {
  isConnected: boolean;
  walletAddress: string;
  hasHydrated: boolean;
  showMailboxSwitcher: boolean;
  setConnected: (address: string) => void;
  setDisconnected: () => void;
  setHasHydrated: (state: boolean) => void;
  setShowMailboxSwitcher: (show: boolean) => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set) => ({
      isConnected: false,
      walletAddress: '',
      hasHydrated: false,
      showMailboxSwitcher: false,
      setConnected: (address: string) => set({ 
        isConnected: true, 
        walletAddress: address.toLowerCase() 
      }),
      setDisconnected: () => set({ 
        isConnected: false, 
        walletAddress: '',
        showMailboxSwitcher: false
      }),
      setHasHydrated: (state: boolean) => set({ hasHydrated: state }),
      setShowMailboxSwitcher: (show: boolean) => set({ showMailboxSwitcher: show }),
    }),
    {
      name: 'hashd-connection',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
