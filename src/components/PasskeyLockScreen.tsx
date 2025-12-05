import React, { useState, useEffect } from 'react';
import { Shield, Fingerprint, AlertCircle } from 'lucide-react';
import { verifyPasskey } from '../services/passkeyService';

interface PasskeyLockScreenProps {
  onUnlock: () => void;
}

export const PasskeyLockScreen: React.FC<PasskeyLockScreenProps> = ({ onUnlock }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);

    try {
      const result = await verifyPasskey();
      
      if (result.success) {
        onUnlock();
      } else {
        setError(result.error || 'Verification failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-trigger verification on mount
  useEffect(() => {
    handleVerify();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Lock Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 mb-4">
            <Shield className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">App Locked</h1>
          <p className="text-gray-400">
            Use your passkey to unlock Hashd
          </p>
        </div>

        {/* Verification Card */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 backdrop-blur-sm">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-400 font-medium">Verification Failed</p>
                <p className="text-xs text-red-300/80 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Verify Button */}
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="w-full relative overflow-hidden bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-3 group disabled:cursor-not-allowed"
          >
            <Fingerprint className={`w-6 h-6 ${isVerifying ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
            <span className="text-lg">
              {isVerifying ? 'Verifying...' : 'Unlock with Passkey'}
            </span>
          </button>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center">
              You'll be prompted to use your device's biometric authentication
              (fingerprint, face ID, etc.) or security key to unlock the app.
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-600">
            Can't unlock? Disable passkey protection in your browser's settings
            or clear your browser data to reset.
          </p>
        </div>
      </div>
    </div>
  );
};
