import React from 'react';
import { Settings as SettingsIcon, AlertTriangle, Shield } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import {
  SessionManager,
  SessionPersistenceToggle,
  PasskeyProtection,
  RpcEndpointSetting,
  VaultNodeSetting,
  DataManagement
} from '../components/settings';
import { CryptoKeyPair } from '../utils/crypto-simple';

interface SettingsProps {
  accountAbstraction: {
    isEnabled: boolean;
    isCreatingSession: boolean;
    error: string | null;
    getSessionInfo: () => any;
    sessionProgress: any;
    createSessionKey: (durationMinutes?: number) => Promise<boolean>;
    clearSessionKey: () => void;
    clearSessionProgress: () => void;
  };
  walletAddress?: string;
  keyPair?: CryptoKeyPair | null;
}

export const Settings: React.FC<SettingsProps> = ({ accountAbstraction, walletAddress, keyPair }) => {
  return (
    <div className="min-h-screen hex-grid bg-gray-900">
      <PageHeader
        icon={SettingsIcon}
        title="SETTINGS"
        subtitle="CONFIGURE.YOUR.EXPERIENCE"
      />

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* SECURITY SETTINGS SECTION */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold neon-text-cyan uppercase tracking-wider font-mono flex items-center gap-3">
              <Shield className="w-6 h-6" />
              Security Settings
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Configure authentication, session management, and security features
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Account Abstraction / Session Keys */}
            <SessionManager
              isEnabled={accountAbstraction.isEnabled}
              isCreatingSession={accountAbstraction.isCreatingSession}
              error={accountAbstraction.error}
              sessionInfo={accountAbstraction.getSessionInfo()}
              sessionProgress={accountAbstraction.sessionProgress}
              onCreateSession={accountAbstraction.createSessionKey}
              onClearSession={accountAbstraction.clearSessionKey}
              onClearProgress={accountAbstraction.clearSessionProgress}
            />

            {/* Passkey Protection */}
            <PasskeyProtection />

            {/* Session Persistence */}
            <div className="lg:col-span-2">
              <SessionPersistenceToggle walletAddress={walletAddress} keyPair={keyPair} />
            </div>
          </div>
        </div>

        {/* ADVANCED SETTINGS SECTION */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold neon-text-cyan uppercase tracking-wider font-mono flex items-center gap-3">
              <SettingsIcon className="w-6 h-6" />
              Advanced Settings
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Configure RPC endpoints and vault node preferences
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RpcEndpointSetting />
            <VaultNodeSetting />
          </div>
        </div>

        {/* DATA MANAGEMENT SECTION */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-red-400 uppercase tracking-wider font-mono flex items-center gap-3">
              <AlertTriangle className="w-6 h-6" />
              Data Management
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Clear local data and reset settings
            </p>
          </div>

          <DataManagement />
        </div>
      </div>
    </div>
  );
};
