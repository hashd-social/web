import React from 'react';
import { X, Shield, ShieldCheck, ShieldAlert, ShieldX, Copy, ExternalLink, CheckCircle } from 'lucide-react';
import { VerificationResult } from '../../utils/verifyDeployment';

interface DeploymentInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  verification: VerificationResult | null;
}

export const DeploymentInfoModal: React.FC<DeploymentInfoModalProps> = ({
  isOpen,
  onClose,
  verification
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !verification) return null;

  const getStatusColor = () => {
    if (verification.isRejected) return 'text-red-400';
    if (verification.isOfficial) return 'text-green-400';
    if (verification.isApproved) return 'text-cyan-400';
    return 'text-yellow-400';
  };

  const getStatusBg = () => {
    if (verification.isRejected) return 'bg-red-500/10 border-red-500/30';
    if (verification.isOfficial) return 'bg-green-500/10 border-green-500/30';
    if (verification.isApproved) return 'bg-cyan-500/10 border-cyan-500/30';
    return 'bg-yellow-500/10 border-yellow-500/30';
  };

  const getStatusIcon = () => {
    if (verification.isRejected) return <ShieldX className="w-12 h-12" />;
    if (verification.isOfficial) return <ShieldCheck className="w-12 h-12" />;
    if (verification.isApproved) return <ShieldCheck className="w-12 h-12" />;
    return <ShieldAlert className="w-12 h-12" />;
  };

  const getStatusLabel = () => {
    if (verification.isRejected) return 'REJECTED DEPLOYMENT';
    if (verification.isOfficial) return 'OFFICIAL DEPLOYMENT';
    if (verification.isApproved) return 'COMMUNITY APPROVED';
    return 'UNVERIFIED DEPLOYMENT';
  };

  const getStatusMessage = () => {
    if (verification.isRejected) {
      return 'This deployment has been marked as malicious by the contract owner. DO NOT USE THIS SITE!';
    }
    if (verification.isOfficial) {
      return 'This is the official HASHD deployment, verified and approved by the HASHD team.';
    }
    if (verification.isApproved) {
      return `This deployment has been reviewed and approved by ${verification.deploymentInfo?.approvalCount || 0} community approvers.`;
    }
    return 'This deployment has not been verified by the community. Use with caution.';
  };

  const copyHash = () => {
    if (verification.codeHash) {
      navigator.clipboard.writeText(verification.codeHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-gray-900 rounded-lg border border-cyan-500/30 shadow-2xl">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${getStatusBg()}`}>
          <div className="flex items-center gap-4">
            <div className={getStatusColor()}>
              {getStatusIcon()}
            </div>
            <div>
              <h2 className={`text-xl font-bold font-mono ${getStatusColor()}`}>
                {getStatusLabel()}
              </h2>
              <p className="text-sm text-gray-400 font-mono mt-1">
                Deployment Verification Status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Message */}
          <div className={`p-4 rounded-lg border ${getStatusBg()}`}>
            <p className={`text-sm font-mono ${getStatusColor()}`}>
              {getStatusMessage()}
            </p>
          </div>

          {/* Deployment Info */}
          {verification.deploymentInfo && verification.deploymentInfo.submitter !== '0x0000000000000000000000000000000000000000' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-cyan-400 font-mono uppercase">
                Deployment Information
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Version */}
                {verification.deploymentInfo.version && (
                  <div>
                    <label className="text-xs text-gray-500 font-mono">Version</label>
                    <p className="text-sm text-white font-mono mt-1">
                      {verification.deploymentInfo.version}
                    </p>
                  </div>
                )}

                {/* Approvals */}
                {verification.deploymentInfo.approvalCount > 0 && (
                  <div>
                    <label className="text-xs text-gray-500 font-mono">Community Approvals</label>
                    <p className="text-sm text-cyan-400 font-mono mt-1 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {verification.deploymentInfo.approvalCount}
                    </p>
                  </div>
                )}

                {/* Submitter */}
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 font-mono">Submitted By</label>
                  <p className="text-sm text-white font-mono mt-1 break-all">
                    {verification.deploymentInfo.submitter}
                  </p>
                </div>

                {/* IPFS CID */}
                {verification.deploymentInfo.ipfsCID && (
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 font-mono">IPFS CID</label>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-white font-mono break-all flex-1">
                        {verification.deploymentInfo.ipfsCID}
                      </p>
                      <a
                        href={`https://ipfs.io/ipfs/${verification.deploymentInfo.ipfsCID}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-gray-800 rounded transition-colors"
                        title="View on IPFS"
                      >
                        <ExternalLink className="w-4 h-4 text-cyan-400" />
                      </a>
                    </div>
                  </div>
                )}

                {/* GitHub Commit */}
                {verification.deploymentInfo.githubCommit && (
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 font-mono">GitHub Commit</label>
                    <p className="text-sm text-white font-mono mt-1 break-all">
                      {verification.deploymentInfo.githubCommit}
                    </p>
                  </div>
                )}

                {/* Description */}
                {verification.deploymentInfo.description && (
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 font-mono">Description</label>
                    <p className="text-sm text-white font-mono mt-1">
                      {verification.deploymentInfo.description}
                    </p>
                  </div>
                )}

                {/* Timestamp */}
                {verification.deploymentInfo.timestamp > 0 && (
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 font-mono">Submitted</label>
                    <p className="text-sm text-white font-mono mt-1">
                      {new Date(verification.deploymentInfo.timestamp * 1000).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Code Hash */}
          <div>
            <label className="text-xs text-gray-500 font-mono">Deployment Hash (SHA-256)</label>
            <div className="flex items-center gap-2 mt-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <p className="text-xs text-white font-mono break-all flex-1">
                {verification.codeHash || 'Unknown'}
              </p>
              <button
                onClick={copyHash}
                className="p-2 hover:bg-gray-700 rounded transition-colors"
                title="Copy hash"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {verification.error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400 font-mono">
                ⚠️ {verification.error}
              </p>
            </div>
          )}

          {/* Security Notice */}
          <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <p className="text-xs text-gray-400 font-mono">
              <strong className="text-cyan-400">Security Notice:</strong> Only use deployments that are marked as OFFICIAL or COMMUNITY APPROVED. 
              Unverified deployments may be malicious mirrors attempting to steal your keys.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors text-cyan-400 font-mono text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
