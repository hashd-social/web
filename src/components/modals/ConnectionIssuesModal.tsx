import React from 'react';
import { Info } from 'lucide-react';
import { NeonModal, NeonButton } from './NeonModal';
import { resetAndReload } from '../../utils/resetApp';

interface ConnectionIssuesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectionIssuesModal: React.FC<ConnectionIssuesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const handleClearData = () => {
    resetAndReload();
  };

  return (
    <NeonModal
      isOpen={isOpen}
      onClose={onClose}
      title="CONNECTION.ISSUES"
      icon={Info}
      maxWidth="lg"
    >
      <div className="p-6">
        <div className="space-y-6">
 
        <div className="space-y-4">
          <p className="text-sm text-gray-300 font-mono leading-relaxed">
            If you're experiencing wallet connection problems, try these solutions in order:
          </p>
          
          {/* Troubleshooting Steps */}
          <div className="">
            <h4 className="text-sm font-bold neon-text-cyan mb-6 font-mono uppercase">
              STEP.BY.STEP.SOLUTIONS
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold neon-text-cyan font-mono">1</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white font-mono">REFRESH.PAGE</p>
                  <p className="text-xs text-gray-400 font-mono">
                    Simple page refresh often resolves temporary connection issues
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold neon-text-cyan font-mono">2</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white font-mono">CHECK.WALLET.STATUS</p>
                  <p className="text-xs text-gray-400 font-mono">
                    Ensure MetaMask or your wallet is unlocked and connected to the MegaEth network
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold neon-text-cyan font-mono">3</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white font-mono">RESTART.WALLET</p>
                  <p className="text-xs text-gray-400 font-mono">
                    Close and reopen your wallet extension, then try connecting again
                  </p>
                </div>
              </div>
            
            </div>
          </div>
          
          {/* Data Reset Section */}
          <div className="bg-gray-900/50 rounded-lg p-4">
            <h4 className="text-sm font-bold neon-text-cyan mb-3 font-mono uppercase">
              NUCLEAR.OPTION: DATA.RESET
            </h4>
            <div className="space-y-3">
              <p className="text-sm text-gray-300 font-mono leading-relaxed">
                If all else fails, clearing your site data will reset the app to factory defaults. 
                This is safe and will not affect your blockchain data.
              </p>
              

            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="pt-4 border-t border-cyan-500/20 flex gap-3">
          <NeonButton
            onClick={onClose}
            variant="cyan"
            className="flex-1"
          >
            CLOSE
          </NeonButton>
          <NeonButton
            onClick={handleClearData}
            variant="red"
            className="flex-1"
          >
            RESET
          </NeonButton>
        </div>
        </div>
      </div>
    </NeonModal>
  );
};
