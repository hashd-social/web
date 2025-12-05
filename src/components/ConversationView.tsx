import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, ExternalLink, Copy, Check, Archive } from 'lucide-react';
import { SimpleCryptoUtils, CryptoKeyPair } from '../utils/crypto-simple';

interface Message {
  id: number;
  sender: string;
  recipient: string;
  encryptedContent: string;
  encryptedMetadata: string;
  timestamp: bigint;
  isRead: boolean;
  isArchived: boolean;
  decryptedContent?: string;
  decryptedMetadata?: any;
  senderENS?: string;
  recipientENS?: string;
  txHash?: string;
  senderName?: string;
}

interface ConversationViewProps {
  participantAddress: string;
  participantName: string;
  messages: Message[];
  userAddress: string;
  keyPair: CryptoKeyPair;
  onBack: () => void;
  onMessageClick: (message: Message) => void;
  onArchive?: (message: Message) => void;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  participantAddress,
  participantName,
  messages,
  userAddress,
  keyPair,
  onBack,
  onMessageClick,
  onArchive
}) => {
  const [decryptedMessages, setDecryptedMessages] = useState<Message[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    // Decrypt messages if preview is enabled
       decryptMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const decryptMessages = async () => {
    setIsDecrypting(true);
    try {
      const decrypted = await Promise.all(
        messages.map(async (msg) => {
          try {
            const { message: decryptedContent } = await SimpleCryptoUtils.decryptFromContract(
              msg.encryptedContent,
              msg.encryptedMetadata,
              keyPair.privateKey
            );
            return { ...msg, decryptedContent };
          } catch (error) {
            console.error(`Failed to decrypt message ${msg.id}:`, error);
            return { ...msg, decryptedContent: '[Failed to decrypt]' };
          }
        })
      );
      setDecryptedMessages(decrypted);
    } catch (error) {
      console.error('Error decrypting messages:', error);
      setDecryptedMessages(messages);
    } finally {
      setIsDecrypting(false);
    }
  };

  const formatAddress = (address: string | undefined) => {
    if (!address || typeof address !== 'string') return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays === 0) {
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins < 1 ? 'Just now' : `${diffMins}m ago`;
      }
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getExplorerUrl = (txHash: string) => {
    const chainId = process.env.REACT_APP_CHAIN_ID;
    if (chainId === "6342") {
      return `https://www.megaexplorer.xyz/tx/${txHash}`;
    }
    return `http://localhost:8545/tx/${txHash}`;
  };

  const renderMessageList = () => (
    <div className="divide-y divide-cyan-500/10">
      {decryptedMessages.map((message, index) => {
        const isSentByUser = message.sender.toLowerCase() === userAddress.toLowerCase();
        
        return (
          <div
            key={`msg-${message.id}-${message.timestamp}-${index}`}
            onClick={() => onMessageClick(message)}
            className={`flex items-center px-6 py-4 cursor-pointer transition-all transform hover:scale-[1.01] border-l-2 relative overflow-hidden ${
              isSentByUser
                ? 'bg-purple-900/10 hover:bg-purple-900/20 border-purple-500/30'
                : (message.isRead
                    ? 'bg-gray-900 hover:bg-gray-800 border-transparent'
                    : 'bg-gradient-to-r from-cyan-900/20 to-transparent hover:from-cyan-900/30 border-cyan-500 neon-border-cyan')
            }`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {/* Unread indicator */}
            <div className="flex-shrink-0 mr-3">
              {!message.isRead && !isSentByUser && (
                <div className="relative">
                  <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-cyan-500 rounded-full animate-ping opacity-75"></div>
                </div>
              )}
            </div>

            {/* Message Content */}
            <div className="flex-1 min-w-0">
              {/* Sender indicator */}
              <div className={`text-xs font-bold truncate font-mono mb-1 ${
                isSentByUser 
                  ? 'text-purple-400' 
                  : (message.isRead ? 'text-gray-500' : 'text-cyan-400')
              }`}>
                {isSentByUser ? 'You said:' : `${participantName} said:`}
              </div>
              {/* Preview */}
              <div className="text-sm text-gray-400 truncate font-mono">
                {message.decryptedContent 
                  ? (message.decryptedContent.length > 100 
                      ? message.decryptedContent.substring(0, 100) + '...' 
                      : message.decryptedContent)
                  : '🔒 Tap to Decrypt'
                }
              </div>
            </div>

            {/* Timestamp and Actions */}
            <div className="flex-shrink-0 flex items-center space-x-3 ml-4">
              <div className="text-xs text-gray-500 font-mono">
                {formatTimestamp(message.timestamp)}
              </div>
              {message.txHash && (
                <a
                  href={getExplorerUrl(message.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-neutral-400 hover:text-primary-500 transition-colors"
                  title="View on blockchain explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {onArchive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(message);
                  }}
                  className="text-neutral-400 hover:text-red-400 transition-colors"
                  title="Archive message"
                >
                  <Archive className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-cyan-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-cyan-500/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-cyan-400" />
              </button>
              <div>
                <h2 className="text-lg font-bold neon-text-cyan font-mono">
                  {participantName}
                </h2>
                <p className="text-xs text-gray-500 font-mono">
                  {formatAddress(participantAddress)}
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-400 font-mono">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="max-w-7xl mx-auto">
        {isDecrypting ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-cyan-400 font-mono">Decrypting messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="text-6xl mb-6">💬</div>
            <h3 className="text-xl font-bold neon-text-cyan mb-3 font-mono">NO.MESSAGES</h3>
            <p className="text-sm text-gray-400 font-mono">
              No messages in this conversation yet
            </p>
          </div>
        ) : (
          <div className="border border-cyan-500/20 rounded-lg overflow-hidden mx-6 my-6">
            {renderMessageList()}
          </div>
        )}
      </div>
    </div>
  );
};
