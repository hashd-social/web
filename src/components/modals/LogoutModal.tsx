import React, { useState } from 'react';
import { LogOut, AlertTriangle } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (clearSessionData: boolean) => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [clearSessionData, setClearSessionData] = useState(true);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(clearSessionData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-red-500/30 rounded-lg shadow-2xl shadow-red-500/20 max-w-md w-full">
        {/* Header */}
        <div className="bg-red-900/20 border-b border-red-500/30 px-6 py-4 flex items-center gap-3">
          <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <LogOut className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-400 uppercase font-mono">End Session</h2>
            <p className="text-sm text-gray-400 font-mono">Disconnect your wallet</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="flex items-start gap-3 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-200 font-medium font-mono">
                This will disconnect your wallet and end your current session.
              </p>
              <p className="text-xs text-yellow-300/80 mt-1 font-mono">
                You'll need to reconnect and enter your mailbox PIN to access your messages again.
              </p>
            </div>
          </div>

          {/* Clear Session Data Checkbox */}
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={clearSessionData}
                onChange={(e) => setClearSessionData(e.target.checked)}
                className="mt-1 w-4 h-4 text-cyan-500 bg-gray-700 border-cyan-500/50 rounded focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-sm font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors uppercase font-mono">
                  Delete all session data
                </span>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed font-mono">
                  This will clear all locally stored data including mailbox information, cached messages, 
                  and application settings. Your data on the blockchain will remain safe and can be 
                  recovered by reconnecting with your wallet and mailbox PIN.
                </p>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-300 bg-gray-700/50 hover:border-gray-500 rounded-lg transition-all uppercase font-mono"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600/80 border border-red-500/50 hover:bg-red-600 hover:border-red-500 rounded-lg transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/30 uppercase font-mono"
            >
              End Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
