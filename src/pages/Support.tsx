import React from 'react';
import { ArrowLeft, MessageCircle, Twitter, Send, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Support: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-mono">Back to Home</span>
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold neon-text-cyan mb-4 font-cyberpunk">SUPPORT</h1>
          <p className="text-gray-400 text-lg font-mono">
            Get help from the community
          </p>
        </div>

        {/* Content */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 backdrop-blur-sm space-y-6">
          
          <p className="text-gray-300 font-mono leading-relaxed text-center">
            HASHD is a decentralized protocol with no central support team. 
            For help, reach out to the community on these platforms:
          </p>

          {/* Support Channels */}
          <div className="space-y-4 pt-4">
            
            {/* X */}
            <a
              href="https://x.com/hashdsocial"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-gray-900/50 rounded-lg border border-cyan-500/20 hover:border-cyan-500/50 hover:bg-gray-900/70 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center border-2 border-cyan-500/50 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white font-mono">X</h3>
                <p className="text-sm text-gray-400 font-mono">@hashdsocial</p>
              </div>
              <span className="text-cyan-400 font-mono text-sm">→</span>
            </a>

            {/* Telegram */}
            <a
              href="https://t.me/hashdsocial"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-gray-900/50 rounded-lg border border-cyan-500/20 hover:border-cyan-500/50 hover:bg-gray-900/70 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center border-2 border-cyan-500/50 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472c-.18 1.898-.962 6.502-1.36 8.627c-.168.9-.499 1.201-.82 1.23c-.696.065-1.225-.46-1.9-.902c-1.056-.693-1.653-1.124-2.678-1.8c-1.185-.78-.417-1.21.258-1.91c.177-.184 3.247-2.977 3.307-3.23c.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345c-.48.33-.913.49-1.302.48c-.428-.008-1.252-.241-1.865-.44c-.752-.245-1.349-.374-1.297-.789c.027-.216.325-.437.893-.663c3.498-1.524 5.83-2.529 6.998-3.014c3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white font-mono">Telegram</h3>
                <p className="text-sm text-gray-400 font-mono">Chat with the community</p>
              </div>
              <span className="text-cyan-400 font-mono text-sm">→</span>
            </a>

            {/* Email */}
            <a
              href="mailto:support@hashd.social"
              className="flex items-center gap-4 p-4 bg-gray-900/50 rounded-lg border border-cyan-500/20 hover:border-cyan-500/50 hover:bg-gray-900/70 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center border-2 border-cyan-500/50 group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white font-mono">Email</h3>
                <p className="text-sm text-gray-400 font-mono">support@hashd.social</p>
              </div>
              <span className="text-cyan-400 font-mono text-sm">→</span>
            </a>

          </div>

          {/* FAQ Link */}
          <div className="pt-6 border-t border-gray-700 text-center">
            <p className="text-gray-400 font-mono text-sm mb-4">
              Check out the FAQ for common questions
            </p>
            <button
              onClick={() => navigate('/faq')}
              className="px-8 py-3 cyber-button relative inline-flex items-center justify-center gap-2 text-sm overflow-hidden"
            >
              VIEW FAQ
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
