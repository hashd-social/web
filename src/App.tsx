import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { contractService, debugContractStatus } from './utils/contracts';
import { SimpleCryptoUtils, SimpleKeyManager, CryptoKeyPair, MailboxInfo } from './utils/crypto-simple';
import { resetApp } from './utils/resetApp';
import { SessionPersistence } from './utils/session-persistence';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { MessageList } from './pages/MessageList';
import { SendMessage } from './components/modals/SendMessage';
import { NeonModal } from './components/modals/NeonModal';
import './styles/cyberpunk-theme.css';
import { Group } from './pages/Group';
import { LogoutModal } from './components/modals/LogoutModal';
import { MailboxModal } from './components/modals/MailboxModal';
import { Landing } from './pages/Landing';
import { Feed } from './pages/Feed';
import { Account } from './pages/Account';
import { Settings } from './pages/Settings';
import { SystemInfo } from './pages/SystemInfo';
import PostDetails from './pages/PostDetails';
import { useAccountAbstraction } from './hooks/useAccountAbstraction';
import { ethers } from 'ethers';
import { Mail } from 'lucide-react';
import { useSettingsStore } from './store/settingsStore';
import { useConnectionStore } from './store/connectionStore';
import { LoadingState } from './components/Spinner';
import { MailboxSwitcher } from './components/modals/MailboxSwitcher';
import { ForceMailboxSelection } from './components/modals/ForceMailboxSelection';
import { ToastProvider, toast } from './components/Toast';
import { PasskeyLockScreen } from './components/PasskeyLockScreen';
import { hasPasskey } from './services/passkeyService';
import { Waitlist } from './pages/Waitlist';
import { VerifyEmail } from './pages/VerifyEmail';
import { EmailVerified } from './pages/EmailVerified';
import { FAQ } from './pages/FAQ';
import { About } from './pages/About';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { Support } from './pages/Support';
import { Documentation } from './pages/Documentation';
import { ScrollToTop } from './components/ScrollToTop';

// Load dev tools in development mode (available at window.devTools)
if (process.env.NODE_ENV === 'development') {
  import('./dev');
}

interface AppState {
  isConnected: boolean;
  userAddress: string;
  keyPair: CryptoKeyPair | null;
  isKeyRegistered: boolean;
  loading: boolean;
  error: string | null;
  warning: string | null;
  isPasskeyLocked: boolean;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { passkeyProtectionEnabled } = useSettingsStore();
  const isWaitlistMode = process.env.REACT_APP_WAITLIST_MODE === 'true';
  const [state, setState] = useState<AppState>({
    isConnected: false,
    userAddress: '',
    keyPair: null,
    isKeyRegistered: false,
    loading: false,
    error: null,
    warning: null,
    isPasskeyLocked: false
  });

  const [, setActiveTab] = useState<'feed' | 'messages' | 'account' | 'settings'>('feed');
  const [showCompose, setShowCompose] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [modalContext, setModalContext] = useState<'initial' | 'switch' | 'create'>('initial');
  const [mailboxes, setMailboxes] = useState<MailboxInfo[]>([]);
  const [currentMailbox, setCurrentMailbox] = useState<MailboxInfo | null>(null);
  const [groupRefreshTrigger, setGroupRefreshTrigger] = useState(0);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{address: string} | null>(null);
  const [incompleteRegistration] = useState<{
    accountName: string;
    domain: string;
    fullName: string;
  } | null>(null);
  const [selectedDomain] = useState('mega'); // Fixed domain for now
  const [creationProgress, setCreationProgress] = useState<{
    currentStep: number;
    steps: {
      title: string;
      description: string;
      status: 'pending' | 'active' | 'completed' | 'error';
    }[];
  } | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const sessionRestoreAttempted = React.useRef(false);
  
  // Settings and connection from Zustand stores
  const {  rpcUrl } = useSettingsStore();
  const { isConnected: zustandConnected, walletAddress: zustandWallet, hasHydrated, setConnected, setDisconnected, setShowMailboxSwitcher } = useConnectionStore();
  
  // Check key version on mount - will clear old mailboxes if version changed
  useEffect(() => {
    SimpleKeyManager.checkVersion();
    
    // SECURITY: Clean up any insecure storage of PINs and keys
    import('./utils/storage-cleanup').then(({ StorageCleanup }) => {
      StorageCleanup.performFullCleanup();
    });

    // Try to restore session if persistence is enabled
    console.log('🔍 [App] Checking for saved session...');
    const session = SessionPersistence.restoreSession();
    if (session) {
      console.log('🔄 [App] Restoring session from sessionStorage...');
      setState(prev => ({
        ...prev,
        isConnected: true,
        keyPair: session.keyPair,
        userAddress: session.walletAddress,
        isKeyRegistered: true
      }));
      // Also set Zustand connection state
      setConnected(session.walletAddress);
      console.log('✅ [App] Session restored - user should see main app');
      
      // Refresh mailboxes to update UI with restored session
      setTimeout(() => {
        refreshMailboxes(session.walletAddress, session.keyPair);
      }, 100);
      
      // Mark that session restore has been attempted AFTER state updates
      setTimeout(() => {
        sessionRestoreAttempted.current = true;
        console.log('✅ [App] Session restore complete - auto-connect can proceed');
      }, 50);
    } else {
      console.log('📍 [App] No session to restore - normal flow');
      // Mark immediately if no session to restore
      sessionRestoreAttempted.current = true;
    }
  }, []);

  // Check for passkey protection on mount
  useEffect(() => {
    if (passkeyProtectionEnabled && hasPasskey()) {
      setState(prev => ({ ...prev, isPasskeyLocked: true }));
    }
  }, [passkeyProtectionEnabled]);
  
  // Expose RPC URL to window for ContractService
  useEffect(() => {
    (window as any).__HASHD_SETTINGS__ = { rpcUrl };
  }, [rpcUrl]);

