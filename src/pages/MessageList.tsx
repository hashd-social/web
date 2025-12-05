import React, { useState, useEffect } from 'react';
import { RefreshCw, Inbox, Send, Mail, MessageSquare, ArrowLeft, PenSquare, CheckCheck, Check, Clock, User, Download, Trash2, Upload, AlertTriangle } from 'lucide-react';
import { CryptoKeyPair, SimpleCryptoUtils } from '../utils/crypto-simple';
import { getAllThreadInfos, getConversationMessages, DecryptedMessage, exportThreadBackup, restoreThreadFromFile, restoreThreadFromLocal, hasLocalBackup } from '../services/threadService';
import { TabBar } from '../components/TabBar';
import { VerificationBadge } from '../components/VerificationBadge';
import { RestrictedMessage } from '../components/RestrictedMessage';
import { NeonModal } from '../components/modals/NeonModal';
import { ThreadVerificationModal } from '../components/modals/ThreadVerificationModal';
import { ExportThreadModal } from '../components/modals/ExportThreadModal';
import { AcknowledgeReceiptModal } from '../components/modals/AcknowledgeReceiptModal';
import { MessageDetailsModal } from '../components/modals/MessageDetailsModal';
import { ThreadTerminationModal } from '../components/modals/ThreadTerminationModal';
import { contractService } from '../utils/contracts';
import { ContractErrorHandler } from '../utils/contractErrors';
import { ipfsService } from '../services/ipfs/messaging';

