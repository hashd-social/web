import React, { ReactNode } from 'react';
import { X, LucideIcon } from 'lucide-react';

interface NeonModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  showCloseButton?: boolean;
}

export const NeonModal: React.FC<NeonModalProps> = ({
  isOpen,
  onClose,
  title,
  icon: Icon,
  children,
  maxWidth = '2xl',
  showCloseButton = true
}) => {
  if (!isOpen) return null;

  const maxWidthClasses = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl'
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className={`relative bg-gray-900/95 border-2 border-cyan-500/30 rounded-2xl shadow-2xl ${maxWidthClasses[maxWidth]} w-full max-h-[85vh] overflow-hidden backdrop-blur-xl`}
        style={{
          boxShadow: '0 0 40px rgba(6, 182, 212, 0.3), inset 0 0 20px rgba(6, 182, 212, 0.05)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing border effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 pointer-events-none"></div>
        
        {/* Header */}
        <div className="relative flex items-center justify-between p-6 border-b border-cyan-500/20 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-center">
              <Icon className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold neon-text-cyan font-mono tracking-wider uppercase">{title}</h3>
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-800/50 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-400 transition-all transform hover:scale-110 hover:rotate-90 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="relative overflow-y-auto max-h-[calc(85vh-100px)] bg-gray-900/50">
          {children}
        </div>
      </div>
    </div>
  );
};

// Field component for consistent form fields
interface NeonFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export const NeonField: React.FC<NeonFieldProps> = ({ label, children, className = '' }) => {
  return (
    <div className={`bg-gray-800/30 p-5 rounded-xl hover:border-cyan-500/40 transition-colors backdrop-blur-sm ${className}`}>
      <label className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 block font-mono flex items-center gap-2">
        <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
        {label}
      </label>
      {children}
    </div>
  );
};

// Button component for consistent action buttons
interface NeonButtonProps {
  onClick?: () => void;
  children: ReactNode;
  variant?: 'cyan' | 'purple' | 'green' | 'red';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const NeonButton: React.FC<NeonButtonProps> = ({ 
  onClick, 
  children, 
  variant = 'cyan',
  className = '',
  disabled = false,
  type = 'button'
}) => {
  const variantClasses = {
    cyan: 'bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-500/50 hover:bg-cyan-500/20 text-cyan-400',
    purple: 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/20 text-purple-400',
    green: 'bg-green-500/10 border-green-500/30 hover:border-green-500/50 hover:bg-green-500/20 text-green-400',
    red: 'bg-red-500/10 border-red-500/30 hover:border-red-500/50 hover:bg-red-500/20 text-red-400'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`border py-3 px-4 rounded-xl transition-all text-sm font-bold font-mono uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
};
