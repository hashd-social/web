import React, { ReactNode } from 'react';
import { CheckCircle, LucideIcon } from 'lucide-react';

interface MatrixNotifyProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  variant?: 'success' | 'info' | 'warning' | 'error';
}

export const MatrixNotify: React.FC<MatrixNotifyProps> = ({
  title,
  icon: Icon = CheckCircle,
  children,
  variant = 'success'
}) => {
  const variantStyles = {
    success: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/50',
      text: 'text-green-400',
      icon: 'text-green-400',
      animation: 'matrix-success-enter'
    },
    info: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/50',
      text: 'text-cyan-400',
      icon: 'text-cyan-400',
      animation: 'matrix-info-enter'
    },
    warning: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/50',
      text: 'text-yellow-400',
      icon: 'text-yellow-400',
      animation: 'matrix-warning-enter'
    },
    error: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/50',
      text: 'text-red-400',
      icon: 'text-red-400',
      animation: 'matrix-error-enter'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className={`mt-4 mb-4 ${styles.bg} border-2 ${styles.border} rounded-lg p-4 ${styles.animation}`}>
      <p className={`text-sm font-bold ${styles.text} flex items-center gap-2 mb-3 font-mono uppercase`}>
        <Icon className={`w-5 h-5 ${styles.icon}`} />
        {title}
      </p>
      <div className="ml-7">
        {children}
      </div>
    </div>
  );
};
