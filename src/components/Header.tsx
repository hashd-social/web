import React from 'react';
import { Settings, User, Mail, LogOut, Wifi, Inbox } from 'lucide-react';
import { DigitalRain } from './DigitalRain';

interface HeaderProps {
  userAddress: string;
  onDisconnect: () => void;
  onLogoClick?: () => void;
  onWalletClick?: () => void;
  onSettingsClick?: () => void;
  onMessagesClick?: () => void;
  onMegaClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ userAddress, onDisconnect, onLogoClick, onWalletClick, onSettingsClick, onMessagesClick, onMegaClick }) => {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
     
    <header className="relative neon-border-bottom shadow-2xl overflow-hidden">
      <div className="absolute inset-0 opacity-5 hex-grid"></div>
      <div className="relative z-10 max-w-7xl mx-auto px-2 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onLogoClick}
            className="flex items-center space-x-3 hover:scale-105 transition-all transform cursor-pointer group glitch"
          >
 
              <img 
                src="/logo.png" 
                alt="Hashd Logo" 
                className="w-16 h-16"
              />
   
            <div className='text-left'>
              <h1 className="text-3xl font-bold neon-text-cyan tracking-wider">
                HASHD
              </h1>
              <div className="text-sm neon-text-green font-mono">STAY.UNCENSORED</div>
            </div>
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={onWalletClick}
            className="px-4 py-2 bg-gray-800/50 rounded-lg border border-cyan-500/20 hover:border-cyan-500/50 transition-all"
            title="Key Management"
          >
            <span className="neon-text-cyan font-mono text-sm font-bold">{formatAddress(userAddress)}</span>
          </button>
          <button
            onClick={onMegaClick}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-800/50 rounded-lg border border-green-500/20 hover:border-green-500/50 transition-all hover:scale-105"
            title="System Information"
          >
            <Wifi className="w-4 h-4 neon-text-green" />
            <span className="text-xs font-mono font-semibold neon-text-green">MEGA</span>
          </button>   
          <button
            onClick={onSettingsClick}
            className="p-2.5 bg-gray-800/50 rounded-full border border-purple-500/20 hover:border-purple-500/50 transition-all hover:scale-105"
          >
            <Settings className="w-5 h-5 neon-text-magenta" />
          </button>
          
          <button
            onClick={onMessagesClick}
            className="p-2.5 bg-gray-800/50 rounded-full border border-cyan-500/20 hover:border-cyan-500/50 transition-all hover:scale-105"
          >
            <Inbox className="w-5 h-5 neon-text-cyan" />
          </button>
          
          <button
            onClick={onDisconnect}
            className="p-2.5 bg-gray-800/50 rounded-full border border-red-500/20 hover:border-red-500/50 transition-all hover:scale-105"
          >
            <LogOut className="w-5 h-5 text-red-400" />
          </button>
        </div>
      </div>
      </div>
    </header>  
  );
};
