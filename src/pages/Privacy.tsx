import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Privacy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 py-12">
      <div className="max-w-4xl mx-auto">
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 mb-4">
            <Shield className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-4xl font-bold neon-text-cyan mb-4 font-cyberpunk">PRIVACY POLICY</h1>
          <p className="text-gray-400 text-sm font-mono">
            Last Updated: December 1, 2025
          </p>
        </div>

        {/* Content */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 backdrop-blur-sm space-y-8">
          
          {/* Introduction */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Introduction</h2>
            <p className="text-gray-300 font-mono leading-relaxed mb-4">
              HASHD is a decentralized protocol operated by:
            </p>
            <div className="text-gray-300 font-mono leading-relaxed mb-4 pl-4">
              <strong>3oh Inc</strong><br />
              2261 Market Street STE 10277<br />
              San Francisco, California 94114<br />
              United States
            </div>
            <p className="text-gray-300 font-mono leading-relaxed">
              We don't collect, store, or have access to your private data. 
              This privacy policy explains how the protocol works and what data exists on-chain.
            </p>
          </div>

          {/* What We Collect */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">What We Collect</h2>
            <p className="text-gray-300 font-mono leading-relaxed mb-4">
              HASHD is a client-side application. Your data never touches our servers because we don't have servers.
            </p>
            <p className="text-gray-300 font-mono leading-relaxed mb-4">
              The only personal information we collect is:
            </p>
            <ul className="text-gray-300 font-mono leading-relaxed space-y-2 list-disc list-inside">
              <li><strong>Email addresses:</strong> Collected optionally as part of the waitlist program for launch notifications and early access updates</li>
            </ul>
            <p className="text-gray-300 font-mono leading-relaxed mt-4">
              We do NOT collect: Message content, browsing history, analytics, IP addresses, device information, passwords, or private keys.
            </p>
          </div>

          {/* On-Chain Data */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">On-Chain Data</h2>
            <p className="text-gray-300 font-mono leading-relaxed mb-4">
              The following data is stored on the MegaETH blockchain and is publicly visible:
            </p>
            <ul className="text-gray-300 font-mono leading-relaxed space-y-2 list-disc list-inside">
              <li><strong>Wallet addresses:</strong> Your public wallet address is visible when you interact with the protocol</li>
              <li><strong>HashIDs:</strong> Your HashID (e.g., alexx@hashd) is public and linked to your wallet</li>
              <li><strong>Encrypted messages:</strong> Message metadata (sender, recipient, timestamp) is public, but content is encrypted</li>
              <li><strong>Guild memberships:</strong> Your participation in Guilds is public on-chain</li>
              <li><strong>Transaction history:</strong> All blockchain transactions are public and permanent</li>
            </ul>
            <p className="text-gray-300 font-mono leading-relaxed mt-4">
              This is how blockchains work. Data on-chain is transparent and immutable by design.
            </p>
          </div>

          {/* Encryption */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Encryption & Security</h2>
            <p className="text-gray-300 font-mono leading-relaxed mb-4">
              HASHD uses end-to-end encryption for all private content:
            </p>
            <ul className="text-gray-300 font-mono leading-relaxed space-y-2 list-disc list-inside">
              <li>Messages are encrypted client-side before being sent on-chain</li>
              <li>Only the recipient's private key can decrypt messages</li>
              <li>Guild posts are encrypted with group-specific keys</li>
              <li>Encryption keys are derived from your PIN and wallet — never stored</li>
            </ul>
            <p className="text-gray-300 font-mono leading-relaxed mt-4">
              We cannot decrypt your messages. No one can. That's the point.
            </p>
          </div>

          {/* Third-Party Services */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Third-Party Services</h2>
            <p className="text-gray-300 font-mono leading-relaxed mb-4">
              HASHD interacts with the following third-party services:
            </p>
            <ul className="text-gray-300 font-mono leading-relaxed space-y-2 list-disc list-inside">
              <li><strong>MegaETH:</strong> Blockchain network for smart contract execution</li>
              <li><strong>IPFS/Filebase/Pinata:</strong> Decentralized storage for encrypted content</li>
              <li><strong>Wallet providers:</strong> MetaMask, WalletConnect, etc. (governed by their own privacy policies)</li>
            </ul>
            <p className="text-gray-300 font-mono leading-relaxed mt-4">
              We recommend reviewing the privacy policies of these services.
            </p>
          </div>

          {/* Your Responsibilities */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Your Responsibilities</h2>
            <ul className="text-gray-300 font-mono leading-relaxed space-y-2 list-disc list-inside">
              <li>Keep your wallet seed phrase secure — a must, always</li>
              <li>Remember your mailbox PINs — they cannot be reset</li>
              <li>Understand that on-chain data is permanent and public</li>
              <li>Use pseudonymous identities, clean wallets, and anonymous email if you want complete privacy</li>
            </ul>
          </div>

          {/* Data Deletion */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Data Deletion</h2>
            <p className="text-gray-300 font-mono leading-relaxed">
              Because HASHD is decentralized, data stored on-chain cannot be deleted. Blockchain data is 
              permanent by design. However, since your messages are encrypted, deleting your local keys 
              effectively makes the data unreadable.
            </p>
          </div>

          {/* Changes to This Policy */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Changes to This Policy</h2>
            <p className="text-gray-300 font-mono leading-relaxed">
              We may update this privacy policy from time to time. Changes will be posted on this page 
              with an updated "Last Updated" date. Since HASHD is decentralized, the protocol itself 
              doesn't change — only this documentation.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Contact</h2>
            <p className="text-gray-300 font-mono leading-relaxed mb-3">
              For questions about this privacy policy:
            </p>
            <div className="text-gray-300 font-mono leading-relaxed mb-4">
              <strong>3oh Inc</strong><br />
              2261 Market Street STE 10277<br />
              San Francisco, California 94114<br />
              United States
            </div>
            <ul className="text-gray-300 font-mono leading-relaxed space-y-2">
              <li>
                Email:{' '}
                <a 
                  href="mailto:support@hashd.social" 
                  className="text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  support@hashd.social
                </a>
              </li>
              <li>
                Telegram:{' '}
                <a 
                  href="https://t.me/hashdsocial" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  https://t.me/hashdsocial
                </a>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};
