import React, { useState, useEffect } from 'react';
import { MessageCircle, User } from 'lucide-react';

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

interface Conversation {
  participantAddress: string;
  participantName: string;
  lastMessage: Message;
  unreadCount: number;
  messageCount: number;
}

interface ConversationListProps {
  messages: Message[];
  userAddress: string;
  currentView: 'inbox' | 'sent' | 'archived';
  onSelectConversation: (participantAddress: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  messages,
  userAddress,
  currentView,
  onSelectConversation
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    // Group messages by participant and deduplicate by message ID
    const conversationMap = new Map<string, Conversation>();
    const seenMessageIds = new Set<number>();

    messages.forEach(message => {
      // Skip duplicate messages (same ID)
      if (seenMessageIds.has(message.id)) {
        return;
      }
      seenMessageIds.add(message.id);

      // Determine the other participant (not the current user)
      const isSentByUser = message.sender.toLowerCase() === userAddress.toLowerCase();
      const participantAddress = isSentByUser
        ? message.recipient.toLowerCase()
        : message.sender.toLowerCase();

      const participantName = isSentByUser
        ? (message.recipientENS || formatAddress(message.recipient))
        : (message.senderName || formatAddress(message.sender));

      const existing = conversationMap.get(participantAddress);

      if (!existing) {
        conversationMap.set(participantAddress, {
          participantAddress,
          participantName,
          lastMessage: message,
          unreadCount: message.isRead ? 0 : 1,
          messageCount: 1
        });
      } else {
        // Update if this message is newer
        if (message.timestamp > existing.lastMessage.timestamp) {
          existing.lastMessage = message;
        }
        existing.messageCount++;
        if (!message.isRead) {
          existing.unreadCount++;
        }
      }
    });

    // Convert to array and sort by last message timestamp
    const conversationArray = Array.from(conversationMap.values()).sort(
      (a, b) => Number(b.lastMessage.timestamp - a.lastMessage.timestamp)
    );

    setConversations(conversationArray);
  }, [messages, userAddress, currentView]);

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

  if (conversations.length === 0) {
    return (
      <div className="text-center py-20 px-6 bg-gray-900">
        <div className="float-animation text-6xl mb-6 hologram">💬</div>
        <h3 className="text-xl font-bold neon-text-cyan mb-3 font-mono">NO.CONVERSATIONS.DETECTED</h3>
        <p className="text-sm text-gray-400 font-mono">
          🔒 YOUR.CONVERSATIONS.WILL.APPEAR.HERE
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-cyan-500/10 bg-gray-900 rounded-lg overflow-hidden">
      {conversations.map((conversation, index) => (
        <div
          key={`conversation-${conversation.participantAddress}-${index}`}
          onClick={() => onSelectConversation(conversation.participantAddress)}
          className={`flex items-center px-6 py-4 cursor-pointer transition-all transform hover:scale-[1.01] border-l-2 relative overflow-hidden message-fade-in ${
            conversation.unreadCount > 0
              ? 'bg-gradient-to-r from-cyan-900/20 to-transparent hover:from-cyan-900/30 border-cyan-500 neon-border-cyan'
              : 'bg-gray-900 hover:bg-gray-800 border-transparent'
          }`}
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          {/* Avatar/Icon */}
          <div className="flex-shrink-0 mr-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              conversation.unreadCount > 0 
                ? 'bg-cyan-500/20 border-2 border-cyan-500' 
                : 'bg-gray-700 border-2 border-gray-600'
            }`}>
              <User className={`w-6 h-6 ${
                conversation.unreadCount > 0 ? 'text-cyan-400' : 'text-gray-400'
              }`} />
            </div>
          </div>

          {/* Conversation Info */}
          <div className="flex-1 min-w-0">
            {/* Participant Name */}
            <div className={`text-sm font-semibold truncate font-mono mb-1 ${
              conversation.unreadCount > 0 ? 'neon-text-cyan' : 'text-gray-400'
            }`}>
              {currentView === 'sent' ? 'TO: ' : ''}
              {conversation.participantName}
            </div>
            
            {/* Message Count */}
            <div className="flex items-center gap-2">
              <MessageCircle className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-500 font-mono">
                {conversation.messageCount} message{conversation.messageCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Right Side - Timestamp and Unread Badge */}
          <div className="flex-shrink-0 flex flex-col items-end space-y-2 ml-4">
            {/* Timestamp */}
            <div className="text-xs text-gray-500 font-mono">
              {formatTimestamp(conversation.lastMessage.timestamp)}
            </div>
            
            {/* Unread Badge */}
            {conversation.unreadCount > 0 && (
              <div className="relative">
                <div className="bg-cyan-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {conversation.unreadCount}
                </div>
                <div className="absolute inset-0 bg-cyan-500 rounded-full animate-ping opacity-75"></div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
