import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert, ExternalLink } from 'lucide-react';
import { NeonModal } from './NeonModal';
import { useSettingsStore } from '../../store/settingsStore';

interface ThreadVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  chainValid: boolean;
  totalMessages: number;
  verifiedMessages: number;
  threadId?: string;
  threadCID?: string | null;
  ackRequired?: boolean;
  errors?: Array<{
    index: number;
    messageId: string;
    error: string;
    severity: 'CRITICAL' | 'WARNING';
  }>;
}

export const ThreadVerificationModal: React.FC<ThreadVerificationModalProps> = ({
  isOpen,
  onClose,
  chainValid,
  totalMessages,
  verifiedMessages,
  threadId,
  threadCID,
  ackRequired = false,
  errors = []
}) => {
  const { ipfsGateway } = useSettingsStore();
  const criticalErrors = errors.filter(e => e.severity === 'CRITICAL').length;
  const warnings = errors.filter(e => e.severity === 'WARNING').length;

  return (
    <NeonModal
      isOpen={isOpen}
      onClose={onClose}
      title={chainValid ? "THREAD.VERIFIED" : "VERIFICATION.ISSUES"}
      icon={chainValid ? ShieldCheck : ShieldAlert}
      maxWidth="2xl"
    >
      <div className="p-6 space-y-6">
        {chainValid ? (
          <>
            {/* Verified State */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-green-400">Chain Verified</h3>
                  <p className="text-sm text-gray-300 mt-1">
                    All {totalMessages} messages have been cryptographically verified
                  </p>
                </div>
              </div>
            </div>

            {/* Verification Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Verification Checks:</h4>
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <div>
                    <p className="text-white font-medium">Signatures Valid</p>
                    <p className="text-xs text-gray-400 font-mono">All messages signed by verified senders</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <div>
                    <p className="text-white font-medium">Hash Chain Unbroken</p>
                    <p className="text-xs text-gray-400 font-mono">Message sequence is tamper-proof</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <div>
                    <p className="text-white font-medium">No Tampering Detected</p>
                    <p className="text-xs text-gray-400 font-mono">Content integrity verified</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 bg-green-400 rounded-full ${ackRequired ? 'bg-blue-400' : 'bg-gray-500'}`}></div>
                  <div>
                    <p className="text-white font-medium">Acknowledgments</p>
                    <p className="text-xs text-gray-400 font-mono">
                      {ackRequired ? 'Enabled - Acknowledgments tracked on-chain' : 'Disabled - No acknowledgment tracking'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* IPFS Link */}
            {threadCID && (
              <div className="pt-4 border-t border-gray-700/50">
                <a
                  href={`${ipfsGateway}/${threadCID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-mono"
                >
                  <ExternalLink className="w-4 h-4" />
                  View thread file on IPFS
                </a>
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  CID: {threadCID.slice(0, 16)}...{threadCID.slice(-8)}
                </p>
              </div>
            )}

          </>
        ) : (
          <>
            {/* Invalid State */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-red-400">Verification Issues Detected</h3>
                  <p className="text-sm text-gray-300 mt-1">
                    {verifiedMessages} of {totalMessages} messages verified
                  </p>
                </div>
              </div>
            </div>

            {/* Error Summary */}
            <div className="space-y-3">
              {criticalErrors > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 font-bold">
                    {criticalErrors} Critical Error{criticalErrors > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Messages may have been tampered with</p>
                </div>
              )}

              {warnings > 0 && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-400 font-bold">
                    {warnings} Warning{warnings > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Minor verification issues detected</p>
                </div>
              )}
            </div>

            {/* Error Details */}
            {errors.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Issue Details:</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {errors.slice(0, 10).map((error, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg text-sm ${
                        error.severity === 'CRITICAL'
                          ? 'bg-red-500/5 border border-red-500/20'
                          : 'bg-yellow-500/5 border border-yellow-500/20'
                      }`}
                    >
                      <p className={`font-bold ${
                        error.severity === 'CRITICAL' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        Message #{error.index + 1}
                      </p>
                      <p className="text-gray-300 mt-1 font-mono text-xs">{error.error}</p>
                    </div>
                  ))}
                  {errors.length > 10 && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      +{errors.length - 10} more issues
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Warning Notice */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-red-300 font-mono">
                <strong className="text-red-400">⚠️ Security Warning:</strong><br/>
                This conversation may have been tampered with. Do not rely on it for legal or security-critical purposes.
              </p>
            </div>
          </>
        )}
      </div>
    </NeonModal>
  );
};
