/**
 * Session Persistence Toggle Component
 * 
 * Allows users to enable/disable session persistence (remember until browser close)
 */

import React from 'react';
import { useSecureMailbox } from '../hooks/useSecureMailbox';
import { Info } from 'lucide-react';

export const SessionPersistenceToggle: React.FC = () => {
  const {
    isSessionPersistenceEnabled,
    enableSessionPersistence,
    disableSessionPersistence
  } = useSecureMailbox();
  
  const handleToggle = () => {
    if (isSessionPersistenceEnabled) {
      disableSessionPersistence();
    } else {
      enableSessionPersistence();
    }
  };
  
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-white">
              Session Persistence
            </h3>
            <div className="group relative">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 top-6 w-64 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <p className="text-sm text-gray-300">
                  When enabled, your session will persist until you close the browser.
                  Your session key is encrypted using a non-exportable browser key.
                </p>
                <div className="mt-2 text-xs text-gray-400">
                  <strong>Security:</strong> Session keys are encrypted in sessionStorage.
                  They never sync across devices and are automatically cleared when the browser closes.
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-gray-400 mb-3">
            {isSessionPersistenceEnabled
              ? 'Your session will persist until browser close. You won\'t need to re-enter your PIN on refresh.'
              : 'Your session will end on page refresh. You\'ll need to re-enter your PIN each time.'}
          </p>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isSessionPersistenceEnabled
                  ? 'bg-cyan-500'
                  : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isSessionPersistenceEnabled
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
            
            <span className="text-sm font-medium text-gray-300">
              {isSessionPersistenceEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>
      
      {isSessionPersistenceEnabled && (
        <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-cyan-300">
              <strong>Active:</strong> Your session is encrypted and stored in sessionStorage.
              It will automatically clear when you close the browser.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
