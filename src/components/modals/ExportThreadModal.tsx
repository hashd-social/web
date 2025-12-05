import React from 'react';
import { Download, FileJson, Lock, Shield, Hash, Info } from 'lucide-react';
import { NeonModal } from './NeonModal';

interface ExportThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadData: any;
}

export const ExportThreadModal: React.FC<ExportThreadModalProps> = ({
  isOpen,
  onClose,
  threadData
}) => {
  const handleExport = () => {
    if (threadData) {
      const dataStr = JSON.stringify(threadData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hashd-thread-${threadData.threadId.slice(0, 10)}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      onClose();
    }
  };

  return (
    <NeonModal
      isOpen={isOpen}
      onClose={onClose}
      title="EXPORT.THREAD"
      icon={FileJson}
      maxWidth="2xl"
    >
      <div className="p-6 space-y-6">
        {/* Info Section */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-cyan-400 mb-2">What is exported?</h3>
              <p className="text-sm text-gray-300 font-mono leading-relaxed">
                A complete, cryptographically verified JSON file containing all messages in this conversation with signatures and hash chains.
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Export includes:</h3>
          <div className="space-y-2">
            <div className="flex items-start gap-3 text-sm">
              <Lock className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Encrypted Messages</p>
                <p className="text-gray-400 text-xs font-mono">All message content encrypted for each participant</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Shield className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Cryptographic Signatures</p>
                <p className="text-gray-400 text-xs font-mono">Each message signed by sender for verification</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Hash className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Hash Chain</p>
                <p className="text-gray-400 text-xs font-mono">Tamper-proof message ordering and integrity</p>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Use cases:</h3>
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-2 text-sm font-mono">
            <p className="text-gray-300">• <strong className="text-white">Legal Evidence:</strong> Cryptographically prove message authenticity</p>
            <p className="text-gray-300">• <strong className="text-white">Backup:</strong> Archive important conversations securely</p>
            <p className="text-gray-300">• <strong className="text-white">Audit Trail:</strong> Maintain verifiable communication records</p>
            <p className="text-gray-300">• <strong className="text-white">Cross-Platform:</strong> Import into other compatible systems</p>
          </div>
        </div>

        {/* Export Button */}
        <div className="pt-4 border-t border-gray-800">
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors font-bold uppercase tracking-wider"
          >
            <Download className="w-5 h-5" />
            Download Thread Export
          </button>
        </div>
      </div>
    </NeonModal>
  );
};
