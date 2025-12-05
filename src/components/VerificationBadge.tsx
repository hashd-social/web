import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Info, CheckCircle2, AlertTriangle } from 'lucide-react';

interface VerificationBadgeProps {
  chainValid: boolean;
  totalMessages: number;
  verifiedMessages: number;
  errors?: Array<{
    index: number;
    messageId: string;
    error: string;
    severity: 'CRITICAL' | 'WARNING';
  }>;
  className?: string;
  showDetails?: boolean;
  onClick?: () => void;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  chainValid,
  totalMessages,
  verifiedMessages,
  errors = [],
  className = '',
  showDetails = false,
  onClick
}) => {
  const [expanded, setExpanded] = useState(false);

  const criticalErrors = errors.filter(e => e.severity === 'CRITICAL').length;
  const warnings = errors.filter(e => e.severity === 'WARNING').length;

  if (chainValid) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <button
          onClick={onClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full hover:bg-green-500/20 hover:border-green-500/50 transition-colors cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4 text-green-400" />
          <span className="text-xs font-medium text-green-400">Verified</span>
        </button>
        
        {showDetails && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>
        )}

        {expanded && (
          <div className="absolute z-50 mt-2 p-4 bg-gray-900 border border-green-500/30 rounded-lg shadow-xl min-w-[300px]">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <h4 className="font-semibold text-green-400">Chain Verified</h4>
              </div>
              
              <div className="space-y-1 text-sm">
                <p className="text-gray-300">
                  All {totalMessages} messages verified:
                </p>
                <ul className="space-y-1 text-gray-400 ml-4">
                  <li>✓ Signatures valid</li>
                  <li>✓ Hash chain unbroken</li>
                  <li>✓ No tampering detected</li>
                </ul>
              </div>

              <div className="pt-2 border-t border-gray-700">
                <p className="text-xs text-gray-500">
                  This conversation is cryptographically secure and court-admissible.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full hover:bg-red-500/20 hover:border-red-500/50 transition-colors cursor-pointer"
      >
        <ShieldAlert className="w-4 h-4 text-red-400" />
        <span className="text-xs font-medium text-red-400">
          {criticalErrors > 0 ? 'Invalid' : 'Warning'}
        </span>
      </button>

      {showDetails && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
        >
          <Info className="w-4 h-4" />
        </button>
      )}

      {expanded && (
        <div className="absolute z-50 mt-2 p-4 bg-gray-900 border border-red-500/30 rounded-lg shadow-xl min-w-[300px] max-w-md">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h4 className="font-semibold text-red-400">Verification Issues</h4>
            </div>
            
            <div className="space-y-2 text-sm">
              <p className="text-gray-300">
                {verifiedMessages} of {totalMessages} messages verified
              </p>

              {criticalErrors > 0 && (
                <div className="p-2 bg-red-500/10 border border-red-500/20 rounded">
                  <p className="text-red-400 font-medium">
                    {criticalErrors} Critical Error{criticalErrors > 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {warnings > 0 && (
                <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                  <p className="text-yellow-400 font-medium">
                    {warnings} Warning{warnings > 1 ? 's' : ''}
                  </p>
                </div>
              )}

              <div className="max-h-40 overflow-y-auto space-y-2 mt-2">
                {errors.slice(0, 5).map((error, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded text-xs ${
                      error.severity === 'CRITICAL'
                        ? 'bg-red-500/5 border border-red-500/20 text-red-300'
                        : 'bg-yellow-500/5 border border-yellow-500/20 text-yellow-300'
                    }`}
                  >
                    <p className="font-medium">Message #{error.index + 1}</p>
                    <p className="text-gray-400 mt-1">{error.error}</p>
                  </div>
                ))}
                {errors.length > 5 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{errors.length - 5} more issues
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-700">
              <p className="text-xs text-gray-500">
                ⚠️ This conversation may have been tampered with. Use caution.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
