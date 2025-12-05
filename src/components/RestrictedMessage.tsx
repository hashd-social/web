import React from 'react';
import { Lock, Clock } from 'lucide-react';

interface RestrictedMessageProps {
  joinedAtIndex: number;
  messageIndex: number;
  timestamp: number;
  className?: string;
}

export const RestrictedMessage: React.FC<RestrictedMessageProps> = ({
  joinedAtIndex,
  messageIndex,
  timestamp,
  className = ''
}) => {
  const formatDate = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className={`
      relative overflow-hidden
      bg-gradient-to-br from-gray-900/40 to-gray-800/40
      border border-gray-700/50
      rounded-lg p-6
      ${className}
    `}>
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255,255,255,0.03) 10px,
            rgba(255,255,255,0.03) 20px
          )`
        }} />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center text-center space-y-4 py-4">
        {/* Lock Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-gray-600/20 blur-xl rounded-full" />
          <div className="relative bg-gray-800/80 p-4 rounded-full border border-gray-600/30">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-300">
            Before Your Time
          </h3>
          <p className="text-sm text-gray-500">
            Message #{messageIndex + 1}
          </p>
        </div>

        {/* Description */}
        <div className="max-w-md space-y-2">
          <p className="text-sm text-gray-400 leading-relaxed">
            You joined this conversation after this message was sent.
            For privacy, you can only read messages from when you joined onwards.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-2">
            <Clock className="w-3 h-3" />
            <span>Sent on {formatDate(timestamp)}</span>
          </div>
        </div>

        {/* Info Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-full">
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-400">
            You joined at message #{joinedAtIndex + 1}
          </span>
        </div>
      </div>
    </div>
  );
};
