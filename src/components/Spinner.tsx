import React from 'react';
import { Loader } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: 'primary' | 'white' | 'gray';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

const colorClasses = {
  primary: 'text-primary-500',
  white: 'text-white',
  gray: 'text-gray-500'
};

export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'md', 
  className = '',
  color = 'white'
}) => {
  return (
    <Loader 
      className={`animate-spin  ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
    />
  );
};

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading...', 
  size = 'xl',
  className = ''
}) => {
  return (
    <div className={`text-center py-8 ${className}`}>
      <Spinner size={size} className="mx-auto mb-4" />
      <p className="text-white">{message}</p>
    </div>
  );
};
