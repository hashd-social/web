import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Twitter, Send, MessageCircle, ExternalLink, Copy } from 'lucide-react';

export const EmailVerified: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPostSection, setShowPostSection] = useState(true);
  const [postUrl, setPostUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  const email = searchParams.get('email') || '';
  const userId = searchParams.get('userId') || '';

  const suggestedPost = `Signed up for @hashdsocial — a protocol that puts identity, messaging, and communities back in the hands of users.

Built on @megaeth, fast enough to feel like Web2, sovereign enough to outlive any platform.
Your data. Your rules.

https://hashd.social

#HASHD #MegaETH`;

  const copyPost = () => {
    navigator.clipboard.writeText(suggestedPost);
  };

  const openTwitter = () => {
    const postText = encodeURIComponent(suggestedPost);
    
    // Detect platform and try native app schemes
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid;
    
    if (isMobile) {
      // Try native app URL schemes
      let nativeUrl: string;
      if (isIOS) {
        // iOS Twitter app scheme
        nativeUrl = `twitter://post?message=${postText}`;
      } else if (isAndroid) {
        // Android Twitter app intent
        nativeUrl = `intent://post?message=${postText}#Intent;scheme=twitter;package=com.twitter.android;S.browser_fallback_url=https%3A%2F%2Fx.com%2Fintent%2Fpost%3Ftext%3D${postText};end`;
      } else {
        // Fallback for other mobile platforms
        nativeUrl = `https://x.com/intent/post?text=${postText}`;
      }
      
      // Try to open native app
      window.location.href = nativeUrl;
      
      // Fallback to web version after delay if app doesn't open
      setTimeout(() => {
        if (document.hasFocus()) {
          // If page still has focus, app didn't open
          window.open(`https://x.com/intent/post?text=${postText}`, '_blank');
        }
      }, 1500);
    } else {
      // Desktop - open web version
      window.open(`https://x.com/intent/post?text=${postText}`, '_blank');
    }
  };

  const savePostUrl = async () => {
    if (!postUrl.trim()) {
      setSaveStatus('error');
      setSaveMessage('Please enter a post URL');
      return;
    }

    if (!userId) {
      setSaveStatus('error');
      setSaveMessage('User verification failed. Please try again from the email link.');
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/api/waitlist/save-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          postUrl: postUrl.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSaveStatus('success');
        setSaveMessage('Post URL saved! We will verify it automatically nearer to launch.');
        setShowPostSection(false);
      } else {
        setSaveStatus('error');
        setSaveMessage(data.message || 'Failed to save post URL');
      }
    } catch (error) {
      console.error('Save post URL error:', error);
      setSaveStatus('error');
      setSaveMessage('Failed to save post URL. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative z-10 flex items-center justify-center min-h-screen p-4 min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 py-12">
      <div className="max-w-2xl w-full text-center">
        
    
                  <div className="bg-green-900/20 border-green-500/50 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <h3 className="text-xl font-bold text-green-400 font-mono">EMAIL VERIFIED!</h3>
            </div>
            <p className="text-gray-300 font-mono">
               Your email has been verified successfully and you are now on the HASHD waitlist ✓
            </p>
          </div>

        {/* Success message after post URL is saved */}
        {saveStatus === 'success' && (
          <div className="bg-orange-900/20 border-orange-500/50 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-orange-400" />
              <h3 className="text-xl font-bold text-orange-400 font-mono">SHARED ON X!</h3>
            </div>
            <p className="text-gray-300 font-mono">
              Your post has been saved and your airdrop allocation will be increased! 🚀
            </p>
          </div>
        )}

        {/* Post Promotion Section */}
        {showPostSection && (
          <div className="bg-cyan-900/20 border-cyan-500/50  rounded-xl p-8 mb-8 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-3 mb-6">
                   <svg className="w-6 h-6 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <h2 className="text-xl font-bold text-cyan-400 font-mono">BOOST YOUR AIRDROP!</h2>
            </div>
            
            <p className="text-gray-300 text-lg mb-6 font-mono">
              Share HASHD on X to <span className="font-bold">increase your airdrop allocation</span>
            </p>

            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
  <h3 className="text-white font-mono font-bold">Post on X:</h3>
                <button
                  onClick={copyPost}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-gray-300 hover:text-white hover:border-gray-500 transition-all"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
              <div className="text-left text-gray-300 font-mono text-sm whitespace-pre-line ">
                {suggestedPost}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <button
                onClick={openTwitter}
                className="flex-1 px-8 py-4 cyber-button relative inline-flex items-center justify-center gap-2 text-sm overflow-hidden"
              >
                <ExternalLink className="w-5 h-5" />
                POST ON X
              </button>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <h4 className="text-white font-mono font-bold mb-4">Verify Your Post:</h4>


              
              <p className="text-gray-400 text-sm mb-4 font-mono">
                After posting, paste your post URL below so we can verify it automatically nearer to launch
              </p>

              {saveStatus === 'success' && (
                <div className="my-4 p-4 bg-green-900/20 border border-green-500/50 rounded-lg">
                  <p className="text-green-400 font-mono text-sm">
                    ✅ {saveMessage}
                  </p>
                </div>
              )}

              {saveStatus === 'error' && (
                <div className="my-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 font-mono text-sm">
                    ❌ {saveMessage}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="url"
                  value={postUrl}
                  onChange={(e) => setPostUrl(e.target.value)}
                  placeholder="https://x.com/username/status/..."
                  className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors font-mono"
                />
                <button
                  onClick={savePostUrl}
                  disabled={isSaving || !postUrl.trim()}
                  className="px-8 py-3 cyber-button relative inline-flex items-center justify-center gap-2 text-sm overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      SAVING...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      SAVE POST
                    </>
                  )}
                </button>
              </div>

              <p className="text-gray-400 text-sm mt-4 font-mono text-center">
                ⚠️ Keep your post live to maintain your increased allocation.
              </p>
            </div>
          </div>
        )}

        {/* Stay Connected Section */}
        {!showPostSection && (
          <>
            <div className="bg-gray-800/50 border-gray-700 rounded-xl p-6 mb-8 backdrop-blur-sm">
              <h3 className="text-lg font-bold text-white mb-4 font-mono">STAY CONNECTED</h3>
              <p className="text-gray-400 text-sm mb-4 font-mono">
                Follow us for updates and announcements
              </p>
              <div className="flex justify-center gap-4">
                <a
                  href="https://twitter.com/hashdsocial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-gray-900/50 rounded-full border border-cyan-500/30 hover:border-cyan-500/50 transition-all hover:scale-110"
                  title="X (formerly Twitter)"
                >
                  <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a
                  href="https://t.me/hashdsocial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-gray-900/50 rounded-full border border-cyan-500/30 hover:border-cyan-500/50 transition-all hover:scale-110"
                  title="Telegram"
                >
                  <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472c-.18 1.898-.962 6.502-1.36 8.627c-.168.9-.499 1.201-.82 1.23c-.696.065-1.225-.46-1.9-.902c-1.056-.693-1.653-1.124-2.678-1.8c-1.185-.78-.417-1.21.258-1.91c.177-.184 3.247-2.977 3.307-3.23c.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345c-.48.33-.913.49-1.302.48c-.428-.008-1.252-.241-1.865-.44c-.752-.245-1.349-.374-1.297-.789c.027-.216.325-.437.893-.663c3.498-1.524 5.83-2.529 6.998-3.014c3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </a>
              </div>
            </div>

            <button
              onClick={() => navigate('/')}
              className="px-12 py-4 cyber-button relative inline-flex items-center justify-center gap-2 text-sm overflow-hidden"
            >
              <ArrowLeft className="w-6 h-6" />
              RETURN TO HOME
            </button>
          </>
        )}
      </div>

    </div>
  );
};
