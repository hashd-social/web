import React, { useState } from 'react';
import { X, AlertTriangle, Download, Trash2 } from 'lucide-react';

interface ThreadTerminationModalProps {
  show: boolean;
  threadId: string;
  onClose: () => void;
  onConfirm: () => void;
  onExportBackup: () => void;
  isExporting: boolean;
}

export const ThreadTerminationModal: React.FC<ThreadTerminationModalProps> = ({
  show,
  threadId,
  onClose,
  onConfirm,
  onExportBackup,
  isExporting
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [hasExported, setHasExported] = useState(false);

  if (!show) return null;

  const isConfirmValid = confirmText === 'TERMINATE';

  const handleExport = () => {
    onExportBackup();
    setHasExported(true);
  };

  const handleConfirm = () => {
    if (isConfirmValid) {
      onConfirm();
      setConfirmText('');
      setHasExported(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    setHasExported(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-red-500/30 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-red-500/20 bg-gradient-to-r from-red-900/20 to-transparent">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h2 className="text-xl font-bold text-red-400 font-mono uppercase tracking-wider">
              Terminate Conversation for Everyone?
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning Section */}
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <h3 className="text-lg font-bold text-red-400 mb-3 font-mono flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              What "Terminate" Actually Means
            </h3>
            
            <div className="space-y-4 text-sm">
              <div className="bg-gray-800/50 rounded p-3">
                <h4 className="font-bold text-green-400 mb-2 font-mono">What WILL be terminated:</h4>
                <ul className="space-y-1 text-gray-300 font-mono">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Message content (encrypted data on IPFS)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Ability to send new messages</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Thread will show as "Terminated" for ALL participants</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-800/50 rounded p-3">
                <h4 className="font-bold text-red-400 mb-2 font-mono">What will NOT be terminated:</h4>
                <ul className="space-y-1 text-gray-300 font-mono">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">✗</span>
                    <span>Thread metadata (participants, timestamps, message count)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">✗</span>
                    <span>On-chain record that this conversation existed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400">✗</span>
                    <span>Thread ID and participant addresses (permanent on blockchain)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Blockchain Reality Warning */}
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <h4 className="font-bold text-yellow-400 mb-2 font-mono flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Blockchain Reality:
            </h4>
            <p className="text-gray-300 font-mono text-sm">
              This is <strong className="text-yellow-400">NOT "total destruction."</strong> The thread skeleton remains on-chain forever. Only the encrypted content is wiped.
            </p>
          </div>

          {/* Backup Reminder */}
          <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4">
            <h4 className="font-bold text-cyan-400 mb-2 font-mono flex items-center gap-2">
              <Download className="w-5 h-5" />
              💾 Backup Reminder:
            </h4>
            <p className="text-gray-300 font-mono text-sm mb-3">
              Export a backup now if you want to keep these messages. Once terminated, only you can restore from your backup (other participants won't see it).
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className={`w-full px-4 py-2 rounded font-mono text-sm font-bold transition-all ${
                hasExported
                  ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                  : 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30'
              } ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isExporting ? 'Exporting...' : hasExported ? '✓ Backup Exported' : 'Export Backup Now'}
            </button>
          </div>

          {/* Final Warning */}
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400 font-bold text-center font-mono">
              This action affects ALL participants and cannot be undone.
            </p>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-300 font-mono">
              Type <span className="text-red-400">TERMINATE</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="TERMINATE"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded font-mono text-white focus:border-red-500 focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-700">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-mono font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmValid}
            className={`flex-1 px-4 py-2 rounded font-mono font-bold transition-all flex items-center justify-center gap-2 ${
              isConfirmValid
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            I Understand - Terminate Forever
          </button>
        </div>
      </div>
    </div>
  );
};
