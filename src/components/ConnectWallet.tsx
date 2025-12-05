import React, { useState } from 'react';
import { Wallet } from 'lucide-react';

interface ConnectWalletProps {
  onConnect: (address: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export const ConnectWallet: React.FC<ConnectWalletProps> = ({
  onConnect,
  className = '',
  children
}) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    console.log('🔗 Connect button clicked');
    
    if (!window.ethereum) {
      console.log('❌ MetaMask not found');
      alert('Please install MetaMask to connect your wallet');
      return;
    }

    console.log('✅ MetaMask detected, requesting accounts...');
    setIsConnecting(true);
    
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      console.log('📋 Accounts received:', accounts);
      
      if (accounts.length > 0) {
        console.log('✅ Connected to:', accounts[0]);
        onConnect(accounts[0]);
      } else {
        console.log('❌ No accounts returned');
        alert('No accounts found. Please unlock MetaMask.');
      }
    } catch (error: any) {
      console.error('❌ Wallet connection error:', error);
      
      if (error.code === 4001) {
        alert('Connection rejected by user');
      } else if (error.code === -32002) {
        alert('MetaMask is already processing a request. Please check MetaMask.');
      } else {
        alert('Failed to connect wallet: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className={`px-12 py-4 cyber-button relative inline-flex items-center justify-center gap-2 text-sm overflow-hidden ${className}`}
    >
      <Wallet className="w-6 h-6" />
      {isConnecting ? 'CONNECTING...' : (children || 'CONNECT WALLET')}
    </button>
  );
};
