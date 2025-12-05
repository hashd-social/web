import React from 'react';
import { Users } from 'lucide-react';

export const SuggestedGroups: React.FC = () => {
  return (
    <div className="bg-gray-800/30 rounded-lg p-6">
      <h3 className="text-lg font-bold text-cyan-400 mb-4 uppercase tracking-wider font-mono">Suggested Guilds</h3>
      
      <div className="space-y-3">
        {/* Placeholder content */}
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-cyan-400/30 mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-mono">
            Suggested guilds will appear here
          </p>
        </div>
      </div>
    </div>
  );
};