  // Sync activeTab with current route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/messages') {
      setActiveTab('messages');
    } else if (path === '/account') {
      setActiveTab('account');
    } else if (path === '/settings') {
      setActiveTab('settings');
    } else if (path === '/' || path.startsWith('/guild/')) {
      setActiveTab('feed');
    }
  }, [location.pathname]);

  // Initialize account abstraction
  const accountAbstraction = useAccountAbstraction(state.userAddress, signer);

  // Listen for wallet and network changes
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return;

    const handleAccountsChanged = (accounts: string[]) => {
      console.log('🔄 [Wallet] Account changed:', accounts);
      if (accounts.length === 0) {
        // User disconnected wallet
        console.log('👋 [Wallet] User disconnected wallet');
        disconnectWallet(true); // Clear session data
      } else if (state.isConnected && accounts[0].toLowerCase() !== state.userAddress.toLowerCase()) {
        // User switched to a different account
        console.log('🔄 [Wallet] User switched account, disconnecting...');
        toast.warning('Wallet account changed. Please reconnect.');
        disconnectWallet(true); // Clear session data
      }
    };

    const handleChainChanged = (chainId: string) => {
      console.log('🔄 [Network] Chain changed:', chainId);
      const expectedChainId = '0x18c6'; // 6342 in hex for MegaETH
      if (chainId !== expectedChainId) {
        console.log('⚠️ [Network] Wrong network detected, disconnecting...');
        toast.warning('Network changed. Please reconnect to MegaETH.');
        disconnectWallet();
      }
    };

    // Add listeners
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // Cleanup
    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [state.isConnected, state.userAddress]);

  useEffect(() => {
    let mounted = true;
    
    const autoConnect = async () => {
      if (!mounted) return;
      
      // Wait for Zustand to rehydrate before checking connection
      if (!hasHydrated) {
        // console.log('⏳ [AutoConnect] Waiting for Zustand to rehydrate...');
        return;
      }
      
      // Wait for session restore to complete before proceeding
      if (!sessionRestoreAttempted.current) {
        console.log('⏳ [AutoConnect] Waiting for session restore to complete...');
        return;
      }
      
      // Skip auto-connect if we already have an active keyPair (from session restore)
      console.log('🔍 [AutoConnect] Checking session - keyPair:', state.keyPair ? 'EXISTS' : 'NULL', 'isConnected:', state.isConnected);
      if (state.keyPair && state.isConnected) {
        console.log('✅ [AutoConnect] Session already active - skipping auto-connect');
        return;
      }
      console.log('🔄 [AutoConnect] No active session - proceeding with auto-connect');
      
      // console.log('🔄 [AutoConnect] Starting auto-connect check...');
      // console.log('📊 [AutoConnect] Zustand isConnected:', zustandConnected);
      // console.log('📊 [AutoConnect] Zustand wallet:', zustandWallet);
      // console.log('📊 [AutoConnect] localStorage hashd-connection:', localStorage.getItem('hashd-connection'));
      
      // If we have a wallet in Zustand, check for mailboxes
      // (Don't require zustandConnected - it might not persist correctly)
      if (!zustandWallet) {
        // console.log('ℹ️ [AutoConnect] No wallet in Zustand - showing connect screen');
        return;
      }
      
      // Check if we have mailboxes for this wallet
      const hasMailboxes = SimpleKeyManager.getMailboxList(zustandWallet).length > 0;
      // console.log('📊 [AutoConnect] Has mailboxes for wallet:', hasMailboxes);
      
      if (!hasMailboxes) {
        // console.log('ℹ️ [AutoConnect] No mailboxes found for this wallet - showing connect screen');
        // Clear the stale connection state
        setDisconnected();
        return;
      }
      
      // Try to auto-connect if MetaMask is available
      if (typeof window.ethereum !== 'undefined') {
        setState(prev => ({ ...prev, loading: true }));
        
        // Retry logic: MetaMask might not be ready immediately
        const maxRetries = 5;
        const retryDelay = 500; // ms
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          if (!mounted) break;
          
          try {
            // console.log(`🔄 [AutoConnect] Attempt ${attempt}/${maxRetries}...`);
            
            // Check current MetaMask account
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            // console.log('📊 [AutoConnect] eth_accounts returned:', accounts);
            
            if (accounts && accounts.length > 0) {
              const currentAccount = accounts[0].toLowerCase();
              // console.log('✅ [AutoConnect] Found authorized account:', currentAccount);
              
              // Check if the current account matches Zustand wallet
              if (currentAccount !== zustandWallet.toLowerCase()) {
                // console.log('⚠️ [AutoConnect] Wallet address changed - disconnecting');
                console.log('   Zustand:', zustandWallet);
                console.log('   Current:', currentAccount);
                setDisconnected();
                if (mounted) {
                  setState(prev => ({ ...prev, loading: false }));
                }
                return;
              }
              
              // Auto-connect successful - use the full connectWallet flow
              // console.log('🔄 [AutoConnect] Proceeding with auto-connect...');
              await connectWallet();
              return; // Success, exit retry loop
            }
            
            // Empty accounts - MetaMask might not be ready yet
            if (attempt < maxRetries) {
              // console.log(`⏳ [AutoConnect] MetaMask not ready, waiting ${retryDelay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
              // Final attempt failed - stay on current page, don't disconnect
              // console.log('⚠️ [AutoConnect] MetaMask not responding after retries - staying logged in');
              if (mounted) {
                setState(prev => ({ ...prev, loading: false }));
              }
            }
          } catch (error) {
            // console.error(`❌ [AutoConnect] Attempt ${attempt} error:`, error);
            if (attempt === maxRetries) {
              // Final attempt failed - stay logged in
              if (mounted) {
                setState(prev => ({ ...prev, loading: false }));
              }
            } else {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }
        }
      } else {
        // console.log('⚠️ [AutoConnect] MetaMask not available');
      }
    };
    
    autoConnect();
    
    // Listen for account changes in MetaMask
    const handleAccountsChanged = (accounts: string[]) => {
      console.log('🔄 [AccountChange] MetaMask accounts changed:', accounts);
      
      if (accounts.length === 0) {
        // User disconnected from MetaMask
        console.log('⚠️ [AccountChange] User disconnected from MetaMask');
        disconnectWallet(true); // Clear session data
      } else {
        const newAccount = accounts[0].toLowerCase();
        
        if (zustandWallet && newAccount !== zustandWallet.toLowerCase()) {
          // Wallet changed - disconnect and show connect screen
          console.log('⚠️ [AccountChange] Wallet changed - disconnecting');
          console.log('   Old:', zustandWallet);
          console.log('   New:', newAccount);
          toast.warning('Wallet account changed. Logging out and clearing session data.');
          disconnectWallet(true); // Clear session data
        }
      }
    };
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
    
    return () => {
      mounted = false;
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [hasHydrated, zustandWallet, state.isConnected]); // Re-run when Zustand finishes rehydrating, wallet changes, or connection state changes
  
  
  // Check for incomplete registrations when wallet connects
  useEffect(() => {
    const checkIncompleteRegistrations = async () => {
      if (!state.isConnected || !state.userAddress) return;
      
      // Add a small delay to ensure localStorage has been read
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        console.log('🔍 Checking for incomplete registrations...');
        
        // Get all named accounts for this wallet
        const namedAccounts = await contractService.getOwnerNamedAccounts(state.userAddress);
        console.log('Named accounts for wallet:', namedAccounts);
        
        // If no named accounts, no need to check further
        if (namedAccounts.length === 0) {
          console.log('✅ No named accounts found - clearing any warnings');
          setState(prev => ({
            ...prev,
            warning: ''
          }));
          return;
        }
        
        // Only show warning if there are named accounts but NO local mailboxes
        // If user has created mailboxes, they've completed registration
        const localMailboxes = SimpleKeyManager.getMailboxList(state.userAddress);
        const hasLocalMailboxes = localMailboxes.length > 0;
        
        console.log('Local mailboxes count:', localMailboxes.length);
        console.log('Named accounts count:', namedAccounts.length);
        
        if (!hasLocalMailboxes) {
          console.log('⚠️ Found incomplete registrations:', namedAccounts);
          setState(prev => ({
            ...prev,
            warning: `Found incomplete registration(s): ${namedAccounts.join(', ')}. Please create a mailbox with the same name and PIN to complete the registration.`
          }));
        } else {
          console.log('✅ Named accounts found and mailboxes exist - registration complete');
          // Clear any existing warning
          setState(prev => ({
            ...prev,
            warning: ''
          }));
        }
      } catch (error) {
        console.log('Error checking incomplete registrations:', error);
      }
    };
    
    checkIncompleteRegistrations();
  }, [state.isConnected, state.userAddress, state.keyPair]);
  
  
  // Resolve actual account names from public keys
  const resolveMailboxAccountNames = async () => {
    const walletAddr = state.userAddress || zustandWallet;
    const loadedMailboxes = SimpleKeyManager.getMailboxList(walletAddr);
    console.log('🔍 Resolving account names for mailboxes:', loadedMailboxes);
    
    if (loadedMailboxes.length === 0 || !state.isConnected || !state.userAddress) {
      console.log('⏭️  Skipping account name resolution - not ready');
      return loadedMailboxes;
    }
    
    // Additional safety check - ensure contracts are initialized
    try {
      await contractService.getAvailableDomains();
    } catch (error) {
      console.warn('⚠️ Contracts not ready, skipping account name resolution');
      return loadedMailboxes;
    }
    
    // Get all named accounts for this wallet once
    let namedAccounts: string[] = [];
    try {
      namedAccounts = await contractService.getOwnerNamedAccounts(state.userAddress);
      console.log(`📋 Found ${namedAccounts.length} named accounts for wallet:`, namedAccounts);
    } catch (error) {
      console.warn('Could not fetch named accounts for wallet:', error);
      return loadedMailboxes;
    }
    
    // Build a map of publicKeyHash -> {accountName, timestamp}
    const publicKeyHashToInfo = new Map<string, { name: string; timestamp: number }>();
    
    for (const accountName of namedAccounts) {
      try {
        const accountInfo = await contractService.getNamedAccountInfo(accountName);
        // Get the public key bytes and compute the hash (first 16 bytes)
        const publicKeyBytes = SimpleCryptoUtils.publicKeyFromHex(accountInfo.publicKey);
        const publicKeyHash = SimpleCryptoUtils.bytesToHex(publicKeyBytes.slice(0, 16));
        // Store timestamp in milliseconds (contract returns seconds, so multiply by 1000)
        const timestampMs = accountInfo.timestamp * 1000;
        publicKeyHashToInfo.set(publicKeyHash, { name: accountName, timestamp: timestampMs });
        console.log(`🔑 Mapped ${accountName} -> hash ${publicKeyHash}, registered: ${new Date(timestampMs).toLocaleString()}`);
      } catch (error) {
        console.warn(`Could not get info for account ${accountName}:`, error);
      }
    }
    
    // Match mailboxes to named accounts using publicKeyHash
    const resolvedMailboxes = loadedMailboxes.map((mailbox, index) => {
      const matchedInfo = publicKeyHashToInfo.get(mailbox.publicKeyHash);
      
      if (matchedInfo) {
        console.log(`✅ Matched mailbox ${index} (hash: ${mailbox.publicKeyHash}) to account: ${matchedInfo.name}`);
        // Update with blockchain timestamp
        return { 
          ...mailbox, 
          name: matchedInfo.name,
          createdAt: matchedInfo.timestamp // Use blockchain registration timestamp
        };
      }
      
      // If no account found, preserve existing name (including custom names for Bare Accounts)
      // Only use fallback if name is generic (starts with 'Mailbox' or 'Main')
      let preservedName = mailbox.name;
      
      if (!mailbox.name || mailbox.name.startsWith('Mailbox ') || mailbox.name === 'Main') {
        // Generic name - use fallback
        preservedName = index === 0 ? 'Main' : `Mailbox ${index + 1}`;
      }
      // Otherwise preserve whatever name is there (including 'Bare Account' or custom names)
      
      console.log(`🔄 No blockchain account for mailbox ${index}, preserving name: ${preservedName}`);
      return { ...mailbox, name: preservedName };
    });
    
    // Update localStorage with resolved names
    localStorage.setItem('hashd_mailboxes', JSON.stringify(resolvedMailboxes));
    console.log('✅ Updated mailbox names with resolved account names');
    
    return resolvedMailboxes;
  };

  // Expose debug function globally (development only)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).debugMailboxes = () => {
        console.log('=== MAILBOX DEBUG INFO ===');
        const mailboxes = SimpleKeyManager.getMailboxList();
        console.log('All mailboxes:', mailboxes);
        console.log('Current mailbox from state:', currentMailbox);
        console.log('Active keyPair:', state.keyPair ? 'Yes' : 'No');
        if (state.keyPair) {
          const hash = SimpleCryptoUtils.bytesToHex(state.keyPair.publicKey.slice(0, 16));
          console.log('Current public key hash:', hash);
        }
        
        // Force refresh
        setTimeout(() => refreshMailboxes(), 100);
      };
    }
  }, []);

  // Refresh mailboxes when needed
  const refreshMailboxes = async (explicitWalletAddr?: string, explicitKeyPair?: CryptoKeyPair) => {
    let mailboxes;
    
    // Use explicit address if provided, otherwise fall back to state or zustand
    const walletAddr = explicitWalletAddr || state.userAddress || zustandWallet;
    
    if (state.isConnected) {
      // If connected, resolve actual account names
      mailboxes = await resolveMailboxAccountNames();
    } else {
      // If not connected, just load from storage
      mailboxes = SimpleKeyManager.getMailboxList(walletAddr);
    }
    
    // Remove duplicates based on publicKeyHash (should not happen, but safety check)
    const uniqueMailboxes = mailboxes.filter((mailbox, index, arr) => 
      arr.findIndex(m => m.publicKeyHash === mailbox.publicKeyHash) === index
    );
    
    setMailboxes(uniqueMailboxes);
    
    // Update current mailbox based on active keyPair
    // Use explicit keyPair if provided (to avoid race condition with state updates)
    const activeKeyPair = explicitKeyPair || state.keyPair;
    
    if (activeKeyPair) {
      const currentPublicKeyHash = SimpleCryptoUtils.bytesToHex(activeKeyPair.publicKey.slice(0, 16));
      const current = uniqueMailboxes.find(m => m.publicKeyHash === currentPublicKeyHash);
      
      if (!current) {
        // Current mailbox was deleted - clear keyPair from state
        console.log('⚠️ Current mailbox was deleted, clearing state');
        setState(prev => ({ ...prev, keyPair: null }));
        setCurrentMailbox(null);
      } else {
        console.log('📬 Setting current mailbox to:', current.name, 'Hash:', currentPublicKeyHash);
        setCurrentMailbox(current);
      }
    } else {
      // No active keyPair, clear current mailbox
      console.log('📬 No active keyPair, clearing current mailbox');
      setCurrentMailbox(null);
    }
    
    // Show mailbox switcher if there are multiple mailboxes
    if (uniqueMailboxes.length > 1) {
      setShowMailboxSwitcher(true);
    }
  };


  const disconnectWallet = (clearSessionData: boolean = false) => {
    console.log('🔌 Disconnecting wallet...');
    
    if (clearSessionData) {
      console.log('🗑️ Clearing all session data...');
      
      // Use global reset utility
      resetApp();
      setDisconnected();
      console.log('✅ All session data cleared');
    } else {
      // Just clear connection state
      setDisconnected();
      localStorage.removeItem('hashd_wallet_address');
    }
    
    // Reset local state
    setState(prev => ({ 
      ...prev, 
      isConnected: false,
      userAddress: '',
      keyPair: null,
      isKeyRegistered: false,
      loading: false,
      error: null,
      warning: null
    }));
    
    // Clear current mailbox and other state
    setCurrentMailbox(null);
    setMailboxes([]);
    setShowCompose(false);
    setActiveTab('feed');
    
    // Navigate to home
    navigate('/');
    
    console.log('✅ Wallet disconnected');
  };

  const handleLogout = (clearSessionData: boolean) => {
    disconnectWallet(clearSessionData);
  };

  const connectWallet = async () => {
    const startTime = Date.now();
    let rpcCalls = 0;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // console.log('🔄 [Connect] Attempting to connect wallet...');
      debugContractStatus();
      
      const connected = await contractService.connect();
      if (connected) {
        // console.log('✅ [Connect] Wallet connected, getting address...');
        const address = await contractService.getAddress();
        // console.log('✅ [Connect] User address:', address);
        
        // Store wallet address for persistence
        localStorage.setItem('hashd_wallet_address', address);
        
        // Get signer for account abstraction
        const currentSigner = await contractService.getSigner();
        setSigner(currentSigner);
        
        
        // Check if we have any mailboxes for this wallet
        // First check if there's already an active keyPair in state (from recent unlock)
        let keyPair = state.keyPair;
        let isRegistered = false;
        
        console.log('🔍 [Connect] Checking state.keyPair:', keyPair ? 'EXISTS' : 'NULL');
        console.log('🔍 [Connect] state.isConnected:', state.isConnected);
        
        if (!keyPair) {
          // No active keyPair in state, check if we have mailboxes registered
          const mailboxes = SimpleKeyManager.getMailboxList(address);
          
          if (mailboxes.length === 0) {
            // No mailboxes exist at all - prompt user to create one
            console.log('🔐 [Connect] No mailboxes found for this wallet, prompting for PIN...');
            const elapsed = Date.now() - startTime;
            setPendingConnection({ address });
            setShowPinPrompt(true);
            setState(prev => ({ ...prev, loading: false, userAddress: address }));
            return; // Wait for user to create/unlock mailbox
          } else {
            // Mailboxes exist but no active session - prompt for PIN to unlock
            console.log('🔐 [Connect] Mailboxes exist but no active session, prompting for PIN...');
            const elapsed = Date.now() - startTime;
            setPendingConnection({ address });
            setShowPinPrompt(true);
            setState(prev => ({ ...prev, loading: false, userAddress: address }));
            return; // Wait for user to enter PIN
          }
        } else {
          // Active keyPair exists in state - use it
          console.log('✅ [Connect] Using active keyPair from state');
          // Keys exist in localStorage - use them
          const pubKeyHex = SimpleCryptoUtils.publicKeyToHex(keyPair.publicKey);
          // console.log('✅ [Connect] Loaded existing mailbox from localStorage');
          // console.log('📍 [Connect] Loaded keyPair public key:', pubKeyHex);
          
          // Check if registered on blockchain
          try {
            // console.log('🔄 [Connect] Checking key registration...');
            const regStart = Date.now();
            isRegistered = await contractService.isKeyRegistered(address);
            rpcCalls++; // 1 RPC call
            // console.log(`⏱️ [Connect] Registration check took ${Date.now() - regStart}ms`);
            // console.log('✅ [Connect] Key registered on blockchain:', isRegistered);
          } catch (error) {
            // console.warn('⚠️ [Connect] Failed to check key registration:', error);
          }
          
          const elapsed = Date.now() - startTime;
          // console.log(`✅ [Connect] Connection complete in ${elapsed}ms (${rpcCalls} RPC calls)`);
          // console.log(`⚡ [Connect] Average time per call: ${rpcCalls > 0 ? (elapsed / rpcCalls).toFixed(0) : 0}ms`);
          
          setState(prev => ({
            ...prev,
            isConnected: true,
            userAddress: address,
            isKeyRegistered: isRegistered,
            keyPair: keyPair,
            loading: false
          }));
          
          // Store connection in Zustand (persists across refreshes)
          setConnected(address);
          // console.log('✅ [Connect] Connection saved to Zustand');
          
          // Load existing session key for account abstraction
          accountAbstraction.loadSessionKey();
          
          // Refresh mailboxes to resolve account names
          setTimeout(() => {
            // console.log('🔄 [Connect] Refreshing mailboxes after wallet connection...');
            refreshMailboxes();
          }, 100);
        }
      } else {
        setState(prev => ({
          ...prev,
          error: 'Failed to connect to wallet',
          loading: false
        }));
      }
    } catch (error) {
      console.error('Connection error:', error);
      debugContractStatus();
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      }));
    }
  };


  const registerKey = async () => {
    if (!state.keyPair) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const keyHex = SimpleCryptoUtils.publicKeyToHex(state.keyPair.publicKey);
      const tx = await contractService.registerKey(keyHex);
      await tx.wait();
      
      setState(prev => ({
        ...prev,
        isKeyRegistered: true,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to register key',
        loading: false
      }));
    }
  };

  // Detect and recover from incomplete registrations (account registered but keys not registered)
  const detectAndRecoverIncompleteRegistration = async (address: string, accountName?: string, domain?: string) => {
    if (!accountName || !domain) return null;

    try {
      console.log('🔍 Checking for incomplete registration...');
      
      // Check if named account exists
      const fullName = `${accountName}@${domain}`;
      const namedAccount = await contractService.getNamedAccount(fullName);
      
      console.log('Named account:', namedAccount);
      
      // If account doesn't exist or isn't active, not incomplete
      if (!namedAccount.isActive) {
        console.log('✅ Account not registered');
        return { needsRecovery: false };
      }
      
      // FRONT-RUNNING PROTECTION: Verify the current wallet owns this account
      if (namedAccount.owner.toLowerCase() !== address.toLowerCase()) {
        console.log('❌ Front-running detected: Account owned by different address');
        console.log('Expected owner:', address.toLowerCase());
        console.log('Actual owner:', namedAccount.owner.toLowerCase());
        throw new Error(`This account is owned by a different wallet. You cannot recover this registration. Account owner: ${namedAccount.owner}`);
      }
      
      // Account exists and is owned by current wallet
      // Now check if the public key from the named account is registered in KeyRegistry
      try {
        const keyExists = await contractService.hasKey(address, namedAccount.publicKey);
        console.log('Key exists in KeyRegistry:', keyExists);
        console.log('Named account public key:', namedAccount.publicKey);
        
        // Check if the key is registered
        if (keyExists) {
          console.log('✅ Key is registered - registration is complete');
          return { needsRecovery: false };
        } else {
          console.log('⚠️ Key NOT registered in KeyRegistry - incomplete registration detected!');
          console.log('Named account has:', namedAccount.publicKey);
          return {
            needsRecovery: true,
            fullName,
            publicKey: namedAccount.publicKey,
            accountName,
            domain
          };
        }
      } catch (keyError) {
        // No key registered in KeyRegistry at all - definitely incomplete
        console.log('⚠️ No key in KeyRegistry - incomplete registration!');
        return {
          needsRecovery: true,
          fullName,
          publicKey: namedAccount.publicKey,
          accountName,
          domain
        };
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('owned by a different wallet')) {
        throw error; // Re-throw front-running errors
      }
      console.log('No incomplete registration detected:', error);
      return { needsRecovery: false };
    }
  };

  const createNewMailbox = async (pin: string, name: string, accountName?: string, domain?: string, isFirstMailbox: boolean = false) => {
    setState(prev => ({ ...prev, error: null }));
    // Don't set loading=true here - we use creationProgress instead
    
    // Initialize progress tracking
    const steps = [
      {
        title: 'Generate Keys',
        description: 'Creating encryption keys from PIN and wallet signature',
        status: 'active' as const,
      },
      {
        title: 'Check Availability',
        description: accountName && domain ? `Checking ${accountName}@${domain} status` : 'Checking PIN uniqueness',
        status: 'pending' as const,
      },
      {
        title: 'Register Account',
        description: accountName && domain ? `Registering ${accountName}@${domain} on blockchain` : 'Saving mailbox locally',
        status: 'pending' as const,
      },
      {
        title: 'Register Keys',
        description: 'Registering public key on KeyRegistry',
        status: 'pending' as const,
      },
    ];
    
    setCreationProgress({ currentStep: 0, steps });
    
    try {
      console.log('📬 Creating new mailbox...');
      
      // Get address (from pending connection or current state)
      const address = pendingConnection?.address || state.userAddress;
      if (!address) {
        throw new Error('No wallet address available');
      }
      
      // IMPORTANT: Ensure contractService is connected before making any write calls
      console.log('🔗 Ensuring contract service is connected...');
      const isConnected = await contractService.connect();
      if (!isConnected) {
        throw new Error('Failed to connect to contracts');
      }
      console.log('✅ Contract service connected');
      
      // Generate new deterministic keys with the PIN
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      const newKeyPair = await SimpleKeyManager.generateDeterministicKeys(
        signer,
        address,
        pin
      );
      
      // Step 1 complete - move to step 2
      setCreationProgress(prev => prev ? {
        ...prev,
        currentStep: 1,
        steps: prev.steps.map((step, idx) => ({
          ...step,
          status: idx === 0 ? 'completed' as const : idx === 1 ? 'active' as const : step.status
        }))
      } : null);
      
      // Check if this public key already exists (PIN reuse detection)
      const newPublicKeyHash = SimpleCryptoUtils.bytesToHex(newKeyPair.publicKey);
      const keyHex = SimpleCryptoUtils.publicKeyToHex(newKeyPair.publicKey);
      
      // First check localStorage (fast, no blockchain call)
      const existingMailboxes = SimpleKeyManager.getMailboxList();
      const duplicateMailbox = existingMailboxes.find(m => m.publicKeyHash === newPublicKeyHash);
      
      if (duplicateMailbox && !isFirstMailbox) {
        throw new Error(`This PIN generates the same keys as mailbox "${duplicateMailbox.name}". Please use a different PIN.`);
      }
      
      // Check blockchain: See if this public key is already registered
      console.log('🔍 Checking if this public key is already registered on blockchain...');
      console.log('Generated public key:', keyHex);
      
      // STEP 1: Check KeyRegistry (source of truth for public keys)
      let existingKeyOnChain = false;
      let existingMailboxName = '';
      
      try {
        // Check if this specific key exists for this wallet
        const keyExists = await contractService.hasKey(address, keyHex);
        
        if (keyExists) {
          // Get the key details
          const keyDetails = await contractService.getPublicKey(address, keyHex);
          existingKeyOnChain = true;
          existingMailboxName = keyDetails.mailboxName || 'Unknown';
          
          console.log('✅ This PIN generates a public key that is already registered on-chain');
          console.log('Registered mailbox name:', existingMailboxName);
          
          // If trying to create a NEW mailbox with same PIN - NOT ALLOWED
          if (!isFirstMailbox) {
            throw new Error(`This PIN is already used for mailbox "${existingMailboxName}". Please use a different PIN or switch to that mailbox.`);
          }
          
          // If first mailbox (initial connection), this is account recovery - ALLOWED
          console.log('🔄 First connection - allowing recovery of existing account');
        } else {
          console.log('✅ This PIN generates a new public key (not yet registered)');
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('This PIN is already used')) {
          throw error;
        }
        console.log('No key found in KeyRegistry or error checking:', error);
      }
      
      // STEP 2: If key exists on-chain, verify it matches bare/named accounts
      if (existingKeyOnChain) {
        console.log('🔍 Verifying account consistency...');
        
        // Check bare account
        try {
          const hasBare = await contractService.hasBareAccount(address);
          if (hasBare) {
            const bareAccount = await contractService.getBareAccount(address);
            if (bareAccount.publicKey.toLowerCase() === keyHex.toLowerCase()) {
              console.log('✅ Matches bare account');
            }
          }
        } catch (error) {
          console.log('No bare account or error checking:', error);
        }
        
        // Check named accounts
        try {
          const allNamedAccounts = await contractService.getOwnerNamedAccounts(address);
          for (const existingAccount of allNamedAccounts) {
            try {
              const existingPubKey = await contractService.getPublicKeyByName(existingAccount);
              if (existingPubKey.toLowerCase() === keyHex.toLowerCase()) {
                console.log(`✅ Matches named account: ${existingAccount}`);
              }
            } catch (error) {
              console.warn('Could not check named account:', existingAccount, error);
            }
          }
        } catch (error) {
          console.log('No named accounts or error checking:', error);
        }
      }
      
      // Step 2 complete - move to step 3
      setCreationProgress(prev => prev ? {
        ...prev,
        currentStep: 2,
        steps: prev.steps.map((step, idx) => ({
          ...step,
          status: idx <= 1 ? 'completed' as const : idx === 2 ? 'active' as const : step.status
        }))
      } : null);
      
      // Register on AccountRegistry
      // If account name and domain provided, register named account (FIRST FREE if 5+ chars, then PAID)
      if (accountName && domain) {
        // IMPORTANT: Check for incomplete registration FIRST before checking availability
        console.log('🔗 Step 1: Checking for incomplete registration...');
        const recoveryInfo = await detectAndRecoverIncompleteRegistration(address, accountName, domain);
        
        if (recoveryInfo?.needsRecovery) {
          console.log('🔄 Recovering from incomplete registration...');
          
          // Update progress to show recovery
          setCreationProgress(prev => prev ? {
            ...prev,
            currentStep: 3,
            steps: [
              { title: 'Generate Keys', description: 'Keys already generated', status: 'completed' as const },
              { title: 'Check Availability', description: '⚠️ Found incomplete registration - recovering', status: 'completed' as const },
              { title: 'Register Account', description: `${recoveryInfo.fullName} already registered (paid)`, status: 'completed' as const },
              { title: 'Register Keys', description: 'Completing registration: Linking keys to account', status: 'active' as const },
            ]
          } : null);
          
          // Verify the generated keys match the registered account
          if (!recoveryInfo.publicKey || recoveryInfo.publicKey.toLowerCase() !== keyHex.toLowerCase()) {
            throw new Error('PIN mismatch! The registered account was created with a different PIN. Please use the correct PIN or choose a different name.');
          }
          
          // Skip to key registration (step 4)
          console.log('🔗 Registering mailbox public key on KeyRegistry (recovery)...');
          const tx = await contractService.registerKey(keyHex, name);
          await tx.wait();
          console.log('✅ Recovery complete: Mailbox registered on KeyRegistry with name:', name);
          
          // IMPORTANT: Only save mailbox locally AFTER key registration completes successfully
          const displayName = `${accountName}@${domain}`;
          await SimpleKeyManager.saveMailboxKeys(pin, newKeyPair, displayName, address);
          console.log('✅ Mailbox saved locally with name:', displayName);
          
          // Complete
          setCreationProgress(prev => prev ? {
            ...prev,
            currentStep: 4,
            steps: prev.steps.map((step, idx) => ({
              ...step,
              status: 'completed' as const
            }))
          } : null);
          
          // Success handling
          console.log(`🎉 Mailbox "${name}" recovered successfully!`);
          setTimeout(() => {
            setCreationProgress(null);
            setShowPinPrompt(false);
            setPendingConnection(null);
            refreshMailboxes(address, newKeyPair);
          }, 1500);
          
          return;
        }
        
        // No incomplete registration found - proceed with normal availability check
        console.log('🔗 Step 2: Checking name availability...');
        
        // Validate name format first
        const nameRegex = /^[a-z0-9_]+$/;
        if (!nameRegex.test(accountName)) {
          throw new Error('Invalid name format: only lowercase letters, numbers, and underscores allowed');
        }
        
        // Check if domain exists
        const domains = await contractService.getAvailableDomains();
        console.log('📋 Available domains:', domains);
        if (!domains.includes(domain)) {
          throw new Error(`Domain "${domain}" is not available. Available domains: ${domains.join(', ')}`);
        }
        
        const isAvailable = await contractService.isNameAvailable(accountName, domain);
        console.log(`📋 Name "${accountName}@${domain}" available:`, isAvailable);
        if (!isAvailable) {
          throw new Error(`Name ${accountName}@${domain} is already taken. Please choose a different name.`);
        }
        
        // Calculate registration fee based on name length
        const fee = await contractService.calculateNameFee(accountName, domain);
        
        // Check if this wallet already has any named accounts on-chain
        const existingAccounts = await contractService.getOwnerNamedAccounts(address);
        const hasBareAccount = await contractService.hasBareAccount(address);
        const isFirstAccount = existingAccounts.length === 0 && !hasBareAccount;
        const isFreeEligible = isFirstAccount && accountName.length >= 5;
        
        console.log(`💰 Registration fee for "${accountName}" (${accountName.length} chars): ${ethers.formatEther(fee)} ETH`);
        console.log(`📊 Existing named accounts on-chain: ${existingAccounts.length}`);
        console.log(`📊 Has bare account: ${hasBareAccount ? 'YES' : 'NO'}`);
        console.log(`🎉 First account: ${isFirstAccount ? 'YES' : 'NO'}`);
        console.log(`🆓 Free eligible (5+ chars): ${isFreeEligible ? 'YES (FREE!)' : 'NO (payment required)'}`);
        
        if (!isFreeEligible && fee > 0) {
          console.log(`💳 Payment required: ${ethers.formatEther(fee)} ETH`);
        }
        
        console.log('📧 Registering named account...');
        try {
          const namedTx = await contractService.registerNamedAccount(accountName, domain, keyHex, isFreeEligible ? BigInt(0) : fee);
          await namedTx.wait();
          console.log(`✅ Named account ${accountName}@${domain} registered on blockchain`);
        } catch (regError: any) {
          console.error('❌ Account registration failed:', regError);
          
          // Try to extract meaningful error message
          let errorMsg = 'Failed to register account';
          if (regError.reason) {
            errorMsg = regError.reason;
          } else if (regError.message) {
            if (regError.message.includes('already taken')) {
              errorMsg = `Name ${accountName}@${domain} is already taken`;
            } else if (regError.message.includes('Invalid name format')) {
              errorMsg = 'Invalid name format: only lowercase letters, numbers, and underscores allowed';
            } else if (regError.message.includes('Insufficient')) {
              errorMsg = 'Insufficient registration fee';
            } else {
              errorMsg = regError.message;
            }
          }
          
          throw new Error(errorMsg);
        }
      } else {
        // No name provided, register bare account only
        const hasBare = await contractService.hasBareAccount(address);
        
        if (!hasBare) {
          console.log('📧 Registering bare account (FREE)...');
          const bareTx = await contractService.registerBareAccount(keyHex);
          await bareTx.wait();
          console.log(`✅ Bare account registered for ${address}`);
        } else {
          console.log('✅ Bare account already exists');
        }
      }
      
      // Step 3 complete - move to step 4
      setCreationProgress(prev => prev ? {
        ...prev,
        currentStep: 3,
        steps: prev.steps.map((step, idx) => ({
          ...step,
          status: idx <= 2 ? 'completed' as const : idx === 3 ? 'active' as const : step.status
        }))
      } : null);
      
      // Register keys on KeyRegistry with mailbox name
      // Check if key is already registered to avoid unnecessary transaction
      const isKeyAlreadyRegistered = await contractService.hasKey(address, keyHex);
      
      if (isKeyAlreadyRegistered) {
        const keyDetails = await contractService.getPublicKey(address, keyHex);
        console.log('✅ Mailbox public key already registered on KeyRegistry, skipping registration');
        console.log('📝 Existing mailbox name:', keyDetails.mailboxName);
      } else {
        console.log('🔗 Registering mailbox public key on KeyRegistry...');
        const tx = await contractService.registerKey(keyHex, name);
        await tx.wait();
        console.log('✅ Mailbox registered on KeyRegistry with name:', name);
      }
      
      // IMPORTANT: Only save mailbox locally AFTER all blockchain operations complete successfully
      const displayName = accountName && domain && !isFirstMailbox ? `${accountName}@${domain}` : name;
      await SimpleKeyManager.saveMailboxKeys(pin, newKeyPair, displayName, address);
      console.log('✅ New mailbox created and saved locally with name:', displayName);
      
      // Step 4 complete
      setCreationProgress(prev => prev ? {
        ...prev,
        currentStep: 4,
        steps: prev.steps.map((step, idx) => ({
          ...step,
          status: 'completed' as const
        }))
      } : null);
      
      // Update state - IMPORTANT: Set keyPair first to prevent "create mailbox" screen
      setState(prev => ({
        ...prev,
        isConnected: true,
        userAddress: address,
        keyPair: newKeyPair,
        isKeyRegistered: true
      }));
      
      // Store connection in Zustand (persists across refreshes and shows main app)
      setConnected(address);
      console.log('✅ Connection saved to Zustand after mailbox creation');
      
      // Save session if persistence is enabled
      await SessionPersistence.saveSession(address, newKeyPair);
      
      console.log(`🎉 Mailbox "${name}" created successfully!`);
      console.log('State updated with keyPair:', !!newKeyPair);
      
      // Clear any incomplete registration warnings
      setState(prev => ({
        ...prev,
        warning: ''
      }));
      
      // Wait a moment to show completion, then close and navigate to groups
      setTimeout(() => {
        setCreationProgress(null);
        setShowPinPrompt(false);
        setPendingConnection(null);
        refreshMailboxes(address, newKeyPair);
        
        // Navigate to feed tab after successful creation
        setActiveTab('feed');
        console.log('✅ Navigated to feed tab');
      }, 1500);
      
    } catch (error) {
      console.error('❌ Failed to create mailbox:', error);
      
      // Mark current step as error
      setCreationProgress(prev => prev ? {
        ...prev,
        steps: prev.steps.map((step, idx) => ({
          ...step,
          status: idx === prev.currentStep ? 'error' as const : step.status
        }))
      } : null);
      
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create mailbox'
      }));
      
      // Clear progress after showing error
      setTimeout(() => setCreationProgress(null), 3000);
    }
  };

  const switchMailbox = async (pin: string) => {
    try {
      // Regenerate keys from wallet signature + PIN
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      console.log('🔄 Regenerating keys for mailbox switch...');
      const keyPair = await SimpleKeyManager.generateDeterministicKeys(
        signer,
        address,
        pin
      );
      
      // Set loading AFTER signature is obtained
      setState(prev => ({ ...prev, loading: true }));
      
      const publicKeyHex = SimpleCryptoUtils.publicKeyToHex(keyPair.publicKey);
      console.log('🔍 Looking up account info for public key:', publicKeyHex);
      
      // Check if this account exists on-chain
      let accountExists = false;
      let accountName = '';
      
      try {
        // First check if there's a bare account with this public key
        const hasBareAccount = await contractService.hasBareAccount(address);
        if (hasBareAccount) {
          const bareAccountPubKey = await contractService.getPublicKeyByAddress(address);
          if (bareAccountPubKey.toLowerCase() === publicKeyHex.toLowerCase()) {
            accountExists = true;
            accountName = 'Bare Account';
            console.log('✅ Found matching bare account');
          }
        }
        
        // If not a bare account, check named accounts
        if (!accountExists) {
          const namedAccounts = await contractService.getOwnerNamedAccounts(address);
          console.log('📋 Found named accounts:', namedAccounts);
          
          // Match public key to find the correct named account
          for (const namedAccount of namedAccounts) {
            try {
              const accountPubKey = await contractService.getPublicKeyByName(namedAccount);
              console.log(`🔍 Checking ${namedAccount}:`);
              console.log(`   Generated key: ${publicKeyHex.toLowerCase()}`);
              console.log(`   Account key:   ${accountPubKey.toLowerCase()}`);
              console.log(`   Match: ${accountPubKey.toLowerCase() === publicKeyHex.toLowerCase()}`);
              
              if (accountPubKey.toLowerCase() === publicKeyHex.toLowerCase()) {
                accountExists = true;
                accountName = namedAccount;
                console.log('✅ Found matching named account:', accountName);
                break;
              }
            } catch (error) {
              console.warn('Could not check named account:', namedAccount, error);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error checking account existence:', error);
        // If contract service is not initialized, allow switch anyway (offline mode)
        if (error instanceof Error && error.message.includes('not initialized')) {
          console.log('⚠️ Contract service not ready, allowing offline mailbox switch');
          accountExists = true;
          accountName = 'Bare Account'; // Default name for offline mode
        }
      }
      
      // If account doesn't exist on-chain, show error
      if (!accountExists) {
        console.log('❌ No account found for this PIN + wallet combination');
        setState(prev => ({ ...prev, error: 'No account found with this PIN. Please create a new account.', loading: false }));
        return;
      }
      
      // Account exists - save and switch to this mailbox
      const displayName = accountName || 'Account';
      await SimpleKeyManager.saveMailboxKeys(pin, keyPair, displayName, address);
      SimpleKeyManager.switchMailbox(pin, address);
      
      console.log('🔄 Switching to mailbox:', displayName);
      console.log('📍 Public key:', publicKeyHex);
      
      setState(prev => ({
        ...prev,
        isConnected: true,
        userAddress: address,
        keyPair,
        isKeyRegistered: true, // We know it's registered since it exists
        loading: false
      }));
      
      // Store connection in Zustand (persists across refreshes)
      setConnected(address);
      console.log('✅ Connection saved to Zustand after mailbox switch');
      
      // Save session if persistence is enabled
      await SessionPersistence.saveSession(address, keyPair);
      
      // Refresh mailbox display - pass both address and keyPair to avoid race condition
      setTimeout(() => refreshMailboxes(address, keyPair), 100);
      setShowPinPrompt(false);
      
      console.log('✅ Switched to mailbox:', displayName);
    } catch (error) {
      console.error('❌ Failed to switch mailbox:', error);
      setState(prev => ({
        ...prev,
        loading: false
      }));
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleError = (error: string) => {
    setState(prev => ({ ...prev, error }));
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  // Handler for modal close
  const handleModalClose = () => {
    setShowPinPrompt(false);
    setPendingConnection(null);
    setState(prev => ({ ...prev, error: null }));
  };

  // Handler for modal submit (create/access)
  const handleModalSubmit = (pin: string, accountName: string, domain: string, isCreatingNew: boolean) => {
    // For bare accounts (no accountName), use a generic mailbox name
    const mailboxName = accountName ? `${accountName}@${domain}` : 'Bare Account';
    
    // Pass empty accountName and domain for bare accounts
    const finalAccountName = accountName || undefined;
    const finalDomain = accountName ? domain : undefined;
    
    createNewMailbox(pin, mailboxName, finalAccountName, finalDomain, modalContext === 'initial');
  };

  // Handler for modal switch
  const handleModalSwitch = (pin: string) => {
    switchMailbox(pin);
  };

  // Wait for Zustand to rehydrate before making any decisions
  if (!hasHydrated) {
    return (
      <div className="min-h-screen hex-grid bg-gray-900 flex items-center justify-center">
        <LoadingState message="Loading Hashd..." />
      </div>
    );
  }

  // Show passkey lock screen if enabled and locked
  if (state.isPasskeyLocked) {
    return (
      <PasskeyLockScreen 
        onUnlock={() => setState(prev => ({ ...prev, isPasskeyLocked: false }))} 
      />
    );
  }

  // Show loading screen during initial auto-connect
  if (state.loading && !state.isConnected) {
    return (
      <div className="min-h-screen hex-grid bg-gray-900 flex items-center justify-center">
        <LoadingState message="Loading Hashd..." />
      </div>
    );
  }

  // Show connect screen only if NOT connected AND not loading
  if (!state.isConnected && !state.loading) {
    // Public pages that don't need wallet connection
    const publicPages = ['/waitlist', '/verify-email', '/email-verified', '/faq', '/about', '/privacy', '/terms', '/support', '/documentation'];
    const isPublicPage = publicPages.some(page => location.pathname.startsWith(page));
    
    return (
      <>
        <ScrollToTop />
        {!isPublicPage && (
          <MailboxModal
            show={showPinPrompt}
            modalContext={modalContext}
            incompleteRegistration={incompleteRegistration}
            creationProgress={creationProgress}
            loading={state.loading}
            error={state.error}
            userAddress={state.userAddress}
            onClose={handleModalClose}
            onSubmit={handleModalSubmit}
            onSwitch={handleModalSwitch}
          />
        )}
        <Routes>
          <Route path="/waitlist" element={<Waitlist />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/email-verified" element={<EmailVerified />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/support" element={<Support />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="*" element={
            <Landing
              onConnect={connectWallet}
              loading={state.loading}
              error={state.error}
              onClearError={clearError}
            />
          } />
        </Routes>
      </>
    );
  }

  // Show loading screen during initialization
  if (state.loading) {
    return (
      <div className="min-h-screen hex-grid bg-gray-900 flex items-center justify-center">
        <LoadingState message="Connecting to your secure mailbox..." />
      </div>
    );
  }



  return (
    <>
      <ScrollToTop />
      <MailboxModal
        show={showPinPrompt}
        modalContext={modalContext}
        incompleteRegistration={incompleteRegistration}
        creationProgress={creationProgress}
        loading={state.loading}
        error={state.error}
        userAddress={state.userAddress}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        onSwitch={handleModalSwitch}
      />
      <div className="min-h-screen cyber-bg flex flex-col overflow-x-hidden w-full relative">
        <div className="absolute inset-0 opacity-5 hex-grid pointer-events-none"></div>
        <div className="relative z-10 flex flex-col min-h-screen">
        <Header 
          userAddress={state.userAddress}
          onDisconnect={() => setShowLogoutModal(true)}
          onLogoClick={() => {
            setActiveTab('feed');
            setShowCompose(false);
            navigate('/');
          }}
          onWalletClick={() => {
            navigate('/account');
            setActiveTab('account');
          }}
          onSettingsClick={() => {
            navigate('/settings');
            setActiveTab('settings');
          }}
          onMessagesClick={() => {
            navigate('/messages');
            setActiveTab('messages');
            setShowCompose(false);
          }}
          onMegaClick={() => {
            navigate('/system');
          }}
        />
        
        {/* Error/Warning Messages */}
        <div className="max-w-7xl mx-auto">{/* Only for errors/warnings */}
        {state.error && (
          <div className="mx-6 mt-6 bg-error-50 border border-error-200 rounded-lg p-4 animate-slide-up">
            <p className="text-error-800 text-sm">{state.error}</p>
            <button
              onClick={clearError}
              className="text-error-600 hover:text-error-800 text-sm mt-2 transition-colors font-medium"
            >
              Dismiss
            </button>
          </div>
        )}
        
        {state.warning && (
          <div className="mx-6 mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 animate-slide-up">
            <p className="text-amber-800 text-sm">{state.warning}</p>
            <button
              onClick={() => setState(prev => ({ ...prev, warning: null }))}
              className="text-amber-600 hover:text-amber-800 text-sm mt-2 transition-colors font-medium"
            >
              Dismiss
            </button>
          </div>
        )}
        </div>

        {/* Navigation Tabs - Removed, using header icons instead */}

        {/* Tab Content */}
        <div className="flex-1">
          <Routes>
            <Route path="/" element={
              <Feed
                refreshTrigger={groupRefreshTrigger}
                showCreateGroupModal={showCreateGroupModal}
                userAddress={state.userAddress}
                onCreateClick={() => setShowCreateGroupModal(true)}
                onCloseModal={() => setShowCreateGroupModal(false)}
                onGroupCreated={() => {
                  setGroupRefreshTrigger(prev => prev + 1);
                }}
              />
            } />
            <Route path="/guild/:address" element={<Group />} />
            <Route path="/group/:groupAddress/post/:postId" element={
              <PostDetails
                contractService={contractService}
                userAddress={state.userAddress}
              />
            } />
            <Route path="/messages" element={
              <MessageList
                userAddress={state.userAddress}
                keyPair={state.keyPair!}
                onError={handleError}
                onCompose={() => setShowCompose(true)}
                currentMailboxName={currentMailbox?.name}
                onSwitchMailbox={() => {
                  setModalContext('switch');
                  setShowPinPrompt(true);
                }}
              />
            } />
            <Route path="/account" element={
              <Account
                currentMailbox={currentMailbox}
                mailboxes={mailboxes}
                isKeyRegistered={state.isKeyRegistered}
                loading={state.loading}
                keyPair={state.keyPair}
                userAddress={state.userAddress}
                onSetupMailbox={() => {
                  setModalContext('initial');
                  setShowPinPrompt(true);
                }}
                onCompleteSetup={registerKey}
                onSwitchOrCreate={() => {
                  console.log('🔄 Opening switch mailbox modal');
                  setModalContext('switch');
                  setShowPinPrompt(true);
                }}
                onSwitchMailbox={switchMailbox}
                onRefreshMailboxes={refreshMailboxes}
              />
            } />
            <Route path="/settings" element={
              <Settings 
                accountAbstraction={accountAbstraction}
              />
            } />
            <Route path="/system" element={
              <SystemInfo 
                onError={handleError}
              />
            } />
          </Routes>
        </div>

      {/* Force Mailbox Selection - Shows when connected but no active mailbox */}
      {state.isConnected && !currentMailbox && mailboxes.length > 0 && (
        <ForceMailboxSelection
          mailboxes={mailboxes}
          onSelectMailbox={() => {
            setModalContext('switch');
            setShowPinPrompt(true);
          }}
          onLogout={() => {
            setShowLogoutModal(true);
          }}
        />
      )}

      {/* Mailbox Switcher */}
      {state.isConnected && (
        <MailboxSwitcher
          mailboxes={mailboxes}
          userAddress={state.userAddress}
          onSwitch={switchMailbox}
          onCompleteIncomplete={() => {
            setModalContext('create');
            setShowPinPrompt(true);
          }}
          onShowWarning={(message) => {
            setState(prev => ({ ...prev, warning: message }));
          }}
        />
      )}

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />

      {/* Compose Message Modal */}
      <NeonModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        title="Compose Message"
        icon={Mail}
        maxWidth="2xl"
      >
        <div className="p-6">

          <SendMessage
            userAddress={state.userAddress}
            keyPair={state.keyPair!}
            onError={handleError}
            onMessageSent={(threadId) => {
              setShowCompose(false);
              if (threadId) {
                // Store threadId to open after navigation
                sessionStorage.setItem('openThread', threadId);
                // Navigate to messages page
                navigate('/messages');
              }
            }}
            sessionEnabled={accountAbstraction.isEnabled}
            onSendWithSession={accountAbstraction.sendMessageWithSessionKey}
          />
        </div>
      </NeonModal>

      {/* Footer */}
      <Footer provider={contractService.getReadProvider()} />
      </div>
      </div>
    </>
  );
}

// Wrap App with ToastProvider
function AppWithToast() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}

export default AppWithToast;
