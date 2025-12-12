import React from 'react';
import { ArrowLeft, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const About: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
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
          <h1 className="text-4xl font-bold neon-text-cyan mb-4 font-cyberpunk">ABOUT HASHD</h1>
          <p className="text-gray-400 text-lg font-mono">
            Building infrastructure that can't be taken away
          </p>
        </div>

        {/* Content */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 backdrop-blur-sm space-y-6">
          
          {/* Origin Story */}
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">Why HASHD Exists</h2>
            <div className="text-gray-300 font-mono leading-relaxed space-y-4">
              <p>
                HASHD was created because the internet has shown us — repeatedly — that centralized systems 
                are fragile places to build meaningful digital life.
              </p>
              <p>
                Entire communities have disappeared after coordinated "flag raids" by rival groups. 
                Conversations have blinked out during AWS, Google, or Azure outages. Governments have 
                pressured platforms into removing content or restricting speech with zero transparency.
              </p>
              <p>
                These events aren't rare anymore; they're reminders that most of what we build online 
                rests on infrastructure we don't control.
              </p>
              <p className="text-cyan-400 font-bold">
                HASHD is my answer: a protocol designed so people can build identities, relationships, 
                and communities that stay where their owners put them.
              </p>
              
              {/* Medium Article Link */}
              <div className="mt-6">
                <a
                  href="https://medium.com/@alexx_75008/hashd-the-protocol-they-cant-turn-off-ca990c60b0a3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 hover:border-cyan-500 rounded-lg transition-all group font-mono text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>
                  </svg>
                  <span>Read more on Medium</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Philosophy */}
          <div className="pt-6 border-t border-gray-700">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4 font-mono">The Philosophy</h2>
            <div className="text-gray-300 font-mono leading-relaxed space-y-4">
              <p>
                "I believe the future of the internet isn't about better platforms — it's about 
                <span className="text-cyan-400 font-bold"> no platforms at all</span>. Just protocols, 
                cryptography, and people who refuse to ask permission.
              </p>
              <p>
                HASHD runs on smart contracts and IPFS. There's no backend to seize, no admin panel 
                to compromise, no Terms of Service that can change overnight. The code is the law, 
                and the law is open source.
              </p>
              <p>
                If this website disappeared tomorrow, every message, every Guild, every HashID would 
                still exist. That's not a feature — that's the entire point.""
              </p>
                  <p>
                Alexx
              </p>
            </div>
          </div>

          {/* Team Section */}
          <div className="pt-6 border-t border-gray-700">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6 font-mono flex items-center gap-2">
              <Users className="w-6 h-6" />
              Team
            </h2>
            <div className="flex items-center gap-4 bg-gray-900/50 rounded-lg p-6 border border-cyan-500/20">
              <img 
                src="/alexx.jpg" 
                alt="Alexx Shadow" 
                className="w-20 h-20 rounded-full border-2 border-cyan-500/50"
              />
              <div>
                <h3 className="text-xl font-bold text-white font-mono">Alexx Shadow</h3>
                <p className="text-gray-400 text-sm font-mono mb-2">Solo Developer & Creator</p>
                <a 
                  href="https://x.com/alexxshadow" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 text-sm font-mono transition-colors"
                >
                  @alexxshadow →
                </a>
              </div>
            </div>
            <p className="text-gray-500 text-sm font-mono mt-4 text-center italic">
              Built solo, shipped fast, staying uncensored.
            </p>
          </div>

          {/* Call to Action */}
          <div className="pt-6 border-t border-gray-700 text-center">
            <p className="text-gray-300 font-mono leading-relaxed mb-4">
              HASHD is open source, verifiable, and built for people who value sovereignty over convenience.
            </p>
            <p className="text-cyan-400 font-bold font-mono">
              Welcome to the resistance. 🔒
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
