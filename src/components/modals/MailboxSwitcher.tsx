import React from 'react';
import { Inbox, X } from 'lucide-react';
import { MailboxInfo, SimpleKeyManager } from '../../utils/crypto-simple';
import { useConnectionStore } from '../../store/connectionStore';

interface MailboxSwitcherProps {
  mailboxes: MailboxInfo[];
  userAddress: string;
  onSwitch: (pin: string) => void;
  onCompleteIncomplete: () => void;
  onShowWarning: (message: string) => void;
}

export const MailboxSwitcher: React.FC<MailboxSwitcherProps> = ({
  mailboxes,
  userAddress,
  onSwitch,
  onCompleteIncomplete,
  onShowWarning,
}) => {
  const { showMailboxSwitcher, setShowMailboxSwitcher } = useConnectionStore();
  
  // Don't show if less than 2 mailboxes or if explicitly hidden
  if (mailboxes.length <= 1 || !showMailboxSwitcher) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900/95 backdrop-blur-xl rounded-lg shadow-lg shadow-cyan-500/20 p-4 max-w-xs z-40">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-2 uppercase tracking-wider font-mono">
          <Inbox className="w-4 h-4" />
          Switch Mailbox
        </h4>
        <button
          onClick={() => setShowMailboxSwitcher(false)}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-800/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2">
        {mailboxes.map((mailbox) => {
          const isCurrent = SimpleKeyManager.getCurrentMailboxPin(userAddress) === mailbox.pin;
          return (
            <button
              key={mailbox.publicKeyHash}
              onClick={() => {
                if (!isCurrent && !mailbox.isIncomplete) {
                  onSwitch(mailbox.pin);
                } else if (mailbox.isIncomplete) {
                  onShowWarning(
                    `Please complete the registration for ${mailbox.name} before activating this mailbox.`
                  );
                }
              }}
              className={`w-full text-left px-3 py-2 rounded-lg transition-all font-mono ${
                isCurrent
                  ? mailbox.isIncomplete
                    ? 'bg-yellow-500/20 text-yellow-400 font-medium border border-yellow-500/50 shadow-lg shadow-yellow-500/20'
                    : 'bg-cyan-500/20 text-cyan-400 font-medium shadow-lg shadow-cyan-500/20'
                  : mailbox.isIncomplete
                    ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 hover:border-yellow-500/50 hover:bg-yellow-500/20'
                    : 'bg-gray-800/50 text-gray-300 hover:border-cyan-500/50 hover:bg-gray-800/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{mailbox.name}</span>
                  {mailbox.isIncomplete && (
                    <span className="text-xs bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded border border-yellow-500/50 animate-pulse font-bold">
                      Incomplete
                    </span>
                  )}
                  {isCurrent && !mailbox.isIncomplete && (
                    <span className="text-xs bg-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded font-bold">
                      Active
                    </span>
                  )}
                </div>
                {mailbox.isIncomplete && !isCurrent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompleteIncomplete();
                    }}
                    className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded border border-yellow-500/50 hover:bg-yellow-500/30 hover:border-yellow-500/70 transition-all font-bold"
                  >
                    Complete
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Created: {new Date(mailbox.createdAt).toLocaleDateString()}
                {mailbox.isIncomplete && (
                  <span className="ml-2 text-yellow-400 font-medium">
                    • Click "Complete" to finish registration
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
