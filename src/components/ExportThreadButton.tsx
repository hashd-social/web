import React, { useState } from 'react';
import { Download, FileJson, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { exportThreadArchive, ThreadFile } from '../utils/messageChain';
import { ethers } from 'ethers';

interface ExportThreadButtonProps {
  threadFile: ThreadFile;
  userAddress: string;
  className?: string;
}

export const ExportThreadButton: React.FC<ExportThreadButtonProps> = ({
  threadFile,
  userAddress,
  className = ''
}) => {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      // Get signer
      if (!window.ethereum) {
        throw new Error('No Ethereum provider found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Export archive
      console.log('📦 Exporting thread archive...');
      const archive = await exportThreadArchive(threadFile, userAddress, signer);

      // Create filename
      const timestamp = Date.now();
      const threadIdShort = threadFile.threadId.slice(0, 10);
      const filename = `hashd-thread-${threadIdShort}-${timestamp}.json`;

      // Download as JSON
      const blob = new Blob([JSON.stringify(archive, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ Archive exported:', filename);
      console.log('   Chain valid:', archive.chainVerification.valid);
      console.log('   Total messages:', archive.messages.length);
      console.log('   Verified messages:', archive.chainVerification.verifiedMessages);

      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (err: any) {
      console.error('Export failed:', err);
      setError(err.message || 'Export failed');
      setTimeout(() => setError(null), 5000);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        onClick={handleExport}
        disabled={exporting || exported}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg
          font-medium text-sm transition-all
          ${exported
            ? 'bg-green-500/20 border border-green-500/30 text-green-400 cursor-default'
            : error
            ? 'bg-red-500/20 border border-red-500/30 text-red-400'
            : exporting
            ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 cursor-wait'
            : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
          }
          disabled:opacity-50
        `}
      >
        {exporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Exporting...</span>
          </>
        ) : exported ? (
          <>
            <CheckCircle className="w-4 h-4" />
            <span>Exported!</span>
          </>
        ) : error ? (
          <>
            <AlertCircle className="w-4 h-4" />
            <span>Failed</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Export Thread</span>
          </>
        )}
      </button>

      {/* Info tooltip */}
      <div className="group relative">
        <FileJson className="w-4 h-4 text-gray-500 cursor-help" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl w-64">
            <p className="text-xs text-gray-300 leading-relaxed">
              Export this conversation with full cryptographic proof for legal or archival purposes.
            </p>
            <div className="mt-2 space-y-1 text-xs text-gray-400">
              <p>✓ All message signatures</p>
              <p>✓ Complete hash chain</p>
              <p>✓ Verification proof</p>
              <p>✓ Offline verifiable</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="absolute top-full mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 max-w-xs">
          {error}
        </div>
      )}
    </div>
  );
};