interface MessageListProps {
  userAddress: string;
  keyPair: CryptoKeyPair;
  onError: (error: string) => void;
  onCompose?: () => void;
  currentMailboxName?: string;
  onSwitchMailbox?: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  userAddress,
  keyPair,
  onError,
  onCompose,
  currentMailboxName,
  onSwitchMailbox
}) => {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<DecryptedMessage[]>([]);
  const [currentView, setCurrentView] = useState<'inbox' | 'sent' | 'archived'>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<DecryptedMessage | null>(null);
  const [readStatuses, setReadStatuses] = useState<Record<string, boolean>>({});
  const [messageReadReceipts, setMessageReadReceipts] = useState<any[]>([]);
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const [showAcknowledgeModal, setShowAcknowledgeModal] = useState(false);
  const [pendingThreadId, setPendingThreadId] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportThreadData, setExportThreadData] = useState<any>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [currentThreadCID, setCurrentThreadCID] = useState<string | null>(null);
  const [threadAckRequired, setThreadAckRequired] = useState(false);
  
  // Thread termination state
  const [showTerminationModal, setShowTerminationModal] = useState(false);
  const [canTerminate, setCanTerminate] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationInfo, setTerminationInfo] = useState<{terminatedBy: string; terminatedAt: bigint} | null>(null);
  const [isRestoredLocally, setIsRestoredLocally] = useState(false);
  const [localBackupExists, setLocalBackupExists] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);

  useEffect(() => {
    if (keyPair) {
      loadThreads();
    }
  }, [keyPair, userAddress]);

  // Check for thread to open after sending a message
  useEffect(() => {
    const threadToOpen = sessionStorage.getItem('openThread');
    if (threadToOpen && threads.length > 0) {
      sessionStorage.removeItem('openThread');
      // Open the thread
      handleThreadClick(threadToOpen);
    }
  }, [threads]);

  const loadThreads = async () => {
    setLoading(true);
    try {
      console.log('📂 Loading threads for user:', userAddress);
      const threadInfos = await getAllThreadInfos(userAddress, keyPair);
      console.log(`Found ${threadInfos.length} threads`);
      setThreads(threadInfos);
      
      // Resolve participant names
      const names: Record<string, string> = {};
      for (const thread of threadInfos) {
        for (const participant of thread.participants) {
          if (participant.toLowerCase() !== userAddress.toLowerCase() && !names[participant]) {
            names[participant] = await formatParticipantName(participant);
          }
        }
      }
      setParticipantNames(names);
    } catch (error: any) {
      console.error('Error loading threads:', error);
      const errorMessage = ContractErrorHandler.handle(error, 'loadThreads');
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleThreadClick = async (threadId: string) => {
    try {
      console.log('📖 Opening thread:', threadId);
      
      // Check if thread is terminated
      const terminated = await contractService.isThreadTerminated(threadId);
      setIsTerminated(terminated);
      
      if (terminated) {
        const info = await contractService.getThreadTerminationInfo(threadId);
        setTerminationInfo({
          terminatedBy: info.terminatedBy,
          terminatedAt: info.terminatedAt
        });
        
        // Check for local backup
        const hasBackup = hasLocalBackup(threadId);
        setLocalBackupExists(hasBackup);
        
        // Check if restored
        const restored = sessionStorage.getItem(`restored-${threadId}`) === 'true';
        setIsRestoredLocally(restored);
      } else {
        setTerminationInfo(null);
        setIsRestoredLocally(false);
        setLocalBackupExists(false);
      }
      
      // Check if user can terminate
      const canTerm = await contractService.canTerminateThread(threadId, userAddress);
      setCanTerminate(canTerm);
      
      // Check if there are unread messages BEFORE loading
      const status = await contractService.getReadStatus(threadId, userAddress);
      const hasUnread = Number(status.unreadCount) > 0;
      
      console.log('📊 Read status check:');
      console.log('  User address:', userAddress);
      console.log('  Unread count from contract:', status.unreadCount);
      console.log('  Has unread?', hasUnread);
      
      if (hasUnread) {
        // Show acknowledge modal - don't load messages yet
        console.log('📬 Thread has unread messages - showing acknowledge modal');
        setPendingThreadId(threadId);
        setUnreadCount(Number(status.unreadCount));
        setShowAcknowledgeModal(true);
      } else {
        // No unread messages - load directly
        console.log('✅ All messages already read - loading thread');
        await loadThread(threadId);
      }
    } catch (error: any) {
      console.error('Error opening thread:', error);
      const errorMessage = ContractErrorHandler.handle(error, 'openThread');
      onError(errorMessage);
    }
  };

  const loadThread = async (threadId: string) => {
    try {
      setSelectedThreadId(threadId);
      setCurrentThreadCID(null); // Reset CID
      setThreadAckRequired(false); // Reset ack status
      
      const messages = await getConversationMessages(threadId, userAddress, keyPair);
      console.log(`Loaded ${messages.length} messages`);
      setConversationMessages(messages);
      
      // Fetch thread CID for verification modal
      try {
        const threadWithCID = await ipfsService.getThreadWithCID(threadId);
        if (threadWithCID?.cid) {
          setCurrentThreadCID(threadWithCID.cid);
          console.log(`Thread CID: ${threadWithCID.cid}`);
        }
      } catch (cidError) {
        console.warn('Could not fetch thread CID:', cidError);
      }
      
      // Fetch acknowledgment status
      try {
        const ackRequired = await contractService.isAckRequired(threadId);
        setThreadAckRequired(ackRequired);
        console.log(`Thread ackRequired: ${ackRequired}`);
      } catch (ackError) {
        console.warn('Could not fetch ack status:', ackError);
      }
      
      // Load read statuses for sent messages
      await loadReadStatuses(threadId, messages);
    } catch (error: any) {
      console.error('Error loading thread:', error);
      const errorMessage = ContractErrorHandler.handle(error, 'loadThread');
      onError(errorMessage);
    }
  };

  const handleAcknowledgeReceipt = async () => {
    if (!pendingThreadId) return;
    
    try {
      setAcknowledging(true);
      
      // Get the latest message index from the contract, not by loading messages
      const status = await contractService.getReadStatus(pendingThreadId, userAddress);
      const totalMessages = Number(status.totalMessages);
      
      if (totalMessages === 0) {
        throw new Error('No messages found in thread');
      }
      
      // The latest message index is totalMessages - 1 (0-indexed)
      const latestMessageIndex = totalMessages - 1;
      
      console.log('📝 Acknowledging receipt:');
      console.log('  Thread ID:', pendingThreadId);
      console.log('  Total messages:', totalMessages);
      console.log('  Latest index:', latestMessageIndex);
      console.log('  User address:', userAddress);
      
      await contractService.markThreadAsRead(pendingThreadId, latestMessageIndex);
      console.log('✅ Receipt acknowledged on-chain');
      
      // Close modal and load the thread
      setShowAcknowledgeModal(false);
      setAcknowledging(false);
      
      // Now load and display the messages
      await loadThread(pendingThreadId);
      setPendingThreadId(null);
    } catch (error: any) {
      console.error('Failed to acknowledge receipt:', error);
      setAcknowledging(false);
      const errorMessage = ContractErrorHandler.handle(error, 'acknowledgeReceipt');
      onError(errorMessage);
    }
  };

  const loadReadStatuses = async (threadId: string, messages: DecryptedMessage[]) => {
    try {
      const statuses: Record<string, boolean> = {};
      
      // Get the other participant (recipient)
      const otherParticipant = messages[0]?.participants.find(
        p => p.toLowerCase() !== userAddress.toLowerCase()
      );
      
      if (!otherParticipant) return;
      
      // Get their read status
      const status = await contractService.getReadStatus(threadId, otherParticipant);
      const lastReadIndex = Number(status.lastReadIndex);
      
      // Mark messages as read if recipient has read up to that index
      messages.forEach(msg => {
        const isSentByUser = msg.sender.toLowerCase() === userAddress.toLowerCase();
        if (isSentByUser) {
          const messageKey = `${threadId}-${msg.index}`;
          // Check if read (not NEVER_READ and index is <= lastReadIndex)
          statuses[messageKey] = lastReadIndex !== Number.MAX_SAFE_INTEGER && 
                                 lastReadIndex < Number.MAX_SAFE_INTEGER && 
                                 msg.index <= lastReadIndex;
        }
      });
      
      setReadStatuses(statuses);
    } catch (error) {
      console.error('Error loading read statuses:', error);
    }
  };

  const loadMessageReadReceipts = async (message: DecryptedMessage) => {
    try {
      const receipts = [];
      const messageSender = message.sender.toLowerCase();
      
      for (const participant of message.participants) {
        const status = await contractService.getReadStatus(message.threadId, participant);
        const lastReadIndex = Number(status.lastReadIndex);
        const isCurrentUser = participant.toLowerCase() === userAddress.toLowerCase();
        const isSender = participant.toLowerCase() === messageSender;
        
        receipts.push({
          address: participant,
          hasRead: isSender ? true : ( // Sender always "read" their own message
            lastReadIndex !== Number.MAX_SAFE_INTEGER && 
            lastReadIndex < Number.MAX_SAFE_INTEGER && 
            message.index <= lastReadIndex
          ),
          isCurrentUser,
          isSender
        });
      }
      
      setMessageReadReceipts(receipts);
    } catch (error) {
      console.error('Error loading message read receipts:', error);
    }
  };

  const handleBack = () => {
    setSelectedThreadId(null);
    setConversationMessages([]);
    setIsTerminated(false);
    setTerminationInfo(null);
    setIsRestoredLocally(false);
    setCanTerminate(false);
  };

  const handleExportBackup = async () => {
    if (!selectedThreadId) return;
    
    setIsExportingBackup(true);
    try {
      await exportThreadBackup(selectedThreadId, conversationMessages);
    } catch (error) {
      onError('Failed to export backup');
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleTerminateThread = async () => {
    if (!selectedThreadId) return;
    
    try {
      // Execute termination
      const tx = await contractService.terminateThread(selectedThreadId);
      await tx.wait();
      
      // Update state
      setIsTerminated(true);
      setShowTerminationModal(false);
      
      // Show success message
      alert('Conversation terminated for all participants. Thread metadata remains on-chain, but content is wiped.');
      
      // Refresh thread list
      await loadThreads();
    } catch (error: any) {
      const errorMessage = ContractErrorHandler.handle(error, 'terminateThread');
      onError(errorMessage);
    }
  };

  const handleRestoreFromLocal = async () => {
    if (!selectedThreadId) return;
    
    try {
      const backup = await restoreThreadFromLocal(selectedThreadId);
      if (backup) {
        setConversationMessages(backup.messages);
        setIsRestoredLocally(true);
        sessionStorage.setItem(`restored-${selectedThreadId}`, 'true');
      }
    } catch (error) {
      onError('Failed to restore backup');
    }
  };

  const handleRestoreFromFile = async (file: File) => {
    try {
      const backup = await restoreThreadFromFile(file);
      setConversationMessages(backup.messages);
      setIsRestoredLocally(true);
      if (selectedThreadId) {
        sessionStorage.setItem(`restored-${selectedThreadId}`, 'true');
      }
    } catch (error) {
      onError('Failed to restore backup from file');
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getOtherParticipant = (participants: string[]) => {
    return participants.find(p => p.toLowerCase() !== userAddress.toLowerCase()) || participants[0];
  };

  const formatParticipantName = async (participantId: string): Promise<string> => {
    try {
      // Check if this is a public key (longer than address) or wallet address
      const isPublicKey = participantId.length > 42;
      
      if (isPublicKey) {
        // It's a public key - look up the account name from KeyRegistry events
        const cleanKey = participantId.startsWith('0x') ? participantId : '0x' + participantId;
        
        try {
          const accountName = await contractService.getNameByPublicKey(cleanKey);
          if (accountName) {
            return accountName;
          }
        } catch (e) {
          console.warn('Could not resolve public key to account name:', e);
        }
        
        // Fallback: show truncated public key
        return `${cleanKey.slice(0, 10)}...${cleanKey.slice(-8)}`;
      } else {
        // It's a wallet address - resolve normally
        const namedAccount = await contractService.getPrimaryNamedAccount(participantId);
        if (namedAccount) {
          return `${namedAccount} (${participantId.slice(0, 6)}...${participantId.slice(-4)})`;
        }
        return `${participantId.slice(0, 10)}...${participantId.slice(-4)}`;
      }
    } catch (error) {
      // Ignore error, fall back to truncated ID
      return `${participantId.slice(0, 10)}...${participantId.slice(-4)}`;
    }
  };

  if (selectedThreadId) {
    const thread = threads.find(t => t.threadId === selectedThreadId);
    const threadFile = { threadId: selectedThreadId, participants: thread?.participants || [], messages: conversationMessages, version: 1, lastUpdated: Date.now() };
    
    return (
      <div className="min-h-screen hex-grid bg-gray-900">
        <div className="border-b border-gray-800 bg-gray-900/50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to conversations
            </button>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-cyan-400" />
                <div>
                  <h1 className="text-2xl font-bold text-white">Conversation ({conversationMessages.length})</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <VerificationBadge
                      chainValid={conversationMessages[0]?.verificationStatus === 'valid'}
                      totalMessages={conversationMessages.length}
                      verifiedMessages={conversationMessages.filter(m => m.verificationStatus === 'valid').length}
                      showDetails={false}
                      onClick={() => setShowVerificationModal(true)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {onCompose && thread && !isTerminated && (
                  <button
                    onClick={() => {
                      // Call onCompose with thread info to pre-fill recipients
                      if (onCompose) {
                        onCompose();
                        // Store thread info for the compose modal to use
                        sessionStorage.setItem('replyToThread', JSON.stringify({
                          threadId: selectedThreadId,
                          participants: thread.participants
                        }));
                      }
                    }}
                    className="cyber-button relative w-full flex items-center justify-center gap-2 px-4 py-3 text-sm overflow-hidden"
                  >
                    <Send className="w-4 h-4" />
                    Reply
                  </button>
                )}

                {canTerminate && !isTerminated && (
                  <button
                    onClick={() => setShowTerminationModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-900/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-900/30 hover:border-red-500 transition-colors font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Terminate
                  </button>
                )}

                <button
                  onClick={() => {
                    setExportThreadData(threadFile);
                    setShowExportModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 hover:border-gray-600 transition-colors font-medium"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>                
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Terminated Thread Warning */}
          {isTerminated && !isRestoredLocally && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
                <h3 className="text-xl font-bold text-red-400 font-mono">
                  🗑️ This conversation has been terminated
                </h3>
              </div>
              
              <p className="text-gray-300 mb-4 font-mono">
                Terminated by {terminationInfo?.terminatedBy.toLowerCase() === userAddress.toLowerCase() ? 'you' : formatAddress(terminationInfo?.terminatedBy || '')} 
                {' '}on {new Date(Number(terminationInfo?.terminatedAt || 0) * 1000).toLocaleString()}
              </p>
              
              {localBackupExists ? (
                <button
                  onClick={handleRestoreFromLocal}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded font-mono hover:bg-cyan-500/30"
                >
                  <Upload className="w-4 h-4" />
                  Restore from Local Backup
                </button>
              ) : (
                <div>
                  <p className="text-gray-400 mb-2 font-mono text-sm">
                    Upload a backup file to restore messages:
                  </p>
                  <input
                    type="file"
                    accept=".json"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        await handleRestoreFromFile(file);
                      }
                    }}
                    className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/20 file:text-cyan-400 hover:file:bg-cyan-500/30"
                  />
                </div>
              )}
              
              <p className="text-red-400 mt-4 font-mono text-sm">
                ❌ You cannot send new messages to terminated conversations.
              </p>
            </div>
          )}

          {/* Restored Thread Banner */}
          {isRestoredLocally && (
            <div className="bg-yellow-600 border-2 border-yellow-500 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-6 h-6 text-gray-900" />
                <h3 className="text-lg font-bold text-gray-900 font-mono">
                  ⚠️ RESTORED LOCALLY — NO OTHER PARTICIPANT SEES THIS
                </h3>
              </div>
              <p className="text-gray-900 font-mono text-sm">
                This conversation was terminated on the blockchain. You are viewing a local backup.
                Other participants cannot see these messages UNLESS they also created a backup.
              </p>
            </div>
          )}

          {/* Email-style thread - latest first */}
          {(!isTerminated || isRestoredLocally) && (
            <div className="space-y-1">
              {[...conversationMessages].map((message, index) => {
              if (message.isBeforeJoinTime) {
                return (
                  <RestrictedMessage
                    key={message.messageId}
                    joinedAtIndex={conversationMessages[0]?.index || 0}
                    messageIndex={message.index}
                    timestamp={message.timestamp}
                  />
                );
              }

              const isSentByUser = message.sender.toLowerCase() === userAddress.toLowerCase();
              const messageKey = `${message.threadId}-${message.index}`;
              const isRead = readStatuses[messageKey];
              
              // Get the other participant and their resolved name
              const otherParticipant = getOtherParticipant(message.participants);
              const senderName = isSentByUser ? 'You' : (participantNames[otherParticipant] || `${otherParticipant.slice(0, 10)}...${otherParticipant.slice(-4)}`);
              const isLatest = index === 0;

              return (
                <div
                  key={message.messageId}
                  onClick={async () => {
                    console.log('Message clicked:', message);
                    setSelectedMessage(message);
                    await loadMessageReadReceipts(message);
                  }}
                  className={`
                    p-4 border-b border-gray-800/50 cursor-pointer transition-all
                    hover:bg-gray-800/30
                    ${isLatest ? 'bg-gray-800/20' : ''}
                  `}
                >
                  {/* Email header row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                        ${isSentByUser 
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                          : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }
                      `}>
                        {senderName.slice(0, 2).toUpperCase()}
                      </div>
                      
                      {/* Sender name */}
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${isSentByUser ? 'text-cyan-400' : 'text-white'}`}>
                          {senderName}
                        </span>
                        {isSentByUser && (
                          <span className="text-xs text-gray-500">to {participantNames[otherParticipant] || 'recipient'}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Timestamp and status */}
                    <div className="flex items-center gap-2">
                      {isSentByUser && (
                        <span title={isRead ? "Read" : "Delivered"}>
                          {isRead ? (
                            <CheckCheck className="w-4 h-4 text-green-400" />
                          ) : (
                            <Check className="w-4 h-4 text-gray-500" />
                          )}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Message content */}
                  <div className="pl-11">
                    {message.decryptedContent ? (
                      <p className="text-gray-300 text-sm whitespace-pre-wrap">
                        {message.decryptedContent}
                      </p>
                    ) : (
                      <p className="text-gray-500 italic text-sm">
                        Unable to decrypt message
                      </p>
                    )}

                    {message.verificationStatus === 'invalid' && (
                      <div className="mt-2 text-xs text-red-400">
                        ⚠️ Signature verification failed
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
        
        {/* Export Thread Modal */}
        <ExportThreadModal
          isOpen={showExportModal}
          onClose={() => {
            setShowExportModal(false);
            setExportThreadData(null);
          }}
          threadData={exportThreadData}
        />

        {/* Thread Verification Modal */}
        <ThreadVerificationModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          chainValid={conversationMessages[0]?.verificationStatus === 'valid'}
          totalMessages={conversationMessages.length}
          verifiedMessages={conversationMessages.filter(m => m.verificationStatus === 'valid').length}
          threadId={selectedThreadId || undefined}
          threadCID={currentThreadCID}
          ackRequired={threadAckRequired}
        />

        {/* Message Details Modal */}
        <MessageDetailsModal
          isOpen={!!selectedMessage}
          onClose={() => setSelectedMessage(null)}
          message={selectedMessage}
          ackRequired={threadAckRequired}
          readReceipts={messageReadReceipts}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen hex-grid bg-gray-900">
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-6 h-6 text-cyan-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">Messages</h1>
                <p className="text-gray-400">{currentMailboxName || 'Inbox'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {onCompose && (
                <button
                  onClick={onCompose}
                  className="cyber-button relative w-full flex items-center justify-center gap-2 px-4 py-3 text-sm overflow-hidden"
                >
                  <PenSquare className="w-4 h-4" />
                  Compose
                </button>
              )}
              {/* <button
                onClick={loadThreads}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />

              </button> */}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <TabBar
          tabs={[
            { id: 'inbox', label: 'Inbox', icon: Inbox },
            { id: 'sent', label: 'Sent', icon: Send },
          ]}
          activeTab={currentView}
          onTabChange={(tab) => setCurrentView(tab as any)}
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Mail className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No threads yet</h3>
            <p className="text-gray-500 mb-6">Send your first message to get started</p>
            {onCompose && (
              <button
                onClick={onCompose}
                className="px-6 py-3 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
              >
                Send a message
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((thread) => {
              const otherParticipant = getOtherParticipant(thread.participants);
              const participantName = participantNames[otherParticipant] || `${otherParticipant.slice(0, 10)}...${otherParticipant.slice(-4)}`;
              const lastMessage = thread.lastMessage;
              
              return (
                <button
                  key={thread.threadId}
                  onClick={() => handleThreadClick(thread.threadId)}
                  className="w-full flex items-center gap-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-cyan-500/30 hover:bg-gray-900/70 transition-all text-left"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {otherParticipant.slice(2, 4).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-200 truncate">
                        {participantName}
                      </span>
                      {lastMessage && (
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-400 truncate">
                        {thread.totalMessages} message{thread.totalMessages !== 1 ? 's' : ''}
                      </p>
                      
                      {thread.unreadCount > 0 && (
                        <span className="px-2 py-1 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs rounded-full">
                          {thread.unreadCount} new
                        </span>
                      )}
                    </div>
                  </div>

  
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Acknowledge Receipt Modal */}
      <AcknowledgeReceiptModal
        isOpen={showAcknowledgeModal}
        onClose={() => {
          setShowAcknowledgeModal(false);
          setPendingThreadId(null);
        }}
        onAcknowledge={handleAcknowledgeReceipt}
        acknowledging={acknowledging}
        unreadCount={unreadCount}
      />

      {/* Thread Termination Modal */}
      <ThreadTerminationModal
        show={showTerminationModal}
        threadId={selectedThreadId || ''}
        onClose={() => setShowTerminationModal(false)}
        onConfirm={handleTerminateThread}
        onExportBackup={handleExportBackup}
        isExporting={isExportingBackup}
      />
    </div>
  );
};
