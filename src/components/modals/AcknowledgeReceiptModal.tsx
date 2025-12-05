import React from 'react';
import { CheckCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import { NeonModal } from './NeonModal';

interface AcknowledgeReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: () => void;
  acknowledging: boolean;
  unreadCount: number;
}

export const AcknowledgeReceiptModal: React.FC<AcknowledgeReceiptModalProps> = ({
  isOpen,
  onClose,
  onAcknowledge,
  acknowledging,
  unreadCount
}) => {
  return (
    <NeonModal
      isOpen={isOpen}
      onClose={onClose}
      title="ACKNOWLEDGE.RECEIPT"
      icon={AlertTriangle}
      maxWidth="lg"
    >
      <div className="p-6 space-y-6">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-sm text-yellow-300 font-mono">
            <strong className="text-yellow-400">⚠️ Unread Messages:</strong><br/>
            This thread has {unreadCount} unread message{unreadCount > 1 ? 's' : ''}. 
            By acknowledging, you confirm receipt and mark all messages as read.
          </p>
        </div>

        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
          <p className="text-sm text-cyan-300 font-mono">
            <strong className="text-cyan-400">📋 What happens:</strong><br/>
            • Your read receipt will be recorded on-chain<br/>
            • Other participants will see you've read the messages<br/>
            • Messages will be revealed after confirmation
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onAcknowledge}
            disabled={acknowledging}
            className="flex-1 px-6 py-3 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {acknowledging ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Acknowledging...
              </>
            ) : (
              <>
                <CheckCheck className="w-4 h-4" />
                Acknowledge and Read
              </>
            )}
          </button>
        </div>
      </div>
    </NeonModal>
  );
};
