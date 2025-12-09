/**
 * Data Management Component
 * 
 * Allows users to clear local data and reset settings
 */

import React, { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { resetAndReload } from '../../utils/resetApp';

export const DataManagement: React.FC = () => {
  const { resetToDefaults } = useSettingsStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearAllData = () => {
    setShowClearConfirm(false);
    resetAndReload();
  };

  const handleReset = () => {
    resetToDefaults();
  };

  return (
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
  );
};
