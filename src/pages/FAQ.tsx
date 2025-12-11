import React, { useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FAQItem {
  question: string;
  answer: string | React.ReactNode;
  category: string;
}

export const FAQ: React.FC = () => {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      category: 'General',
      question: 'What is HASHD?',
      answer: 'HASHD is a sovereign communication protocol built on MegaETH, enabling encrypted messaging, user-owned identity, autonomous Guilds, and censorship-resistant marketplaces. No admins, no servers, no dependencies — just cryptography, the ByteCave, and smart contracts.'
    },
    {
      category: 'General',
      question: 'Why does HASHD exist now?',
      answer: 'Until now, decentralized communication was too slow and too expensive to feel usable. MegaETH changed the physics: millisecond finality, high throughput, and real-time UX finally make sovereign communication practical.'
    },
    {
      category: 'General',
      question: 'Is HASHD an ecosystem or a protocol?',
      answer: 'HASHD is a protocol first — but one that naturally forms an ecosystem around identity, messaging, communities, and marketplaces. The protocol is the foundation. The ecosystem is everything people build on top of it.'
    },
    {
      category: 'General',
      question: 'Will HASHD be developing a mobile app?',
      answer: 'Yes. A mobile app is in the pipeline for early 2026. However, there are obvious centralization considerations with app stores and mobile platforms, so web-based access will remain the priority initially to preserve the protocol\'s sovereignty and accessibility.'
    },
    {
      category: 'General',
      question: 'Who is behind creating HASHD?',
      answer: 'HASHD is created by Alexx Shadow, a seasoned web3 and AI developer. Alexx has created numerous apps in the web3 space since 2021 and was previously the CTO of Quantum Art.'
    },
    {
      category: 'HashIDs',
      question: 'What are HashIDs?',
      answer: 'HashIDs are NFT-backed, human-readable identities (e.g., alexx@hashd) mapped directly to your encryption keys. They act as portable endpoints across the HASHD network.'
    },
    {
      category: 'HashIDs',
      question: 'Do HashIDs expire?',
      answer: 'No. There are no renewals. When you mint a HashID, you own it outright.'
    },
    {
      category: 'HashIDs',
      question: 'How many characters can my HashID have?',
      answer: 'HashIDs 5+ characters: first one is free per wallet. Premium 1–4 character HashIDs are released separately.'
    },
    {
      category: 'HashIDs',
      question: 'Can I use my HashID across apps?',
      answer: 'Yes. HashIDs are protocol-native identifiers usable across all HASHD interfaces and partner dApps.'
    },
    {
      category: 'Messaging',
      question: 'How does message encryption work?',
      answer: 'Each mailbox uses deterministic P-256 ECDH keys derived from: a wallet signature, plus a user PIN (or other mailbox ID). AES-GCM encrypts every message. Only sender and receiver can decrypt — not HASHD, not relayers, not indexers.'
    },
    {
      category: 'Messaging',
      question: 'Is any message data stored on centralized servers?',
      answer: 'No. Message content is stored encrypted in the ByteCave. Metadata is kept minimal and stored on-chain, but never exposes content.'
    },
    {
      category: 'Messaging',
      question: 'Can HASHD read my messages?',
      answer: 'No. The encryption design makes it cryptographically impossible for HASHD to decrypt anything.'
    },
    {
      category: 'Messaging',
      question: 'Can I have multiple mailboxes?',
      answer: 'Yes. A single wallet can generate unlimited independent identities: work, personal, trading, anonymous, Guild-specific, etc. Each mailbox gets its own deterministic keypair and HashID.'
    },
    {
      category: 'Messaging',
      question: 'Can I back up my messages?',
      answer: 'Yes. You can export encrypted local backups and restore them later without interacting with the chain.'
    },
    {
      category: 'Messaging',
      question: 'What about blocking or spam protection?',
      answer: 'Each mailbox supports blocklists and allowlists, enforced cryptographically.'
    },
    {
      category: 'Messaging',
      question: 'What is Optional Passkey Protection?',
      answer: 'You can lock local message access with a hardware-backed Passkey (FaceID/TouchID/Windows Hello). This never replaces the deterministic key; it simply adds local biometric protection.'
    },
    {
      category: 'Guilds',
      question: 'What are Guilds?',
      answer: 'Guilds are autonomous, encrypted communities built entirely from smart contracts and the ByteCave — not servers or moderators.'
    },
    {
      category: 'Guilds',
      question: 'Can a Guild be taken down?',
      answer: 'No. Guild content is encrypted and lives in the ByteCave. Even if HASHD hides a Guild on the official frontend, the data stays accessible, mirrorable, and forkable.'
    },
    {
      category: 'Guilds',
      question: 'What economic features do Guilds have?',
      answer: 'Each Guild launches with: Prime Key NFTs (100 per Guild for governance and early ownership), a native ERC-20 token, and encrypted content tiers (Public, Members, Token Holders, NFT Holders). Guilds can build their own internal economies.'
    },
    {
      category: 'Guilds',
      question: 'How is moderation handled?',
      answer: 'Moderation is governance-driven, enforced by smart contracts — not administrators. Guild creators define the rules at launch.'
    },
    {
      category: 'Guilds',
      question: 'Where is Guild content stored?',
      answer: 'As ciphertext in the ByteCave. Even relayers only touch encrypted blobs.'
    },
    {
      category: 'Marketplaces',
      question: 'What makes HASHD marketplaces censorship-resistant?',
      answer: 'Listings, messages, and metadata are all encrypted, stored in the ByteCave, and mediated by smart contracts. No platform — including HASHD — can delist or shadow-ban anything.'
    },
    {
      category: 'Marketplaces',
      question: 'Can marketplaces be private or token-gated?',
      answer: 'Yes. You can run: Public marketplaces, Private listings, Token-gated or NFT-gated Guild marketplaces, and fully sovereign commerce environments.'
    },
    {
      category: 'Marketplaces',
      question: 'How do payments work?',
      answer: 'Payments are on-chain, non-custodial, and settled directly between buyer and vendor.'
    },
    {
      category: 'Marketplaces',
      question: 'Is feedback tamper-proof?',
      answer: 'Yes. Reviews are immutable, cryptographically signed, and stored trustlessly.'
    },
    {
      category: 'Frontend',
      question: 'Is the HASHD frontend verifiable?',
      answer: 'Yes. Every build is public, auditable, and hash-verified on-chain.'
    },
    {
      category: 'Frontend',
      question: 'How do I verify that I\'m running an official build?',
      answer: 'You can verify builds via: The HASHD site, the hash anchored on-chain, and the upcoming HASHD browser verification plugin.'
    },
    {
      category: 'Frontend',
      question: 'Can I customize the UI?',
      answer: 'Yes — through a secure extension layer that preserves the verified core. Users can: Apply custom themes, inject UI modules from trusted gists, change discovery filters and visibility, connect to different ByteCave nodes, and choose RPC endpoints. All without breaking security guarantees.'
    },
    {
      category: 'Frontend',
      question: 'Can developers fork the frontend?',
      answer: 'Absolutely. Developers can fork and submit builds for approval to become verifiable mirrors.'
    },
    {
      category: 'Frontend',
      question: 'What is "Legal Safety Mode"?',
      answer: 'Legal Safety Mode is a lightweight, optional filter layer used only on the official HASHD frontend. It prevents the official site from loading certain content that may be illegal, high-risk, or require moderation under real-world compliance rules. This filter does not touch the protocol, does not remove anything from the ByteCave, and does not affect what mirrors, custom clients, or third-party frontends can display. It simply tells the official UI to hide specific Guilds, posts, listings, or users based on a publicly visible "safety list." The protocol remains fully sovereign and censorship-resistant. Legal Safety Mode exists solely to protect the official website and its operators from liability while giving users complete freedom to run unfiltered mirrors if they choose.'
    },
    {
      category: 'Architecture',
      question: 'What is the ByteCave?',
      answer: 'The ByteCave is HASHD\'s encrypted storage layer — a decentralized network of independent nodes that store nothing but ciphertext. Every message, post, and listing is encrypted locally on your device before upload. Because nodes only ever see ciphertext, your data remains private, sovereign, and impossible for third parties to interpret or censor. Each blob is addressed by its content hash, meaning the network doesn\'t need directories, usernames, or databases. Nodes independently replicate data, generate cryptographic proofs, and can be swapped without disrupting the network. The ByteCave gives HASHD the durability of decentralized storage with the responsiveness of a modern application.'
    },
    {
      category: 'Architecture',
      question: 'Does HASHD require any backend?',
      answer: 'No. There are zero servers required for messaging, Guilds, identity, or marketplaces.'
    },
    {
      category: 'Architecture',
      question: 'How can I access HASHD?',
      answer: 'Any of the following: Official site (hashd.social), localhost build from GitHub, a community mirror, a fully custom client, or another dApp integrating HASHD contracts. Everything that matters is on-chain, in the ByteCave, or inside your wallet.'
    },
    {
      category: 'ZeroSig Sessions',
      question: 'What is ZeroSig?',
      answer: 'ZeroSig is HASHD\'s gasless smart-session system using ERC-4337. Approve once, then interact instantly — no popup spam, no friction.'
    },
    {
      category: 'ZeroSig Sessions',
      question: 'What does ZeroSig allow me to do?',
      answer: 'With an active session, you can instantly: Send messages, post in Guilds, list items in marketplaces, upvote/downvote, update block/allow lists, and perform any supported on-chain action. All actions remain cryptographically signed.'
    },
    {
      category: 'ZeroSig Sessions',
      question: 'Do I still need ETH for gas?',
      answer: 'No. HASHD covers gas through its own paymaster, funded via protocol revenue.'
    },
    {
      category: 'Security',
      question: 'Can HASHD ever access my content or identity?',
      answer: 'No. Keys are deterministic and locally derived. Content is encrypted end-to-end. HASHD has no ability to decrypt or recover anything.'
    },
    {
      category: 'Security',
      question: 'What happens if HASHD goes offline?',
      answer: 'Nothing breaks. HASHD has no servers or backend infrastructure to go offline. The protocol runs entirely on MegaETH smart contracts and the ByteCave. Your messages, Guilds, identities, and data all remain accessible through: the blockchain (always available), the ByteCave (decentralized storage), any mirror site, a localhost build from GitHub, or a custom client you build yourself. Even if hashd.social disappeared completely, the entire protocol would continue functioning without interruption.'
    },
    {
      category: 'Security',
      question: 'Can my account or Guild be banned?',
      answer: 'No central authority exists to ban or suspend accounts. Individual Guilds can define their own moderation rules — but they cannot prevent you from running your own client.'
    },
    {
      category: 'Launch',
      question: 'When is HASHD launching?',
      answer: 'HASHD will launch with the MegaETH mainnet, with early access during Frontier.'
    },
    {
      category: 'Launch',
      question: 'How do I get early access?',
      answer: 'Join the waitlist at https://hashd.social. Participants will get early access to the the beta test site, and the ability to register their HashIDs ahead of the crowd. There will also be consideration regarding our official token Airdrop'
    },
    {
      category: 'Launch',
      question: 'Where can I follow updates?',
      answer: (<>
        X: <a href="https://x.com/hashdsocial" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">@hashdsocial</a><br />
        Telegram: <a href="https://t.me/hashdsocial" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">https://t.me/hashdsocial</a>
      </>)
    },
    {
      category: 'Philosophy',
      question: 'What is HASHD ultimately trying to solve?',
      answer: 'Modern digital life is fragile — controlled by platforms, vulnerable to outages, deplatforming, and pressure from governments or corporations. HASHD creates digital spaces that: Belong to their users, cannot be censored, remain accessible forever, and operate without intermediaries. It\'s communication that survives whatever the internet becomes.'
    }
  ];

  const categories = Array.from(new Set(faqs.map(faq => faq.category)));

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
          <h1 className="text-4xl font-bold neon-text-cyan mb-4 font-cyberpunk">FREQUENTLY ASKED QUESTIONS</h1>
          <p className="text-gray-400 text-lg font-mono">
            Everything you need to know about HASHD
          </p>
        </div>

        {/* FAQ Categories */}
        {categories.map((category) => (
          <div key={category} className="mb-8">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono uppercase">{category}</h2>
            <div className="space-y-3">
              {faqs
                .filter(faq => faq.category === category)
                .map((faq, index) => {
                  const globalIndex = faqs.indexOf(faq);
                  const isOpen = openIndex === globalIndex;
                  
                  return (
                    <div
                      key={globalIndex}
                      className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden backdrop-blur-sm"
                    >
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-800/70 transition-all"
                      >
                        <span className="font-mono text-white font-bold pr-4">{faq.question}</span>
                        <ChevronDown
                          className={`w-5 h-5 text-cyan-400 flex-shrink-0 transition-transform ${
                            isOpen ? 'transform rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-4 pt-2 border-t border-gray-700">
                          <p className="text-gray-300 font-mono text-sm leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}

        {/* Still Have Questions */}
        <div className="mt-12 bg-gray-800/50 border border-cyan-500/30 rounded-xl p-8 text-center backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Still Have Questions?</h2>
          <p className="text-gray-300 font-mono mb-6">
            Join our community on X or Telegram. We're here to help.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 cyber-button relative inline-flex items-center justify-center gap-2 text-sm overflow-hidden"
          >
            BACK TO HOME
          </button>
        </div>
      </div>
    </div>
  );
};
