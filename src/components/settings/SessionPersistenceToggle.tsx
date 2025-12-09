/**
 * Session Persistence Toggle Component
 * 
 * Allows users to toggle between:
 * - OFF: keyPair in RAM only, lost on refresh
 * - ON: keyPair in RAM + sessionStorage, survives refresh until browser close
 */

import React, { useState } from 'react';
import { SessionPersistence } from '../../utils/session-persistence';
import { Lock, Check } from 'lucide-react';
import { CryptoKeyPair } from '../../utils/crypto-simple';

interface SessionPersistenceToggleProps {
  walletAddress?: string;
  keyPair?: CryptoKeyPair | null;
}

export const SessionPersistenceToggle: React.FC<SessionPersistenceToggleProps> = ({
  walletAddress,
  keyPair
}) => {
  const [isEnabled, setIsEnabled] = useState(SessionPersistence.isEnabled());
  
  const handleToggle = () => {
    if (isEnabled) {
      // Turning OFF: clear sessionStorage, keep RAM only
      console.log('🔄 [Toggle] Disabling persistence...');
      SessionPersistence.disable();
      setIsEnabled(false);
    } else {
      // Turning ON: save current keyPair to sessionStorage
      console.log('🔄 [Toggle] Enabling persistence...');
      console.log('🔄 [Toggle] walletAddress:', walletAddress);
      console.log('🔄 [Toggle] keyPair:', keyPair ? 'EXISTS' : 'NULL');
      SessionPersistence.enable();
      if (walletAddress && keyPair) {
        SessionPersistence.saveSession(walletAddress, keyPair);
        console.log('✅ [Toggle] Session saved');
      } else {
        console.log('⚠️ [Toggle] No walletAddress or keyPair to save!');
      }
      setIsEnabled(true);
    }
  };
  
  return (
    <div className="bg-gray-800/50 rounded-lg p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
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
                {isEnabled ? 'ENABLED' : 'DISABLED'}
              </p>
              <p className="text-xs text-gray-400">
                {isEnabled 
                  ? 'Session persists until browser close' 
                  : 'PIN required on every refresh'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isEnabled ? 'bg-cyan-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Info */}
        <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
          <p className="text-xs text-gray-400 leading-relaxed">
            <strong className="text-cyan-400">How it works:</strong> When enabled, your keyPair is stored 
            in sessionStorage. You won't need to re-enter your PIN on page refresh, but the session 
            automatically clears when you close the browser.
          </p>
        </div>

        {isEnabled && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-green-300 leading-relaxed">
                <strong>Active:</strong> Your session is stored in sessionStorage. 
                Your PIN is never stored—only the keyPair for message encryption.
              </div>
            </div>
          </div>
        )}

      
      </div>
    </div>
  );
};
