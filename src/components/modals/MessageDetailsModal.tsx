import React from 'react';
import { Mail, CheckCheck, Clock, User } from 'lucide-react';
import { NeonModal } from './NeonModal';
import { DecryptedMessage } from '../../services/threadService';

interface MessageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: DecryptedMessage | null;
  ackRequired?: boolean;
  readReceipts: Array<{
    address: string;
    hasRead: boolean;
    isCurrentUser: boolean;
  }>;
}

export const MessageDetailsModal: React.FC<MessageDetailsModalProps> = ({
  isOpen,
  onClose,
  message,
  ackRequired = false,
  readReceipts
}) => {
  if (!message) return null;
  
  console.log('MessageDetailsModal - ackRequired:', ackRequired);

  return (
    <NeonModal
      isOpen={isOpen}
      onClose={onClose}
      title="MESSAGE.DETAILS"
      icon={Mail}
      maxWidth="2xl"
    >
      <div className="p-6 space-y-6">
        {/* Message Content */}
        <div>
          <h3 className="text-sm font-bold text-cyan-400 mb-2 uppercase">Content</h3>
          <p className="text-white font-mono text-sm break-words bg-gray-800/50 p-4 rounded-lg">
            {message.decryptedContent || 'Unable to decrypt message'}
          </p>
        </div>

        {/* Metadata */}
        <div>
          <h3 className="text-sm font-bold text-cyan-400 mb-2 uppercase">Metadata</h3>
          <div className="bg-gray-800/50 p-4 rounded-lg space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-gray-400">Index:</span>
              <span className="text-white">{message.index}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Timestamp:</span>
              <span className="text-white">{new Date(message.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Sender:</span>
              <span className="text-white">{message.sender.slice(0, 10)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Verification:</span>
              <span className={`font-bold ${
                message.verificationStatus === 'valid' ? 'text-green-400' : 
                message.verificationStatus === 'invalid' ? 'text-red-400' : 
                'text-yellow-400'
              }`}>
                {message.verificationStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

 

        {/* Acknowledgments Disabled Notice */}
        {!ackRequired && (
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase">Thread Acknowledgements: OFF</h3>
            <p className="text-sm text-gray-500 font-mono">
              Read status is not tracked on-chain for this thread.
            </p>
          </div>
        )}
      </div>
    </NeonModal>
  );
};
