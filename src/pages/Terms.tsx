import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Terms: React.FC = () => {
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
            <FileText className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-4xl font-bold neon-text-cyan mb-4 font-cyberpunk">TERMS OF SERVICE</h1>
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
              By using HASHD, you agree to these terms. If you don't agree, 
              don't use the protocol. Simple as that.
            </p>
          </div>

          {/* What HASHD Is */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">What HASHD Is</h2>
            <p className="text-gray-300 font-mono leading-relaxed mb-4">
              HASHD is a protocol, not a service. It consists of:
            </p>
            <ul className="text-gray-300 font-mono leading-relaxed space-y-2 list-disc list-inside">
              <li>Smart contracts deployed on MegaETH</li>
              <li>Open-source client software</li>
              <li>Decentralized storage via IPFS</li>
            </ul>
            <p className="text-gray-300 font-mono leading-relaxed mt-4">
              We provide access to the protocol, but we don't control it. Once deployed, the smart contracts 
              run autonomously.
            </p>
          </div>

          {/* No Warranty */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">No Warranty</h2>
            <p className="text-gray-300 font-mono leading-relaxed">
              HASHD is provided "as is" without any warranties. We make no guarantees about uptime, 
              functionality, or fitness for any particular purpose. Use at your own risk.
            </p>
          </div>

          {/* Your Responsibilities */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Your Responsibilities</h2>
            <p className="text-gray-300 font-mono leading-relaxed mb-4">
              By using HASHD, you agree to:
            </p>
            <ul className="text-gray-300 font-mono leading-relaxed space-y-2 list-disc list-inside">
              <li>Secure your own wallet and private keys</li>
              <li>Pay gas fees for on-chain transactions</li>
              <li>Comply with applicable laws in your jurisdiction</li>
              <li>Not use HASHD for illegal activities</li>
              <li>Not attempt to exploit or attack the protocol</li>
              <li>Understand that blockchain transactions are irreversible</li>
            </ul>
          </div>

          {/* Content & Conduct */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Content & Conduct</h2>
            <p className="text-gray-300 font-mono leading-relaxed mb-4">
              HASHD is censorship-resistant by design. We cannot and will not moderate content. However:
            </p>
            <ul className="text-gray-300 font-mono leading-relaxed space-y-2 list-disc list-inside">
              <li>You are responsible for the content you post</li>
              <li>Guild owners can moderate their own communities</li>
              <li>Illegal content may be subject to legal action in your jurisdiction</li>
              <li>We are not liable for content posted by users</li>
            </ul>
            <p className="text-gray-300 font-mono leading-relaxed mt-4">
              Freedom comes with responsibility. Use it wisely.
            </p>
          </div>

          {/* Intellectual Property */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Intellectual Property</h2>
            <p className="text-gray-300 font-mono leading-relaxed">
              HASHD's smart contracts and client code are open source (MIT License). You're free to fork, 
              modify, and deploy your own version. The HASHD name and branding are trademarks of 3oh Inc.
            </p>
          </div>

          {/* Fees & Payments */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Fees & Payments</h2>
            <p className="text-gray-300 font-mono leading-relaxed mb-4">
              Using HASHD requires paying blockchain gas fees. Additional fees may apply for:
            </p>
            <ul className="text-gray-300 font-mono leading-relaxed space-y-2 list-disc list-inside">
              <li>Minting HashIDs</li>
              <li>Creating Guilds</li>
              <li>Minting Guild NFTs</li>
            </ul>
            <p className="text-gray-300 font-mono leading-relaxed mt-4">
              All fees are paid in cryptocurrency and are non-refundable. Blockchain transactions are final.
            </p>
          </div>

          {/* Limitation of Liability */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Limitation of Liability</h2>
            <p className="text-gray-300 font-mono leading-relaxed">
              We are not liable for any damages arising from your use of HASHD. This includes but is not 
              limited to: lost funds, lost data, smart contract bugs, blockchain failures, or third-party actions. 
              You use HASHD at your own risk.
            </p>
          </div>

          {/* Indemnification */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Indemnification</h2>
            <p className="text-gray-300 font-mono leading-relaxed">
              You agree to indemnify and hold harmless 3oh Inc, its developers, and contributors from any 
              claims, damages, or expenses arising from your use of HASHD or violation of these terms.
            </p>
          </div>

          {/* Termination */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Termination</h2>
            <p className="text-gray-300 font-mono leading-relaxed">
              Because HASHD is decentralized, we cannot terminate your access to the protocol. However, 
              we may restrict access to this website or client at our discretion. The smart contracts will 
              continue to function regardless.
            </p>
          </div>

          {/* Governing Law */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Governing Law</h2>
            <p className="text-gray-300 font-mono leading-relaxed">
              These terms are governed by the laws of the jurisdiction where 3oh Inc is registered. 
              Disputes will be resolved through arbitration.
            </p>
          </div>

          {/* Changes to Terms */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Changes to Terms</h2>
            <p className="text-gray-300 font-mono leading-relaxed">
              We may update these terms from time to time. Changes will be posted on this page with an 
              updated "Last Updated" date. Continued use of HASHD after changes constitutes acceptance 
              of the new terms.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Contact</h2>
            <p className="text-gray-300 font-mono leading-relaxed mb-3">
              For questions about these terms:
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

          {/* Final Note */}
          <div className="pt-6 border-t border-cyan-500/30">
            <p className="text-gray-400 font-mono text-sm italic text-center">
              By using HASHD, you acknowledge that you've read and understood these terms. 
              Welcome to the uncensored internet. 🔒
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
