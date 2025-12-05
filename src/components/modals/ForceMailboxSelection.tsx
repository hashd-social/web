import React from 'react';
import { Key, LogOut } from 'lucide-react';
import { NeonModal } from './NeonModal';
import { MailboxInfo } from '../../utils/crypto-simple';

interface ForceMailboxSelectionProps {
  mailboxes: MailboxInfo[];
  onSelectMailbox: (mailbox: MailboxInfo) => void;
  onLogout: () => void;
}

export const ForceMailboxSelection: React.FC<ForceMailboxSelectionProps> = ({
  mailboxes,
  onSelectMailbox,
  onLogout,
}) => {
  return (
    <NeonModal
      isOpen={true}
      onClose={() => {}} // Can't close this modal
      title="SWITCH MAILBOX"
      icon={Key}
      maxWidth="md"
    >
      <div className="p-6">
        <p className="text-sm text-gray-400 font-mono mb-6">
          You must select a mailbox to continue. Choose from your stored mailboxes below or logout.
        </p>

          {/* Mailbox List */}
          <div className="space-y-2 mb-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono mb-2">
              Available Mailboxes
            </h3>
            {mailboxes.map((mailbox) => (
              <button
                key={mailbox.publicKeyHash}
                onClick={() => onSelectMailbox(mailbox)}
                className="w-full text-left px-4 py-3 rounded-lg bg-gray-900/50 border border-gray-700/30 hover:border-cyan-500/50 hover:bg-gray-800/70 transition-all font-mono group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {mailbox.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Created: {new Date(mailbox.createdAt).toLocaleDateString()}
                      {mailbox.isIncomplete && (
                        <span className="ml-2 text-yellow-400 font-medium">• Incomplete</span>
                      )}
                    </div>
                  </div>
                  <div className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Key className="w-5 h-5" />
                  </div>
                </div>
              </button>
            ))}
          </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 hover:border-red-500/50 hover:bg-red-500/20 transition-all font-mono text-red-400 hover:text-red-300 flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-bold">Logout</span>
        </button>
      </div>
    </NeonModal>
  );
};
