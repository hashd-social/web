import React, { useState } from 'react';
import { Shield, Clock, Zap, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import { SESSION_DURATION_OPTIONS } from '../../utils/sessionConfig';

interface SessionInfo {
  address: string;
  expiresAt: number;
  remainingMinutes: number;
  isExpired: boolean;
}

interface SessionProgress {
  currentStep: number;
  totalSteps: number;
  steps: {
    title: string;
    description: string;
    status: 'pending' | 'active' | 'completed' | 'error';
  }[];
  sessionDuration?: string;
  sessionCost?: string;
}

interface SessionManagerProps {
  isEnabled: boolean;
  isCreatingSession: boolean;
  error: string | null;
  sessionInfo: SessionInfo | null;
  sessionProgress: SessionProgress | null;
  onCreateSession: (durationMinutes: number) => Promise<boolean>;
  onClearSession: () => void;
  onClearProgress: () => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  isEnabled,
  isCreatingSession,
  error,
  sessionInfo,
  sessionProgress,
  onCreateSession,
  onClearSession,
  onClearProgress
}) => {
  const [selectedDuration, setSelectedDuration] = useState(SESSION_DURATION_OPTIONS[1]); // Default to 1 hour
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);

  const handleCreateSession = async () => {
    console.log('UI: Starting session creation...', selectedDuration);
    try {
      const success = await onCreateSession(selectedDuration.minutes);
      console.log('UI: Session creation result:', success);
      if (success) {
        console.log('UI: Session created successfully!');
        setShowDurationDropdown(false);
      } else {
        console.log('UI: Session creation failed');
      }
    } catch (error) {
      console.error('UI: Session creation error:', error);
    }
  };

  const formatTimeRemaining = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    } else {
      const days = Math.floor(minutes / 1440);
      const remainingHours = Math.floor((minutes % 1440) / 60);
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'active':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  // Show session progress modal
  if (sessionProgress) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider font-mono">Setting up Session</h3>
            <button
              onClick={onClearProgress}
              className="text-gray-400 hover:text-cyan-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-300 mb-2 font-mono">
              <span>DURATION: {sessionProgress.sessionDuration}</span>
              <span>COST: {sessionProgress.sessionCost} ETH</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(sessionProgress.currentStep / sessionProgress.totalSteps) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {sessionProgress.steps.map((step, index) => (
              <div key={index} className="flex items-start space-x-3">
                {getStatusIcon(step.status)}
                <div className="flex-1">
                  <p className="font-bold text-white font-mono">{step.title}</p>
                  <p className="text-sm text-gray-400 font-mono">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <h3 className="text-lg font-bold neon-text-cyan uppercase tracking-wider font-mono">Account Abstraction</h3>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-sm text-red-300 font-mono">{error}</p>
          </div>
        </div>
      )}

      {isEnabled && sessionInfo ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-5 h-5 neon-text-green" />
              <span className="font-bold neon-text-green font-mono uppercase">Session Active</span>
            </div>
            <div className="text-sm text-gray-300 space-y-1 font-mono">
              <p>SESSION KEY: {sessionInfo.address.slice(0, 6)}...{sessionInfo.address.slice(-4)}</p>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>
                  {sessionInfo.isExpired 
                    ? 'EXPIRED' 
                    : `${formatTimeRemaining(sessionInfo.remainingMinutes)} REMAINING`
                  }
                </span>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClearSession}
              className="flex-1 px-4 py-2 bg-red-500/20 border border-red-500/50 hover:border-red-500 text-red-400 rounded-lg transition-all font-bold font-mono"
            >
              END SESSION
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm font-mono">
            Enable ZeroSig messaging by creating a session key. This allows you to perform actions
            without signing each transaction individually.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold neon-text-cyan uppercase tracking-wider font-mono">Session Duration</label>
              <div className="relative">
                <button
                  onClick={() => setShowDurationDropdown(!showDurationDropdown)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-900/50 rounded-lg hover:border-cyan-500/50 transition-colors"
                >
                  <span className="text-sm text-white font-mono">{selectedDuration.label}</span>
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showDurationDropdown && (
                  <div className="absolute right-0 mt-1 w-48 bg-gray-800 rounded-lg shadow-lg z-10">
                    {SESSION_DURATION_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setSelectedDuration(option);
                          setShowDurationDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 first:rounded-t-lg last:rounded-b-lg transition-colors"
                      >
                        <div className="font-bold text-sm text-white font-mono">{option.label}</div>
                        <div className="text-xs text-gray-400 font-mono">{option.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleCreateSession}
              disabled={isCreatingSession}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-cyan-500/10 hover:border-cyan-500/50 neon-text-cyan rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold font-mono"
            >
              {isCreatingSession ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>CREATING SESSION...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>CREATE SESSION</span>
                </>
              )}
            </button>
          </div>

          <div className="text-xs text-gray-400 space-y-1 font-mono">
            <p>• Session keys are temporary and expire automatically</p>
            <p>• Your main wallet remains secure</p>
            <p>• You can end the session at any time</p>
          </div>
        </div>
      )}
    </div>
  );
};
