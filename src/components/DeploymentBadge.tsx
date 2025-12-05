import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { ethers } from 'ethers';
import { verifyDeployment, VerificationResult } from '../utils/verifyDeployment';
import { DeploymentInfoModal } from './modals/DeploymentInfoModal';

interface DeploymentBadgeProps {
  provider: ethers.Provider | null;
  registryAddress: string;
}

export const DeploymentBadge: React.FC<DeploymentBadgeProps> = ({ 
  provider, 
  registryAddress
}) => {
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (provider && registryAddress) {
      verifyDeploymentStatus();
    }
  }, [provider, registryAddress]);

  const verifyDeploymentStatus = async () => {
    if (!provider) return;
    
    try {
      setLoading(true);
      const result = await verifyDeployment(provider, registryAddress);
      setVerification(result);
    } catch (error) {
      console.error('Verification failed:', error);
      setVerification({
        isApproved: false,
        isOfficial: false,
        isRejected: false,
        codeHash: '',
        error: 'Verification failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    if (loading) return <Shield className="w-4 h-4 animate-pulse" />;
    if (!verification) return <ShieldAlert className="w-4 h-4" />;
    if (verification.isRejected) return <ShieldX className="w-4 h-4" />;
    if (verification.isOfficial) return <ShieldCheck className="w-4 h-4" />;
    if (verification.isApproved) return <ShieldCheck className="w-4 h-4" />;
    return <ShieldAlert className="w-4 h-4" />;
  };

  const getColor = () => {
    if (loading) return 'text-gray-400';
    if (!verification) return 'text-yellow-400';
    if (verification.isRejected) return 'text-red-400';
    if (verification.isOfficial) return 'text-green-400';
    if (verification.isApproved) return 'text-cyan-400';
    return 'text-yellow-400';
  };

  const getBorderColor = () => {
    if (loading) return 'border-gray-500/20 hover:border-gray-500/50';
    if (!verification) return 'border-yellow-500/20 hover:border-yellow-500/50';
    if (verification.isRejected) return 'border-red-500/20 hover:border-red-500/50';
    if (verification.isOfficial) return 'border-green-500/20 hover:border-green-500/50';
    if (verification.isApproved) return 'border-cyan-500/20 hover:border-cyan-500/50';
    return 'border-yellow-500/20 hover:border-yellow-500/50';
  };

  const getLabel = () => {
    if (loading) return 'Verifying...';
    if (!verification) return 'Unknown';
    if (verification.isRejected) return 'REJECTED';
    if (verification.isOfficial) return 'OFFICIAL';
    if (verification.isApproved) return 'APPROVED';
    return 'UNVERIFIED';
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center space-x-2 px-3 py-2 bg-gray-800/50 rounded-lg border ${getBorderColor()} transition-all hover:scale-105`}
        title="Click to view deployment verification details"
      >
        <div className={getColor()}>
          {getIcon()}
        </div>
        <span className={`text-xs font-mono font-semibold ${getColor()}`}>
          {getLabel()}
        </span>
      </button>

      {/* Deployment Info Modal */}
      <DeploymentInfoModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        verification={verification}
      />
    </>
  );
};
