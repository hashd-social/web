import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, ArrowLeft } from 'lucide-react';

export const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already-verified'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3002';
        const response = await fetch(`${apiUrl}/api/verify-email/${token}`);
        const data = await response.json();

        if (data.success) {
          if (data.alreadyVerified) {
            setStatus('already-verified');
            setMessage(data.message);
            setEmail(data.email);
          } else {
            // Redirect immediately to email-verified page without showing success state
            navigate(`/email-verified?email=${encodeURIComponent(data.email || '')}&userId=${encodeURIComponent(data.userId || '')}`);
            return;
          }
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('Failed to verify email. Please try again.');
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <div className="relative z-10 flex items-center justify-center min-h-screen p-4 hex-grid">
      <div className="max-w-2xl w-full text-center">
        
        {/* Loading State */}
        {status === 'loading' && (
          <>
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 mb-8">
              <Loader className="w-12 h-12 text-cyan-400 animate-spin" />
            </div>
            <h1 className="text-4xl font-bold neon-text-cyan mb-6 font-cyberpunk">VERIFYING...</h1>
            <p className="text-gray-400 text-lg">
              Please wait while we verify your email address.
            </p>
          </>
        )}

        {/* Success State */}
        {status === 'success' && (
          <>
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 mb-8">
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>
            <h1 className="text-4xl font-bold neon-text-cyan mb-6 font-cyberpunk">EMAIL VERIFIED!</h1>
            <p className="text-gray-400 text-lg mb-12 max-w-xl mx-auto leading-relaxed">
              Your email address has been successfully verified.
              {email && (
                <span className="block mt-4 text-cyan-400">
                  {email}
                </span>
              )}
              <span className="block mt-6 text-green-400">
                ✓ You're now on the HASHD waitlist!
              </span>
              <span className="block mt-2 text-gray-300">
                We'll notify you when we're ready to launch.
              </span>
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-12 py-4 cyber-button relative inline-flex items-center justify-center gap-2 text-sm overflow-hidden"
            >
              <ArrowLeft className="w-6 h-6" />
              RETURN TO HOME
            </button>
          </>
        )}

        {/* Already Verified State */}
        {status === 'already-verified' && (
          <>
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 mb-8">
              <CheckCircle className="w-12 h-12 text-cyan-400" />
            </div>
            <h1 className="text-4xl font-bold neon-text-cyan mb-6 font-cyberpunk">ALREADY VERIFIED</h1>
            <p className="text-gray-400 text-lg mb-12 max-w-xl mx-auto leading-relaxed">
              This email address has already been verified.
              <span className="block mt-6 text-cyan-400">
                You're all set! We'll notify you when we're ready to launch.
              </span>
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-12 py-4 cyber-button relative inline-flex items-center justify-center gap-2 text-sm overflow-hidden"
            >
              <ArrowLeft className="w-6 h-6" />
              RETURN TO HOME
            </button>
          </>
        )}

        {/* Error State */}
        {status === 'error' && (
          <>
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/30 mb-8">
              <XCircle className="w-12 h-12 text-red-400" />
            </div>
            <h1 className="text-4xl font-bold text-red-400 mb-6 font-cyberpunk">VERIFICATION FAILED</h1>
            <p className="text-gray-400 text-lg mb-12 max-w-xl mx-auto leading-relaxed">
              {message || 'We couldn\'t verify your email address.'}
              <span className="block mt-6 text-gray-300">
                The verification link may be invalid or expired. Please try joining the waitlist again.
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-2xl mx-auto">
              <button
                onClick={() => navigate('/')}
                className="px-12 py-4 cyber-button relative inline-flex items-center justify-center gap-2 text-sm overflow-hidden"
              >
                <ArrowLeft className="w-6 h-6" />
                RETURN TO HOME
              </button>
              <button
                onClick={() => navigate('/waitlist')}
                className="px-12 py-4 bg-gray-800/50 border border-cyan-500/30 hover:border-cyan-500/50 text-white rounded-lg relative inline-flex items-center justify-center gap-2 text-sm overflow-hidden transition-all hover:bg-gray-800/70"
              >
                JOIN WAITLIST
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
