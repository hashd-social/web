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
      <div className="card" style={{ borderColor: 'var(--color-error-border)' }}>
        {!showClearConfirm ? (
          <div className="space-y-3">
            <div className="alert-error">
              <h4 className="alert-title">Clear All Keys & Mailboxes</h4>
              <p className="alert-text mb-3">
                Remove all mailboxes, encryption keys, and settings from this device. 
                This action cannot be undone. You will need your PINs to recreate your mailboxes.
              </p>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="btn btn-danger btn-block"
              >
                CLEAR ALL DATA
              </button>
            </div>

            <div className="alert-warning">
              <p className="alert-text">
                <strong>⚠️ Important:</strong> Your mailboxes are deterministic. As long as you remember your PINs 
                and have access to your wallet, you can recreate your mailboxes on any device.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="alert-error" style={{ borderWidth: '2px' }}>
              <h4 className="alert-title">⚠️ Are you absolutely sure?</h4>
              <p className="alert-text mb-3">This will permanently delete:</p>
              <ul className="text-body mb-3 space-y-1 ml-4">
                <li>• All mailbox keys stored on this device</li>
                <li>• All mailbox names and PINs</li>
                <li>• All application settings</li>
              </ul>
              <p className="text-body font-semibold mb-3">
                You will need to reconnect your wallet and re-enter your PINs to access your mailboxes again.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="btn btn-ghost flex-1"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleClearAllData}
                  className="btn btn-danger flex-1"
                >
                  YES, CLEAR EVERYTHING
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reset to Defaults */}
      <div className="card">
        <div className="flex-between">
          <div>
            <h3 className="text-subtitle mb-1">Reset Settings</h3>
            <p className="text-muted">Restore all settings to their default values</p>
          </div>
          <button onClick={handleReset} className="btn btn-danger">
            RESET
          </button>
        </div>
      </div>
    </div>
  );
};
