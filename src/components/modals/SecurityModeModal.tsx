import React, { useState, useEffect } from 'react';
import { X, Shield, Lock, Unlock, Info } from 'lucide-react';
import { SessionKeyManager } from '../../utils/session-key-manager';

interface SecurityModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModeSelected?: (enabled: boolean) => void;
}

export const SecurityModeModal: React.FC<SecurityModeModalProps> = ({
  isOpen,
  onClose,
  onModeSelected
}) => {
  const [persistenceEnabled, setPersistenceEnabled] = useState(false);

  useEffect(() => {
    // Load current session persistence setting
    const enabled = SessionKeyManager.isSessionPersistenceEnabled();
    setPersistenceEnabled(enabled);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTogglePersistence = (enabled: boolean) => {
    if (enabled) {
      SessionKeyManager.enableSessionPersistence();
      console.log('✅ [SecurityModal] Session persistence enabled via modal');
    } else {
      SessionKeyManager.disableSessionPersistence();
      console.log('🔒 [SecurityModal] Session persistence disabled via modal');
    }
    
    setPersistenceEnabled(enabled);
    
    if (onModeSelected) {
      onModeSelected(enabled);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-gray-900 rounded-lg border border-cyan-500/30 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-cyan-500/20 bg-gray-800/50">
          <div className="flex items-center gap-4">
            <Shield className="w-8 h-8 text-cyan-400" />
            <div>
              <h2 className="text-xl font-bold font-mono text-cyan-400">
                SESSION SECURITY
              </h2>
              <p className="text-sm text-gray-400 font-mono mt-1">
                Configure session persistence settings
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Security Notice */}
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-cyan-400 font-mono">
                  <strong>SECURITY MODEL:</strong> Your PIN and mailbox keys are <strong>never stored</strong> anywhere.
                </p>
                <p className="text-xs text-gray-400 font-mono">
                  Keys exist only in memory (RAM). Session persistence encrypts only the session key using a non-exportable browser key.
                  <strong className="text-cyan-400"> Your wallet and mailbox keys remain secure.</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Persistence Options */}
          <div className="space-y-4">
            {/* Persistence Enabled */}
            <button
              onClick={() => handleTogglePersistence(true)}
              className={`w-full p-5 rounded-lg border-2 transition-all text-left ${
                persistenceEnabled
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-700 hover:border-cyan-500/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  persistenceEnabled ? 'bg-cyan-500/20' : 'bg-gray-800'
                }`}>
                  <Unlock className={`w-6 h-6 ${
                    persistenceEnabled ? 'text-cyan-400' : 'text-gray-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-cyan-400 font-mono">
                      CONVENIENCE MODE
                    </h3>
                    <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-xs font-mono text-cyan-400">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mb-3">
                    Session key encrypted and stored in <strong className="text-cyan-400">sessionStorage</strong>
                  </p>
                  <div className="space-y-1 text-xs text-gray-400 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span>No PIN required on page refresh</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span>Auto-cleared on browser close</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span>Session key encrypted with non-exportable browser key</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span>PIN and mailbox keys never stored</span>
                    </div>
                  </div>
                </div>
              </div>
            </button>

            {/* Persistence Disabled */}
            <button
              onClick={() => handleTogglePersistence(false)}
              className={`w-full p-5 rounded-lg border-2 transition-all text-left ${
                !persistenceEnabled
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-gray-700 hover:border-green-500/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  !persistenceEnabled ? 'bg-green-500/20' : 'bg-gray-800'
                }`}>
                  <Lock className={`w-6 h-6 ${
                    !persistenceEnabled ? 'text-green-400' : 'text-gray-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-green-400 font-mono mb-2">
                    MAXIMUM PARANOIA
                  </h3>
                  <p className="text-sm text-gray-300 mb-3">
                    Session keys held in <strong className="text-green-400">RAM only</strong> — zero persistence
                  </p>
                  <div className="space-y-1 text-xs text-gray-400 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span>No storage writes — ever</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span>Session wiped on page reload</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400">⚠</span>
                      <span>PIN required on every refresh</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span>Maximum protection against XSS</span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors text-cyan-400 font-mono text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
