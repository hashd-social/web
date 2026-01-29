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
    <div className="card">
      <div className="mb-4">
        <h3 className="text-title mb-2">Session Persistence</h3>
        <p className="text-body">Keep your session active until browser close</p>
      </div>

      <div className="space-y-4">
        {/* Toggle Row */}
        <div className="flex-between p-4 bg-elevated rounded-lg">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-neon-primary" />
            <div>
              <p className="text-data-highlight">
                {isEnabled ? 'ENABLED' : 'DISABLED'}
              </p>
              <p className="text-muted">
                {isEnabled 
                  ? 'Session persists until browser close' 
                  : 'PIN required on every refresh'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            className={`btn-toggle ${isEnabled ? 'active' : ''}`}
            aria-pressed={isEnabled}
          >
            <span className="btn-toggle-knob" />
          </button>
        </div>

        {/* Info Alert */}
        <div className="alert-info">
          <p className="alert-text">
            <strong className="text-info">How it works:</strong> When enabled, your keyPair is stored 
            in sessionStorage. You won't need to re-enter your PIN on page refresh, but the session 
            automatically clears when you close the browser.
          </p>
        </div>

        {/* Success Alert (conditional) */}
        {isEnabled && (
          <div className="alert-success">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
              <p className="alert-text">
                <strong>Active:</strong> Your session is stored in sessionStorage. 
                Your PIN is never stored — only the keyPair for message encryption.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
