import React, { useState } from 'react';
import { Twitter, MessageCircle, Send, Server, CheckCircle, Shield, Mail } from 'lucide-react';
import { DeploymentBadge } from './DeploymentBadge';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { DevToolsDrawer } from '../dev/DevToolsDrawer';

interface FooterProps {
  provider?: ethers.Provider | null;
  showZeroTrust?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ provider, showZeroTrust = false }) => {
  const navigate = useNavigate();
  const registryAddress = process.env.REACT_APP_DEPLOYMENT_REGISTRY || '';
  const [showDevTools, setShowDevTools] = useState(false);
  const isDev = process.env.NODE_ENV === 'development';

  // Create a read-only provider if none is passed
  const readProvider = React.useMemo(() => {
    if (provider) return provider;
    const rpcUrl = process.env.REACT_APP_RPC_URL || 'http://127.0.0.1:8545';
    return new ethers.JsonRpcProvider(rpcUrl);
  }, [provider]);

  return (
    <>
      {/* Zero Trust Architecture - Conditional */}


      <footer className="relative bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 neon-border-top mt-auto">
        <div className="absolute inset-0 opacity-10 hex-grid"></div>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-magenta-500 rounded-full mix-blend-screen filter blur-3xl"></div>
        </div>
        {showZeroTrust && (
          <div className=" border-b border-cyan-500/20 w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-blue-500/30 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#06B6D4_1px,transparent_1px)] bg-[length:50px_50px]"></div>
            </div>

            {/* Content Container */}
            <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
              <div className="text-center">
                {/* Main Title */}
                <h2 className="text-3xl font-bold neon-text-cyan uppercase tracking-wider mb-6 text-center font-mono section-title font-cyberpunk">
                  ZERO TRUST ARCHITECTURE
                </h2>

                {/* Description */}
                <p className="text-lg text-gray-300 mb-12 max-w-3xl mx-auto font-mono leading-relaxed">
                  HASHD runs on cryptography, not trust. The protocol has no central choke points—if the main site disappeared tomorrow, every identity, message, Guild, and marketplace would remain intact and accessible.
                </p>

                {/* Feature Grid - 3 Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                  <div className="p-4">
                    <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mb-4 mx-auto border-2 border-cyan-500/50">
                      <Server className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 font-mono uppercase">Backend-Free</h3>
                    <p className="text-gray-400 text-sm font-mono leading-relaxed">
                      Pure client + chain + ByteCave. No servers to seize, block, or fail. The stack stands even if the website disappears.
                    </p>
                  </div>

                  <div className="p-4">
                    <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mb-4 mx-auto border-2 border-cyan-500/50">
                      <CheckCircle className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 font-mono uppercase">On-Chain</h3>
                    <p className="text-gray-400 text-sm font-mono leading-relaxed">
                      Rules, permissions, and ordering are locked into smart contracts. The state is permanent, neutral, and globally verifiable.
                    </p>
                  </div>

                  <div className="p-4">
                    <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mb-4 mx-auto border-2 border-cyan-500/50">
                      <Shield className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 font-mono uppercase">Verifiable</h3>
                    <p className="text-gray-400 text-sm font-mono leading-relaxed">
                      Every build is open, inspectable, and hash-verified. Mirror it, extend it, or run your own client—trust the checksum, not the operator.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="relative z-10 px-6 py-8">
          <div className="max-w-7xl mx-auto">




            {/* Main Footer Content */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              {/* Brand - Logo */}
              <div className="col-span-1">
                <img
                  src="/logo.png"
                  alt="HASHD"
                  className={`w-32 h-32 object-contain ${isDev ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                  onClick={() => isDev && setShowDevTools(true)}
                  title={isDev ? 'Click for Dev Tools' : undefined}
                />
                {isDev && (
                  <p className="text-xs text-yellow-500 font-mono mt-1">🛠️ DEV MODE</p>
                )}
              </div>

              {/* Links - Column 1 */}
              <div className="col-span-1">
                <h4 className="text-sm font-bold neon-text-cyan mb-3 font-mono uppercase tracking-wider">Resources</h4>
                <ul className="space-y-2">

                  <li>
                    <button onClick={() => navigate('/faq')} className="text-xs text-gray-400 hover:text-cyan-400 transition-colors font-mono">
                      → FAQs
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate('/about')} className="text-xs text-gray-400 hover:text-cyan-400 transition-colors font-mono">
                      → About
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate('/documentation')} className="text-xs text-gray-400 hover:text-cyan-400 transition-colors font-mono">
                      → Documentation
                    </button>
                  </li>
                </ul>
              </div>

              {/* Links - Column 2 */}
              <div className="col-span-1">
                <h4 className="text-sm font-bold neon-text-cyan mb-3 font-mono uppercase tracking-wider">Legal</h4>
                <ul className="space-y-2">
                  <li>
                    <button onClick={() => navigate('/privacy')} className="text-xs text-gray-400 hover:text-cyan-400 transition-colors font-mono">
                      → Privacy Policy
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate('/terms')} className="text-xs text-gray-400 hover:text-cyan-400 transition-colors font-mono">
                      → Terms of Service
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate('/support')} className="text-xs text-gray-400 hover:text-cyan-400 transition-colors font-mono">
                      → Support
                    </button>
                  </li>
                </ul>
              </div>

              {/* Social Links */}
              <div className="col-span-1">
                <h4 className="text-sm font-bold neon-text-cyan mb-3 font-mono uppercase tracking-wider">Community</h4>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://x.com/hashdsocial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-gray-800/50 rounded-full hover:border-cyan-500/50 transition-all hover:scale-105"
                    title="X"
                  >
                    <svg className="w-4 h-4 neon-text-cyan" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <a
                    href="https://t.me/hashdsocial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-gray-800/50 rounded-full hover:border-cyan-500/50 transition-all hover:scale-105"
                    title="Telegram"
                  >
                    <svg className="w-4 h-4 neon-text-cyan" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472c-.18 1.898-.962 6.502-1.36 8.627c-.168.9-.499 1.201-.82 1.23c-.696.065-1.225-.46-1.9-.902c-1.056-.693-1.653-1.124-2.678-1.8c-1.185-.78-.417-1.21.258-1.91c.177-.184 3.247-2.977 3.307-3.23c.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345c-.48.33-.913.49-1.302.48c-.428-.008-1.252-.241-1.865-.44c-.752-.245-1.349-.374-1.297-.789c.027-.216.325-.437.893-.663c3.498-1.524 5.83-2.529 6.998-3.014c3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                  </a>
                  <a
                    href="mailto:connect@hashd.social"
                    className="p-2 bg-gray-800/50 rounded-full hover:border-cyan-500/50 transition-all hover:scale-105"
                    title="Email"
                  >
                    <Mail className="w-4 h-4 neon-text-cyan" />
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-6 border-t border-cyan-500/20">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-xs text-gray-500 font-mono">
                  © {new Date().getFullYear()} <a href="https://3oh.io" target="_blank" rel="noopener noreferrer" className="neon-text-cyan hover:text-cyan-300 transition-colors">3oh Inc</a>. All rights reserved.
                </p>



                {/* Deployment Verification Badge */}
                {/* {registryAddress && (
                <DeploymentBadge 
                  provider={readProvider} 
                  registryAddress={registryAddress}
                />
              )} */}

                <p className="text-xs text-gray-500 font-mono">
                  🔒 END-TO-END.ENCRYPTED
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Dev Tools Drawer */}
      {isDev && (
        <DevToolsDrawer
          isOpen={showDevTools}
          onClose={() => setShowDevTools(false)}
        />
      )}
    </>
  );
};

