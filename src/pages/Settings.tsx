import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, AlertTriangle, RefreshCw, Cloud, Check, X, Shield, Fingerprint, Lock } from 'lucide-react';
import { SessionManager } from '../components/SessionManager';
import { useAccountAbstraction } from '../hooks/useAccountAbstraction';
import { PageHeader } from '../components/PageHeader';
import { SimpleKeyManager } from '../utils/crypto-simple';
import { resetAndReload } from '../utils/resetApp';
import { useSettingsStore } from '../store/settingsStore';
import { IPFSProvider, ipfsUploadService } from '../services/ipfs/userCredentials';
import { isPasskeySupported, hasPasskey, registerPasskey, removePasskey } from '../services/passkeyService';
import { SessionKeyManager } from '../utils/session-key-manager';

interface SettingsProps {
  accountAbstraction: {
    isEnabled: boolean;
    isCreatingSession: boolean;
    error: string | null;
    getSessionInfo: () => any;
    sessionProgress: any;
    createSessionKey: (durationMinutes?: number) => Promise<boolean>;
    clearSessionKey: () => void;
    clearSessionProgress: () => void;
  };
}

export const Settings: React.FC<SettingsProps> = ({ accountAbstraction }) => {
  const { 
    rpcUrl,
    ipfsGateway,
    ipfsCredentials,
    passkeyProtectionEnabled,
    setRpcUrl,
    setIPFSGateway,
    setIPFSCredentials,
    setPasskeyProtectionEnabled,
    resetToDefaults 
  } = useSettingsStore();
  
  const [rpcInput, setRpcInput] = useState(rpcUrl);
  const [rpcSaved, setRpcSaved] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // IPFS settings
  const [ipfsGatewayInput, setIpfsGatewayInput] = useState(ipfsGateway);
  const [ipfsGatewaySaved, setIpfsGatewaySaved] = useState(false);
  const [ipfsProvider, setIpfsProvider] = useState<IPFSProvider>(ipfsCredentials?.provider || 'none');
  const [ipfsApiKey, setIpfsApiKey] = useState(ipfsCredentials?.apiKey || '');
  const [ipfsSaved, setIpfsSaved] = useState(false);
  const [ipfsTesting, setIpfsTesting] = useState(false);
  const [ipfsTestResult, setIpfsTestResult] = useState<'success' | 'error' | null>(null);
  
  // Passkey settings
  const [passkeySupported] = useState(isPasskeySupported());
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  
  // Session persistence settings
  const [sessionPersistenceEnabled, setSessionPersistenceEnabled] = useState(
    SessionKeyManager.isSessionPersistenceEnabled()
  );

  const handleSaveRpc = () => {
    setRpcUrl(rpcInput);
    setRpcSaved(true);
    setTimeout(() => setRpcSaved(false), 2000);
  };

  const handleSaveIPFSGateway = () => {
    setIPFSGateway(ipfsGatewayInput);
    setIpfsGatewaySaved(true);
    setTimeout(() => setIpfsGatewaySaved(false), 2000);
  };

  const handleReset = () => {
    resetToDefaults();
    setRpcInput(process.env.REACT_APP_RPC_URL || 'http://localhost:8545');
    setIpfsGatewayInput(process.env.REACT_APP_IPFS_GATEWAY || 'https://3oh.myfilebase.com/ipfs');
    setIpfsProvider('none');
    setIpfsApiKey('');
  };

  const handleSaveIPFS = () => {
    const credentials = ipfsProvider === 'none' ? null : {
      provider: ipfsProvider,
      apiKey: ipfsApiKey
    };
    
    console.log('💾 Saving IPFS credentials:', credentials);
    setIPFSCredentials(credentials);
    
    // Verify it was saved
    setTimeout(() => {
      const saved = useSettingsStore.getState().ipfsCredentials;
      console.log('✅ Verified saved credentials:', saved);
    }, 100);
    
    setIpfsSaved(true);
    setTimeout(() => setIpfsSaved(false), 2000);
  };

  const handleTestIPFS = async () => {
    if (ipfsProvider === 'none' || !ipfsApiKey) {
      return;
    }

    setIpfsTesting(true);
    setIpfsTestResult(null);

    try {
      const success = await ipfsUploadService.testCredentials({
        provider: ipfsProvider,
        apiKey: ipfsApiKey
      });

      setIpfsTestResult(success ? 'success' : 'error');
    } catch (error) {
      setIpfsTestResult('error');
    } finally {
      setIpfsTesting(false);
      setTimeout(() => setIpfsTestResult(null), 3000);
    }
  };

  const handleTogglePasskeyProtection = async (enabled: boolean) => {
    setPasskeyError(null);

    if (enabled) {
      // Enabling passkey protection - register a new passkey
      setIsRegisteringPasskey(true);
      
      try {
        const userIdentifier = `hashd-${Date.now()}`;
        const result = await registerPasskey(userIdentifier);
        
        if (result.success) {
          setPasskeyProtectionEnabled(true);
        } else {
          setPasskeyError(result.error || 'Failed to register passkey');
        }
      } catch (error) {
        setPasskeyError('An unexpected error occurred');
      } finally {
        setIsRegisteringPasskey(false);
      }
    } else {
      // Disabling passkey protection - remove the passkey
      removePasskey();
      setPasskeyProtectionEnabled(false);
    }
  };

  const handleToggleSessionPersistence = (enabled: boolean) => {
    if (enabled) {
      SessionKeyManager.enableSessionPersistence();
      setSessionPersistenceEnabled(true);
      console.log('✅ [Settings] Session persistence enabled');
    } else {
      SessionKeyManager.disableSessionPersistence();
      setSessionPersistenceEnabled(false);
      console.log('🔒 [Settings] Session persistence disabled');
    }
  };

  const handleClearAllData = () => {
    setShowClearConfirm(false);
    resetAndReload();
  };

  return (
    <div className="min-h-screen hex-grid bg-gray-900">
      <PageHeader
        icon={SettingsIcon}
        title="SETTINGS"
        subtitle="CONFIGURE.YOUR.EXPERIENCE"
      />

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* SECURITY SETTINGS SECTION */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold neon-text-cyan uppercase tracking-wider font-mono flex items-center gap-3">
              <Shield className="w-6 h-6" />
              Security Settings
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Configure authentication, session management, and security features
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Account Abstraction / Session Keys */}
            <div>
              <SessionManager
                isEnabled={accountAbstraction.isEnabled}
                isCreatingSession={accountAbstraction.isCreatingSession}
                error={accountAbstraction.error}
                sessionInfo={accountAbstraction.getSessionInfo()}
                sessionProgress={accountAbstraction.sessionProgress}
                onCreateSession={accountAbstraction.createSessionKey}
                onClearSession={accountAbstraction.clearSessionKey}
                onClearProgress={accountAbstraction.clearSessionProgress}
              />
            </div>

            {/* Passkey Protection */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Fingerprint className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider font-mono">
                    Passkey Protection
                  </h3>
                </div>
                <p className="text-sm text-gray-400">
                  Require biometric authentication (fingerprint, face ID) to access the app
                </p>
              </div>

              {!passkeySupported ? (
                <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm text-yellow-400">
                    Passkeys are not supported in your browser. Please use a modern browser with WebAuthn support.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Fingerprint className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="text-sm font-bold text-white font-mono">
                          {passkeyProtectionEnabled ? 'ENABLED' : 'DISABLED'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {passkeyProtectionEnabled 
                            ? 'App is locked on reload' 
                            : 'No protection active'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTogglePasskeyProtection(!passkeyProtectionEnabled)}
                      disabled={isRegisteringPasskey}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        passkeyProtectionEnabled ? 'bg-cyan-500' : 'bg-gray-600'
                      } ${isRegisteringPasskey ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          passkeyProtectionEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Error Message */}
                  {passkeyError && (
                    <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                      <p className="text-sm text-red-400">{passkeyError}</p>
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
                    <p className="text-xs text-gray-400">
                      When enabled, you'll need to authenticate with your device's biometrics 
                      (fingerprint, face ID, etc.) every time the app reloads. This adds an extra 
                      layer of security to protect your data.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Session Persistence */}
            <div className="bg-gray-800/50 rounded-lg p-6 lg:col-span-2">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider font-mono">
                    Session Persistence
                  </h3>
                </div>
                <p className="text-sm text-gray-400">
                  Keep your session active until browser close
                </p>
              </div>

              <div className="space-y-4">
                {/* Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-sm font-bold text-white font-mono">
                        {sessionPersistenceEnabled ? 'ENABLED' : 'DISABLED'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {sessionPersistenceEnabled 
                          ? 'Session persists until browser close' 
                          : 'PIN required on every refresh'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleSessionPersistence(!sessionPersistenceEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      sessionPersistenceEnabled ? 'bg-cyan-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        sessionPersistenceEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Info */}
                <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    <strong className="text-cyan-400">How it works:</strong> When enabled, your session key is encrypted 
                    using a non-exportable browser key and stored in sessionStorage. You won't need to re-enter your PIN 
                    on page refresh, but the session automatically clears when you close the browser.
                  </p>
                </div>

                {sessionPersistenceEnabled && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-green-300 leading-relaxed">
                        <strong>Active:</strong> Your session is encrypted and stored in sessionStorage. 
                        Your PIN and mailbox keys are still never stored—only the encrypted session key.
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Note */}
                <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-gray-300 font-mono leading-relaxed">
                    <strong className="text-yellow-400">🔒 Security:</strong> Even with persistence enabled, 
                    your PIN and mailbox keys are <strong>never stored</strong>. Only the session key is encrypted 
                    and cached. The browser encryption key is non-exportable, providing strong protection even in XSS scenarios.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ADVANCED SETTINGS SECTION */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold neon-text-cyan uppercase tracking-wider font-mono flex items-center gap-3">
              <SettingsIcon className="w-6 h-6" />
              Advanced Settings
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Configure RPC endpoints, IPFS gateways, and upload methods
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* RPC URL Setting */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
                RPC Endpoint
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Configure the RPC endpoint for blockchain interactions. 
                Changes will take effect on next wallet connection.
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
                  RPC URL
                </label>
                <input
                  type="text"
                  value={rpcInput}
                  onChange={(e) => setRpcInput(e.target.value)}
                  placeholder="https://carrot.megaeth.com/rpc"
                  className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white font-mono text-sm focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleSaveRpc}
                  disabled={rpcInput === rpcUrl}
                  className="px-6 py-2.5 bg-cyan-500/10 hover:border-cyan-500/50 neon-text-cyan rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold font-mono"
                >
                  {rpcSaved ? '✓ SAVED' : 'SAVE'}
                </button>
                <button
                  onClick={() => setRpcInput(rpcUrl)}
                  disabled={rpcInput === rpcUrl}
                  className="px-6 py-2.5 bg-gray-700/50 hover:border-gray-500/50 text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold font-mono"
                >
                  CANCEL
                </button>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-cyan-500/10">
              <p className="text-xs text-gray-400 font-mono">
                <strong className="neon-text-cyan">CURRENT:</strong> {rpcUrl}
              </p>
              <p className="text-xs text-gray-400 font-mono mt-1">
                <strong className="neon-text-cyan">DEFAULT:</strong> {process.env.REACT_APP_RPC_URL || 'http://localhost:8545'}
              </p>
            </div>
          </div>


          {/* IPFS Gateway Settings */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider font-mono">
                  IPFS Gateway
                </h3>
              </div>
              <p className="text-sm text-gray-400">
                Gateway used to fetch content from IPFS. Change this if you prefer a different gateway.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={ipfsGatewayInput}
                onChange={(e) => setIpfsGatewayInput(e.target.value)}
                placeholder="https://ipfs.io/ipfs"
                className="flex-1 px-4 py-3 bg-gray-900/50 rounded-lg text-white font-mono text-sm focus:border-cyan-500 focus:outline-none transition-colors"
              />
              <button
                onClick={handleSaveIPFSGateway}
                className={`px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all font-mono text-sm ${
                  ipfsGatewaySaved
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30'
                }`}
              >
                {ipfsGatewaySaved ? <Check className="w-5 h-5" /> : 'SAVE'}
              </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-cyan-500/10">
              <p className="text-xs text-gray-400 font-mono">
                <strong className="neon-text-cyan">CURRENT:</strong> {ipfsGateway}
              </p>
              <p className="text-xs text-gray-400 font-mono mt-1">
                <strong className="neon-text-cyan">DEFAULT:</strong> {process.env.REACT_APP_IPFS_GATEWAY || 'https://3oh.myfilebase.com/ipfs'}
              </p>
              <div className="mt-3">
                <p className="text-xs text-gray-500 font-mono mb-2">Quick select:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const defaultGateway = process.env.REACT_APP_IPFS_GATEWAY || 'https://3oh.myfilebase.com/ipfs';
                      setIpfsGatewayInput(defaultGateway);
                      setIPFSGateway(defaultGateway);
                      setIpfsGatewaySaved(true);
                      setTimeout(() => setIpfsGatewaySaved(false), 2000);
                    }}
                    className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-400 rounded text-xs font-mono transition-all font-bold"
                  >
                    SET DEFAULT
                  </button>
                  {[
                    { name: 'ipfs.io', url: 'https://ipfs.io/ipfs' },
                    { name: 'cloudflare-ipfs.com', url: 'https://cloudflare-ipfs.com/ipfs' },
                    { name: 'dweb.link', url: 'https://dweb.link/ipfs' }
                  ].map((gateway) => (
                    <button
                      key={gateway.name}
                      onClick={() => {
                        setIpfsGatewayInput(gateway.url);
                        setIPFSGateway(gateway.url);
                        setIpfsGatewaySaved(true);
                        setTimeout(() => setIpfsGatewaySaved(false), 2000);
                      }}
                      className="px-3 py-1.5 bg-gray-700/50 hover:bg-cyan-500/20 border border-gray-600 hover:border-cyan-500/50 text-gray-400 hover:text-cyan-400 rounded text-xs font-mono transition-all"
                    >
                      {gateway.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* IPFS Upload Settings */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider font-mono">
                  IPFS Upload Method
                </h3>
              </div>
              <p className="text-sm text-gray-400">
                Configure how your encrypted messages are uploaded to IPFS. 
                Bring your own API keys for maximum privacy and control.
              </p>
            </div>

            <div className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
                  Upload Provider
                </label>
                <select
                  value={ipfsProvider}
                  onChange={(e) => setIpfsProvider(e.target.value as IPFSProvider)}
                  className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white font-mono text-sm focus:border-cyan-500 focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="none">Use Relayer (Default - Free)</option>
                  <option value="pinata">Pinata (Bring Your Own Key)</option>
                </select>
                <p className="text-xs text-gray-400 mt-2 font-mono">
                  {ipfsProvider === 'none' && '✓ Messages uploaded via Hashd relayer (easiest option)'}
                  {ipfsProvider === 'pinata' && '🔒 Upload directly to your Pinata account (more private)'}
                </p>
              </div>

              {/* API Key Input (shown for Pinata) */}
              {ipfsProvider === 'pinata' && (
                <>
                  <div>
                    <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
                      Pinata JWT Token
                    </label>
                    <input
                      type="password"
                      value={ipfsApiKey}
                      onChange={(e) => setIpfsApiKey(e.target.value)}
                      placeholder="Enter your Pinata JWT token"
                      className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white font-mono text-sm focus:border-cyan-500 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Help Text */}
                  <div className="p-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg">
                    <p className="text-xs text-gray-300 font-mono">
                      <strong className="neon-text-cyan">📝 How to get your Pinata JWT:</strong><br/>
                      1. Sign up at <a href="https://pinata.cloud" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">pinata.cloud</a><br/>
                      2. Go to API Keys → New Key<br/>
                      3. Give it a name (e.g., "hashd")<br/>
                      4. ⚠️ IMPORTANT: Toggle <strong>"Admin"</strong> ON<br/>
                      &nbsp;&nbsp;&nbsp;(Or manually enable "pinFileToIPFS" under Legacy Endpoints)<br/>
                      5. Click "Generate Key"<br/>
                      6. Copy the <strong>JWT token</strong> (starts with "eyJ...") and paste above
                    </p>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveIPFS}
                  className="px-6 py-2.5 bg-cyan-500/10 hover:border-cyan-500/50 neon-text-cyan rounded-lg transition-all text-sm font-bold font-mono"
                >
                  {ipfsSaved ? '✓ SAVED' : 'SAVE'}
                </button>

                {ipfsProvider !== 'none' && ipfsApiKey && (
                  <button
                    onClick={handleTestIPFS}
                    disabled={ipfsTesting}
                    className="px-6 py-2.5 bg-gray-700/50 hover:border-gray-500/50 text-gray-300 rounded-lg disabled:opacity-50 transition-all text-sm font-bold font-mono flex items-center gap-2"
                  >
                    {ipfsTesting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {ipfsTestResult === 'success' && <Check className="w-4 h-4 text-green-400" />}
                    {ipfsTestResult === 'error' && <X className="w-4 h-4 text-red-400" />}
                    {ipfsTesting ? 'TESTING...' : 'TEST CONNECTION'}
                  </button>
                )}
              </div>

              {/* Current Status */}
              <div className="pt-4 border-t border-cyan-500/10">
                <p className="text-xs text-gray-400 font-mono">
                  <strong className="neon-text-cyan">CURRENT:</strong>{' '}
                  {ipfsCredentials?.provider === 'pinata' && 'Using your Pinata account'}
                  {(!ipfsCredentials || ipfsCredentials.provider === 'none') && 'Using Hashd relayer (default)'}
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* DATA MANAGEMENT SECTION */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-red-400 uppercase tracking-wider font-mono flex items-center gap-3">
              <AlertTriangle className="w-6 h-6" />
              Data Management
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Clear local data and reset settings
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Clear All Data */}
            <div className="bg-gray-800/50 border border-red-500/30 rounded-lg p-6">
              {!showClearConfirm ? (
              <div className="space-y-3">
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <h4 className="text-sm font-bold text-red-400 mb-1 font-mono uppercase">
                    Clear All Keys & Mailboxes
                  </h4>
                  <p className="text-xs text-gray-300 mb-3">
                    Remove all mailboxes, encryption keys, and settings from this device. 
                    This action cannot be undone. You will need your PINs to recreate your mailboxes.
                  </p>
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="px-4 py-2 bg-red-500/20 border border-red-500/50 hover:border-red-500 text-red-400 rounded-lg transition-all text-sm font-bold font-mono w-full"
                  >
                    CLEAR ALL DATA
                  </button>
                </div>

                <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-gray-300 font-mono">
                    <strong>⚠️ Important:</strong> Your mailboxes are deterministic. As long as you remember your PINs 
                    and have access to your wallet, you can recreate your mailboxes on any device.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-red-900/30 border-2 border-red-500/50 rounded-lg">
                  <h4 className="text-sm font-bold text-red-400 mb-2 font-mono uppercase">
                    ⚠️ Are you absolutely sure?
                  </h4>
                  <p className="text-xs text-gray-200 mb-3">
                    This will permanently delete:
                  </p>
                  <ul className="text-xs text-gray-200 mb-3 space-y-1 ml-4 font-mono">
                    <li>• All mailbox keys stored on this device</li>
                    <li>• All mailbox names and PINs</li>
                    <li>• All application settings</li>
                  </ul>
                  <p className="text-xs text-gray-200 font-semibold mb-3 font-mono">
                    You will need to reconnect your wallet and re-enter your PINs to access your mailboxes again.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 px-4 py-2 bg-gray-700/50 hover:border-gray-500/50 text-gray-300 rounded-lg transition-all text-sm font-bold font-mono"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={handleClearAllData}
                      className="flex-1 px-4 py-2 bg-red-500/20 border border-red-500/50 hover:border-red-500 text-red-400 rounded-lg transition-all text-sm font-bold font-mono"
                    >
                      YES, CLEAR EVERYTHING
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>

            {/* Reset to Defaults */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold neon-text-cyan uppercase tracking-wider mb-1 font-mono">
                    Reset Settings
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    Restore all settings to their default values
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-red-500/20 border border-red-500/50 hover:border-red-500 text-red-400 rounded-lg transition-all text-sm font-bold font-mono"
                >
                  RESET
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
