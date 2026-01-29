import React from 'react';
import { useHashdUrl } from '@gethashd/bytecave-browser';
import { Users } from 'lucide-react';

interface GuildImageProps {
  imageURI: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
}
// TODO: Make generic image component and test the hashd:// protocol
export const GuildImage: React.FC<GuildImageProps> = ({ 
  imageURI, 
  alt, 
  className = '',
  fallbackIcon 
}) => {
  const { blobUrl, loading, error } = useHashdUrl(
    imageURI?.startsWith('hashd://') ? imageURI : null
  );

  console.log('[GuildImage]', alt, '- URI:', imageURI?.slice(0, 30), 'loading:', loading, 'error:', error, 'blobUrl:', !!blobUrl);

  if (!imageURI) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        {fallbackIcon || <Users className="w-12 h-12 text-cyan-400/30" />}
      </div>
    );
  }

  if (imageURI.startsWith('hashd://')) {
    if (loading) {
      return (
        <div className={`flex items-center justify-center bg-gray-800/50 ${className}`}>
          <div className="animate-pulse text-cyan-400/50 text-xs font-mono">Loading...</div>
        </div>
      );
    }

    if (error || !blobUrl) {
      console.log('[GuildImage] Showing fallback for', alt, '- error:', error);
      return (
        <div className={`flex items-center justify-center ${className}`}>
          {fallbackIcon || <Users className="w-12 h-12 text-cyan-400/30" />}
        </div>
      );
    }

    return (
      <img
        src={blobUrl}
        alt={alt}
        className={className}
      />
    );
  }

  return (
    <img
      src={imageURI}
      alt={alt}
      className={className}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};
