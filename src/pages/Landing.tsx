import React, { useState, useEffect } from 'react';
import { Wallet, Shield, Key, Info, Inbox, Zap, Users, Database, Lock, Coins, Award, Server, CheckCircle, Fingerprint, HardDrive, Code, ChevronDown, Settings, Link } from 'lucide-react';
import { Footer } from '../components/Footer';
import { useSettingsStore } from '../store/settingsStore';
import { ConnectionIssuesModal } from '../components/modals/ConnectionIssuesModal';
import { SecurityModeModal } from '../components/modals/SecurityModeModal';
import { parseErrorMessage } from '../utils/errorParser';
import { useNavigate } from 'react-router-dom';

interface LandingProps {
  onConnect: () => void;
  loading: boolean;
  error: string | null;
  onClearError: () => void;
}

export const Landing: React.FC<LandingProps> = ({ onConnect, loading, error, onClearError }) => {
  const navigate = useNavigate();
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const isWaitlistMode = process.env.REACT_APP_WAITLIST_MODE === 'true';

  // Reset scroll position on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Connection Area Component
  const ConnectionArea = () => {
    if (isWaitlistMode) {
      return (
        <div className="flex flex-col items-center">
   
          <button
            onClick={() => navigate('/waitlist')}
            className="px-12 py-4 cyber-button relative inline-flex items-center justify-center gap-2 text-sm overflow-hidden"
          >
            <Users className="w-6 h-6" />
            JOIN THE WAITLIST
          </button>
          
  
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center">
        <button
          onClick={onConnect}
          disabled={loading}
          className="px-12 py-4 cyber-button relative inline-flex items-center justify-center gap-2 text-sm overflow-hidden"
        >
          <Wallet className="w-6 h-6" />
          {loading ? 'CONNECTING...' : 'CONNECT WALLET'}
        </button>
        
        {/* Security Mode Button */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setShowSecurityModal(true)}
            className="px-6 py-2.5 bg-gray-800/50 border border-cyan-500/30 rounded-lg hover:border-cyan-500/50 hover:bg-gray-800/70 transition-all flex items-center gap-2"
          >
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-mono text-cyan-400">Security Mode</span>
          </button>
        </div>
        
        {/* Connection Issues Link */}
        <button
          onClick={() => setShowConnectionModal(true)}
          className="text-sm text-gray-400 hover:text-cyan-400 transition-colors font-mono underline underline-offset-4 hover:underline-offset-2 mt-4"
        >
          Connection Issues?
        </button>
      </div>
    );
  };

  return (
    
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-5 hex-grid"></div>
      <div className="absolute inset-0 opacity-10 overflow-hidden">
        <div className="absolute w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl animate-float-1"></div>
        <div className="absolute w-80 h-80 bg-magenta-500 rounded-full mix-blend-screen filter blur-3xl animate-float-2"></div>
        <div className="absolute w-72 h-72 bg-blue-400 rounded-full mix-blend-screen filter blur-3xl animate-float-3"></div>
      </div>
      
      {/* Floating Bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-3 h-3 bg-cyan-400/40 rounded-full animate-bubble" style={{left: '10%', animationDelay: '0s'}}></div>
        <div className="absolute w-2 h-2 bg-green-400/40 rounded-full animate-bubble" style={{left: '25%', animationDelay: '2s'}}></div>
        <div className="absolute w-4 h-4 bg-blue-400/40 rounded-full animate-bubble" style={{left: '40%', animationDelay: '4s'}}></div>
        <div className="absolute w-2 h-2 bg-purple-400/40 rounded-full animate-bubble" style={{left: '55%', animationDelay: '1s'}}></div>
        <div className="absolute w-3 h-3 bg-cyan-400/40 rounded-full animate-bubble" style={{left: '70%', animationDelay: '3s'}}></div>
        <div className="absolute w-2 h-2 bg-green-400/40 rounded-full animate-bubble" style={{left: '85%', animationDelay: '5s'}}></div>
        <div className="absolute w-3 h-3 bg-blue-400/40 rounded-full animate-bubble" style={{left: '15%', animationDelay: '6s'}}></div>
        <div className="absolute w-2 h-2 bg-purple-400/40 rounded-full animate-bubble" style={{left: '90%', animationDelay: '2.5s'}}></div>
      </div>
      
      {/* CSS Animation Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float-1 {
            0% { transform: translate(10vw, 20vh) scale(1); }
            25% { transform: translate(70vw, 10vh) scale(1.1); }
            50% { transform: translate(80vw, 60vh) scale(0.9); }
            75% { transform: translate(20vw, 80vh) scale(1.05); }
            100% { transform: translate(10vw, 20vh) scale(1); }
          }
          
          @keyframes float-2 {
            0% { transform: translate(70vw, 70vh) scale(0.8); }
            33% { transform: translate(20vw, 30vh) scale(1.2); }
            66% { transform: translate(60vw, 15vh) scale(0.9); }
            100% { transform: translate(70vw, 70vh) scale(0.8); }
          }
          
          @keyframes float-3 {
            0% { transform: translate(40vw, 10vh) scale(1.1); }
            20% { transform: translate(10vw, 50vh) scale(0.7); }
            40% { transform: translate(75vw, 40vh) scale(1.3); }
            60% { transform: translate(50vw, 75vh) scale(0.9); }
            80% { transform: translate(15vw, 65vh) scale(1.1); }
            100% { transform: translate(40vw, 10vh) scale(1.1); }
          }
          
          .animate-float-1 {
            animation: float-1 20s ease-in-out infinite;
          }
          
          .animate-float-2 {
            animation: float-2 25s ease-in-out infinite reverse;
          }
          
          .animate-float-3 {
            animation: float-3 30s ease-in-out infinite;
            animation-delay: -5s;
          }
          
          @keyframes bubbleFloat {
            0% { 
              transform: translateY(120vh) translateX(0px) scale(0);
              opacity: 0;
            }
            15% {
              opacity: 0.6;
              transform: translateY(85vh) translateX(10px) scale(1);
            }
            75% {
              opacity: 0.6;
              transform: translateY(25vh) translateX(-10px) scale(1);
            }
            85% {
              opacity: 0;
              transform: translateY(15vh) translateX(0px) scale(0.5);
            }
            100% {
              opacity: 0;
              transform: translateY(-20vh) translateX(0px) scale(0);
            }
          }
          
          .animate-bubble {
            animation: bubbleFloat 8s ease-in-out infinite;
            transform: translateY(120vh);
            opacity: 0;
          }
          
          @media (max-width: 768px) {
            .feature-title {
              font-size: 0.875rem !important;
            }
            .section-title {
              font-size: 1.5rem !important;
            }
          }
          
          .neon-title {
            color: #01fe57;
            text-shadow: 0 0 15px #01fe57;
          }
        `
      }} />


      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 hex-grid">
        <div className="max-w-7xl w-full">
          {/* Hero Section */}
          <div className="text-center">
            <div className="flex justify-center my-12">
              <div className="relative w-40 h-40 flex items-center justify-center">
                {/* Animated glow rings */}
                <div className="absolute inset-0 rounded-full"></div>
         
                
                {/* Logo container */}
                <div className="relative w-48 h-48 flex items-center justify-center overflow-hidden">
                  <img 
                    src="/logo.png" 
                    alt="Hashd Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
            
            <h1 className="text-7xl md:text-8xl font-bold neon-text-cyan tracking-wider mb-4 font-cyberpunk relative">
              <span className="relative inline-block">
                HASHD
              </span>
            </h1>
             <p className="text-lg md:text-xl text-gray-300 font-mono max-w-6xl mx-auto leading-relaxed">
                A cryptographic communication layer built to survive censorship.
              </p>

              <p className="text-lg md:text-xl text-gray-300 font-mono max-w-6xl mx-auto leading-relaxed">
                <span>Powered by </span>
                <a href="https://www.megaeth.com/" target="_blank" rel="noopener noreferrer" className="inline-block hover:opacity-80 transition-opacity">
                  <img src="/megaeth-line.svg" alt="MegaETH" className="h-6 inline-block brightness-0 invert" />
                </a>
              </p>

          </div>

          {/* What is HASHD - 3 Pillars */}
          <div className="py-12 px-4">


            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {/* Messaging Pillar */}
              <button 
                onClick={() => document.getElementById('messaging-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="relative group w-full text-left"
              >

                <div className='p-6'>
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center border-2 border-purple-500/50">
                      <Inbox className="w-10 h-10 text-purple-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-purple-400 uppercase font-mono text-center mb-0 min-h-[3.5rem] flex items-center justify-center">
                    BULLET-PROOF MESSAGING
                  </h3>
                    <p className="text-lg text-gray-300 text-center mb-12 max-w-3xl mx-auto font-mono leading-relaxed">
                    End-to-end encrypted private messages with deterministic multi-identity mailboxes
                  </p>
                </div>
              </button>

              {/* Guilds Pillar */}
              <button 
                onClick={() => document.getElementById('guilds-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="relative group w-full text-left"
              >

                   <div className='p-6'>
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-500/50">
                      <Users className="w-10 h-10 text-green-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-green-400 uppercase font-mono text-center mb-0 min-h-[3.5rem] flex items-center justify-center">
                    SOVEREIGN GUILDS
                  </h3>
                     <p className="text-lg text-gray-300 text-center mb-12 max-w-3xl mx-auto font-mono leading-relaxed">
                    Sovereign communities with token economies, encrypted posts, and on-chain governance
                  </p>
                </div>
              </button>

              {/* Marketplaces Pillar */}
              <button 
                onClick={() => document.getElementById('marketplaces-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="relative group w-full text-left"
              >

                   <div className='p-6'>
                  <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center border-2 border-orange-500/50">
                      <Coins className="w-10 h-10 text-orange-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-orange-400 uppercase font-mono text-center mb-0 min-h-[3.5rem] flex items-center justify-center">
                    UNSTOPPABLE MARKETPLACES
                  </h3>
                     <p className="text-lg text-gray-300 text-center mb-12 max-w-3xl mx-auto font-mono leading-relaxed">
                    Censorship-resistant commerce with encrypted listings and on-chain settlement
                  </p>
                </div>
              </button>
            </div>

            {/* Bottom tagline */}
    
          </div>
  <ConnectionArea />
          {/* Section Divider */}
          <div className="flex justify-center py-12">
            <ChevronDown className="w-8 h-8 text-cyan-500/30 animate-bounce" />
          </div>

          {/* Core Features */}
          <div className="mb-16 py-16 px-4 -mx-4">
            <h2 className="text-3xl font-bold neon-text-cyan uppercase tracking-wider mb-6 text-center font-cyberpunk">
              CORE FEATURES
            </h2>
            <p className="text-lg text-gray-300 text-center mb-12 max-w-3xl mx-auto font-mono leading-relaxed">
              Built for people who refuse to ask permission. Everything encrypted, decentralized, and engineered to survive where normal platforms fold.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">


              {/* 1. MegaETH Real-Time */}
              <div className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <a href="https://www.megaeth.com/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 flex items-center justify-center hover:opacity-80 transition-opacity">
                    <img src="/megaeth.svg" alt="MegaETH" className="w-12 h-12 object-contain brightness-0 invert" />
                  </a>
                  <h3 className="text-lg font-bold neon-text-cyan uppercase font-mono">MegaETH Real-Time</h3>
                </div>
                <p className="text-gray-300 text-sm font-mono leading-relaxed">
                  Millisecond finality turns on-chain messaging and Guild interactions into something that feels off-chain — without the compromise.
                </p>
              </div>

              {/* 2. Multi-Identity */}
              <div className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center border-2 border-cyan-500/50">
                    <Users className="w-6 h-6 neon-text-cyan" />
                  </div>
                  <h3 className="text-lg font-bold neon-text-cyan uppercase font-mono">Multi-Identity</h3>
                </div>
                <p className="text-gray-300 text-sm font-mono leading-relaxed">
                  Create unlimited mailboxes from one wallet. Work, personal, anon — all cryptographically isolated.
                </p>
              </div>              

              {/* 3. Zero Backend */}
              <div className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center border-2 border-cyan-500/50">
                    <Server className="w-6 h-6 neon-text-cyan" />
                  </div>
                  <h3 className="text-lg font-bold neon-text-cyan uppercase font-mono">Zero Backend</h3>
                </div>
                <p className="text-gray-300 text-sm font-mono leading-relaxed">
                  Pure smart contracts and IPFS. No servers, no admins, no kill switch. Protocol runs itself.
                </p>
              </div>
            </div>
          </div>
          
          {/* Section Divider */}
          <div className="flex justify-center py-12">
                   <img 
                src="/logo.png" 
                alt="HASHD" 
                className="w-32 h-32 object-contain"
              />
          </div>

        </div>
      </div>

      {/* HashdTags Banner - Full Width */}
      <div className="">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#01fe57_1px,transparent_1px)] bg-[length:50px_50px]"></div>
        </div>
        
        {/* Content Container */}
        <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
          <div className="text-center">
            {/* Main Title */}
             <h2 className="text-3xl font-bold neon-text-cyan uppercase tracking-wider mb-6 text-center font-cyberpunk">
              INTRODUCING HASHDTAGS
            </h2>
            
            {/* Description */}
            <p className="text-lg text-gray-300 mb-12 max-w-3xl mx-auto font-mono leading-relaxed">
              Your cryptographically-owned identity. Use <span className="text-green-400 font-bold">anon@hashd</span> instead of wallet addresses. 
              Each HASHDTag is an NFT you own forever — no renewals, no subscriptions.
            </p>
            
            {/* Feature List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-12">
              {/* 1. NFT-Backed Ownership */}
              <div className="flex gap-4 items-start">
                <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 border-2 border-green-500/50">
                  <Award className="w-7 h-7" style={{ color: '#01fe57' }} />
                </div>
                <div className='text-left'>
                  <h3 className="text-base font-bold text-white mb-1 font-mono uppercase">NFT-Backed Ownership</h3>
                  <p className="text-gray-400 text-sm font-mono leading-relaxed">
                    Your tag is a cryptographic asset you truly own, not a database entry that can be revoked.
                  </p>
                </div>
              </div>
              
              {/* 2. Lifetime Ownership */}
              <div className="flex gap-4 items-start">
                <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 border-2 border-green-500/50">
                  <span className="text-2xl font-bold" style={{ color: '#01fe57' }}>∞</span>
                </div>
            <div className='text-left'>
                  <h3 className="text-base font-bold text-white mb-1 font-mono uppercase">Lifetime Ownership</h3>
                  <p className="text-gray-400 text-sm font-mono leading-relaxed">
                    No renewals. No subscriptions. No expiry dates. Own your identity forever.
                  </p>
                </div>
              </div>
              
              {/* 3. Encryption Key Mapping */}
              <div className="flex gap-4 items-start">
                <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 border-2 border-green-500/50">
                  <Key className="w-7 h-7" style={{ color: '#01fe57' }} />
                </div>
            <div className='text-left'>
                  <h3 className="text-base font-bold text-white mb-1 font-mono uppercase">Encryption Key Mapping</h3>
                  <p className="text-gray-400 text-sm font-mono leading-relaxed">
                    Each tag maps to your public encryption key for secure, private messaging.
                  </p>
                </div>
              </div>
              
              {/* 4. Ecosystem-Wide */}
              <div className="flex gap-4 items-start">
                <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 border-2 border-green-500/50">
                  <Users className="w-7 h-7" style={{ color: '#01fe57' }} />
                </div>
            <div className='text-left'>
                  <h3 className="text-base font-bold text-white mb-1 font-mono uppercase">Ecosystem-Wide</h3>
                  <p className="text-gray-400 text-sm font-mono leading-relaxed">
                    Use your HASHDTag for messaging, Guilds, marketplaces, and future features.
                  </p>
                </div>
              </div>
              
              {/* 5. Human-Readable Addresses */}
              <div className="flex gap-4 items-start">
                <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 border-2 border-green-500/50">
                  <span className="text-xl font-bold" style={{ color: '#01fe57' }}>@</span>
                </div>
            <div className='text-left'>
                  <h3 className="text-base font-bold text-white mb-1 font-mono uppercase">Human-Readable Addresses</h3>
                  <p className="text-gray-400 text-sm font-mono leading-relaxed">
                    Share alice@hashd instead of long wallet addresses or public keys.
                  </p>
                </div>
              </div>
              
              {/* 6. Transferable & Tradeable */}
              <div className="flex gap-4 items-start">
                <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 border-2 border-green-500/50">
                  <Coins className="w-7 h-7" style={{ color: '#01fe57' }} />
                </div>
            <div className='text-left'>
                  <h3 className="text-base font-bold text-white mb-1 font-mono uppercase">Transferable & Tradeable</h3>
                  <p className="text-gray-400 text-sm font-mono leading-relaxed">
                    HASHDTags are standard NFTs that can be bought, sold, or transferred freely.
                  </p>
                </div>
              </div>
            </div>

         
          </div>
        </div>
      </div>
      {/* Main Content Container */}
      <div className="relative z-10 hex-grid">
        <div className="max-w-7xl mx-auto p-4">

          {/* Messaging Features */}
          <div id="messaging-section" className="mb-10 py-12 px-4 -mx-4 rounded-2xl relative group scroll-mt-20">
            <div className="relative  border-purple-500/30 rounded-2xl">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-6">
      
              <h2 className="text-3xl font-bold text-purple-400 uppercase tracking-wider font-cyberpunk text-center">
                BULLET-PROOF MESSAGING
              </h2>
            </div>
            <p className="text-gray-400 text-center mb-8 max-w-3xl mx-auto font-mono">
              Private communication enforced by cryptography. Only intended recipients can decrypt. Includes deterministic mailboxes, multi-identity support, and verifiable message ordering.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* 1. End-to-End Encryption */}
              <div className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center border-2 border-purple-500/50">
                    <Lock className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-purple-400 uppercase font-mono">E2E Encrypted</h3>
                </div>
                <p className="text-gray-300 text-sm font-mono">
                  Military-grade AES-256-GCM encryption ensures only intended recipients can decrypt your messages.
                </p>
              </div>

              {/* 2. Multi-Identity */}
              <div className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center border-2 border-purple-500/50">
                    <Users className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-purple-400 uppercase font-mono">Multi-Identity</h3>
                </div>
                <p className="text-gray-300 text-sm font-mono">
                  Create unlimited mailboxes per wallet, each with unique encryption keys for complete identity separation.
                </p>
              </div>

              {/* 3. Deterministic Keys */}
              <div className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center border-2 border-purple-500/50">
                    <Key className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-purple-400 uppercase font-mono">Deterministic Keys</h3>
                </div>
                <p className="text-gray-300 text-sm font-mono">
                  Restore your mailbox on any device using just your wallet and PIN. No third-party custodians required.
                </p>
              </div>
            </div>
          </div>
          </div>

          {/* Section Divider */}
          <div className="flex justify-center py-12">
            <ChevronDown className="w-8 h-8 text-cyan-500/30 animate-bounce" />
          </div>

          {/* Group Features */}
          <div id="guilds-section" className="mb-10 py-12 px-4 -mx-4 rounded-2xl relative group scroll-mt-20">
            <div className="relative  border-green-500/30 rounded-2xl">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-6">

              <h2 className="text-3xl font-bold text-green-400 uppercase tracking-wider font-cyberpunk text-center">
                SOVEREIGN GUILDS
              </h2>
            </div>
            <p className="text-gray-400 text-center mb-8 max-w-3xl mx-auto font-mono">
              Communities powered by on-chain logic and encrypted content. Includes NFT governance, native tokens, encrypted posts, and smart-contract moderation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* 1. NFT Governance */}
              <div className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-500/50">
                    <Award className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-green-400 uppercase font-mono">NFT Governance</h3>
                </div>
                <p className="text-gray-300 text-sm font-mono">
                  Each Guild issues 100 governance NFTs that grant voting rights and control without centralized platforms.
                </p>
              </div>

              {/* 2. Token Economy */}
              <div className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-500/50">
                    <Coins className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-green-400 uppercase font-mono">Token Economy</h3>
                </div>
                <p className="text-gray-300 text-sm font-mono">
                  Native ERC-20 tokens enable airdrops, community rewards, and tiered access control mechanisms.
                </p>
              </div>

              {/* 3. Encrypted Posts */}
              <div className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-500/50">
                    <Lock className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-green-400 uppercase font-mono">Encrypted Posts</h3>
                </div>
                <p className="text-gray-300 text-sm font-mono">
                  Four-tier access system with all content encrypted and stored as IPFS ciphertext for permanence.
                </p>
              </div>
            </div>
          </div>
          </div>

          {/* Section Divider */}
          <div className="flex justify-center py-12">
            <ChevronDown className="w-8 h-8 text-cyan-500/30 animate-bounce" />
          </div>

          {/* Marketplaces */}
          <div id="marketplaces-section" className="mb-10 py-12 px-4 -mx-4 rounded-2xl relative group scroll-mt-20">
            <div className="relative  border-orange-500/30 rounded-2xl">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-6">
    
              <h2 className="text-3xl font-bold text-orange-400 uppercase tracking-wider font-cyberpunk text-center">
                UNSTOPPABLE MARKETPLACES
              </h2>
            </div>
            <p className="text-gray-400 text-center mb-8 max-w-3xl mx-auto font-mono">
              Encrypted listings and negotiations. On-chain settlement. Includes immutable reputation, crypto-native payments, and persistent commerce.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* 1. Encrypted Listings */}
              <div className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center border-2 border-orange-500/50">
                    <Lock className="w-6 h-6 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-bold text-orange-400 uppercase font-mono">Encrypted Listings</h3>
                </div>
                <p className="text-gray-300 text-sm font-mono">
                  All marketplace listings are encrypted and stored as IPFS ciphertext, making them truly uncensorable.
                </p>
              </div>

              {/* 2. On-Chain Settlement */}
              <div className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center border-2 border-orange-500/50">
                    <Link className="w-6 h-6 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-bold text-orange-400 uppercase font-mono">On-Chain Settlement</h3>
                </div>
                <p className="text-gray-300 text-sm font-mono">
                  Direct peer-to-peer crypto payments with no custodians, payment processors, or intermediaries.
                </p>
              </div>

              {/* 3. Immutable Reputation */}
              <div className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center border-2 border-orange-500/50">
                    <CheckCircle className="w-6 h-6 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-bold text-orange-400 uppercase font-mono">Immutable Reputation</h3>
                </div>
                <p className="text-gray-300 text-sm font-mono">
                  Cryptographically sealed reputation and feedback system that cannot be tampered with or deleted.
                </p>
              </div>
            </div>

           
          </div>
          </div>

        </div>
      </div>


      {/* Main Content Container */}
      <div className="relative z-10 hex-grid">
        <div className="max-w-7xl mx-auto p-4">

          {/* Bottom CTA */}
          <div className="text-center mb-12">
   
            <ConnectionArea />
          </div>

        </div>
      </div>




      {/* Back to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 right-8 w-12 h-12 bg-cyan-500/20 hover:bg-cyan-500/30 border-2 border-cyan-500/50 hover:border-cyan-500 rounded-full flex items-center justify-center transition-all z-50 backdrop-blur-sm group"
        aria-label="Back to top"
      >
        <ChevronDown className="w-6 h-6 text-cyan-400 rotate-180 group-hover:scale-110 transition-transform" />
      </button>

      {/* Footer with Zero Trust Architecture */}
      <Footer showZeroTrust={true} />
      
      {/* Connection Issues Modal */}
      <ConnectionIssuesModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
      />
      
      {/* Security Mode Modal */}
      <SecurityModeModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
      />
    </div>
  );
};
