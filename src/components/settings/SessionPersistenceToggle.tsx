/**
 * Session Persistence Toggle Component
 * 
 * Allows users to enable/disable session persistence (remember until browser close)
 */

import React from 'react';
import { useSecureMailbox } from '../../hooks/useSecureMailbox';
import { Lock, Check } from 'lucide-react';

export const SessionPersistenceToggle: React.FC = () => {
  const {
    isSessionPersistenceEnabled,
    enableSessionPersistence,
    disableSessionPersistence
  } = useSecureMailbox();
  
  const handleToggle = () => {
    if (isSessionPersistenceEnabled) {
      disableSessionPersistence();
    } else {
      enableSessionPersistence();
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
                {isSessionPersistenceEnabled ? 'ENABLED' : 'DISABLED'}
              </p>
              <p className="text-xs text-gray-400">
                {isSessionPersistenceEnabled 
                  ? 'Session persists until browser close' 
                  : 'PIN required on every refresh'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isSessionPersistenceEnabled ? 'bg-cyan-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isSessionPersistenceEnabled ? 'translate-x-6' : 'translate-x-1'
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

        {isSessionPersistenceEnabled && (
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
  );
};
