/**
 * Passkey Protection Component
 * 
 * Allows users to enable/disable biometric authentication (fingerprint, face ID)
 */

import React, { useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { isPasskeySupported, registerPasskey, removePasskey } from '../../services/passkeyService';

export const PasskeyProtection: React.FC = () => {
  const { passkeyProtectionEnabled, setPasskeyProtectionEnabled } = useSettingsStore();
  const [passkeySupported] = useState(isPasskeySupported());
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  const handleTogglePasskeyProtection = async (enabled: boolean) => {
    setPasskeyError(null);
    
    if (enabled) {
      // Enabling passkey protection - need to register a passkey first
      setIsRegisteringPasskey(true);
      try {
        const userIdentifier = `hashd-${Date.now()}`;
        const result = await registerPasskey(userIdentifier);
        if (result.success) {
          setPasskeyProtectionEnabled(true);
        } else {
          setPasskeyError(result.error || 'Failed to register passkey. Please try again.');
        }
      } catch (error: any) {
        console.error('Passkey registration error:', error);
        setPasskeyError(error.message || 'Failed to register passkey');
      } finally {
        setIsRegisteringPasskey(false);
      }
    } else {
      // Disabling passkey protection - remove the passkey
      removePasskey();
      setPasskeyProtectionEnabled(false);
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
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
  );
};
