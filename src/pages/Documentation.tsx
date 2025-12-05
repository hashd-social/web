import React from 'react';
import { ArrowLeft, Book, Code, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Documentation: React.FC = () => {
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

        {/* Content */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 backdrop-blur-sm text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 mb-6">
            <Book className="w-10 h-10 text-cyan-400" />
          </div>
          
          <h1 className="text-4xl font-bold neon-text-cyan mb-4 font-cyberpunk">DOCUMENTATION</h1>
          
          <div className="space-y-6 mb-8">
            <p className="text-gray-300 font-mono text-lg">
              Comprehensive developer documentation is coming soon.
            </p>
            
            <div className="flex flex-col items-center gap-4 pt-4">
              <div className="flex items-center gap-3 text-gray-400">
                <Code className="w-5 h-5 text-cyan-400" />
                <span className="font-mono text-sm">Smart Contract APIs</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <Wrench className="w-5 h-5 text-cyan-400" />
                <span className="font-mono text-sm">Integration Guides</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <Book className="w-5 h-5 text-cyan-400" />
                <span className="font-mono text-sm">Protocol Specifications</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-700">
            <p className="text-gray-400 font-mono text-sm mb-6">
              In the meantime, please follow us on X for updates.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://github.com/orgs/hashd-social/repositories"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-gray-700/50 border border-cyan-500/30 rounded-lg hover:border-cyan-500/50 hover:bg-gray-700/70 transition-all font-mono text-cyan-400 text-sm"
              >
                VIEW ON GITHUB →
              </a>
              <a
                href="https://x.com/hashdsocial"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-gray-700/50 border border-cyan-500/30 rounded-lg hover:border-cyan-500/50 hover:bg-gray-700/70 transition-all font-mono text-cyan-400 text-sm"
              >
                @HASHDSOCIAL →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
