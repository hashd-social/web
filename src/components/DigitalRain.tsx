import React, { ReactNode } from 'react';

interface DigitalRainProps {
  children: ReactNode;
  intensity?: 'light' | 'medium' | 'heavy';
  speed?: 'slow' | 'normal' | 'fast';
  color?: 'green' | 'cyan' | 'blue' | 'red';
  opacity?: number;
  className?: string;
  columnWidth?: number; // Width of each column in pixels
  spacing?: number; // Spacing between columns in pixels
  loop?: boolean; // Whether animation should loop (default: false)
}

export const DigitalRain: React.FC<DigitalRainProps> = ({
  children,
  intensity = 'medium',
  speed = 'normal',
  color = 'green',
  opacity = 0.6,
  className = '',
  columnWidth = 8,
  spacing = 2,
  loop = false
}) => {
  // Calculate columns based on available width and spacing
  const getColumnCount = () => {
    // Base counts for different intensities
    const baseCounts = {
      light: 15,
      medium: 25,
      heavy: 40
    };
    return baseCounts[intensity] || baseCounts.medium;
  };

  // Generate random characters for matrix effect
  const getRandomChar = () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    return chars[Math.floor(Math.random() * chars.length)];
  };

  // Generate columns that fill the width with proper spacing
  const generateColumns = () => {
    const count = getColumnCount();
    const columns = [];
    const availableWidth = 100; // percentage
    
    for (let i = 0; i < count; i++) {
      const position = (availableWidth / count) * i + (spacing * i / count);
      columns.push({
        left: `${position}%`,
        delay: `${Math.random() * 3}s`,
        chars: Array.from({ length: 20 }, () => getRandomChar()).join(''),
        width: columnWidth
      });
    }
    return columns;
  };

  const columns = generateColumns();

  // Get speed class
  const getSpeedClass = () => {
    const baseClass = loop ? 'digital-rain-loop' : 'digital-rain-once';
    switch (speed) {
      case 'slow': return `${baseClass} digital-rain-slow`;
      case 'normal': return `${baseClass} digital-rain-normal`;
      case 'fast': return `${baseClass} digital-rain-fast`;
      default: return `${baseClass} digital-rain-normal`;
    }
  };

  // Get color class
  const getColorClass = () => {
    switch (color) {
      case 'green': return 'digital-rain-green';
      case 'cyan': return 'digital-rain-cyan';
      case 'blue': return 'digital-rain-blue';
      case 'red': return 'digital-rain-red';
      default: return 'digital-rain-green';
    }
  };

  return (
    <div className={`digital-rain-container ${className}`}>
      {children}
      <div 
        className="digital-rain-overlay"
        style={{ opacity }}
      >
        {columns.map((column, index) => (
          <div
            key={index}
            className={`digital-rain-column ${getSpeedClass()} ${getColorClass()}`}
            style={{
              left: column.left,
              animationDelay: column.delay,
              width: `${column.width}px`
            }}
            data-chars={column.chars}
          />
        ))}
      </div>
    </div>
  );
};
