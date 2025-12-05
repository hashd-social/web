import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className = '',
  delay = 300
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      adjustPosition();
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const adjustPosition = () => {
    if (!tooltipRef.current || !triggerRef.current) return;

    const tooltip = tooltipRef.current;
    const trigger = triggerRef.current;
    const rect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let newPosition = position;

    // Check if tooltip would go off screen and adjust position
    switch (position) {
      case 'top':
        if (rect.top - tooltipRect.height < 10) {
          newPosition = 'bottom';
        }
        break;
      case 'bottom':
        if (rect.bottom + tooltipRect.height > viewport.height - 10) {
          newPosition = 'top';
        }
        break;
      case 'left':
        if (rect.left - tooltipRect.width < 10) {
          newPosition = 'right';
        }
        break;
      case 'right':
        if (rect.right + tooltipRect.width > viewport.width - 10) {
          newPosition = 'left';
        }
        break;
    }

    setActualPosition(newPosition);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getTooltipClasses = () => {
    const baseClasses = `
      absolute z-50 px-4 py-3 text-xs font-mono
      bg-gray-900/95 rounded-lg
      text-white shadow-lg backdrop-blur-sm
      pointer-events-none transition-all duration-200
      ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
    `;

    const positionClasses = {
      top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
    };

    return `${baseClasses} ${positionClasses[actualPosition]} ${className}`;
  };

  const getArrowClasses = () => {
    const baseClasses = 'absolute w-2 h-2 bg-gray-900 transform rotate-45';
    
    const arrowPositions = {
      top: 'top-full left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-t-0 border-l-0',
      bottom: 'bottom-full left-1/2 transform -translate-x-1/2 translate-y-1/2 border-b-0 border-r-0',
      left: 'left-full top-1/2 transform -translate-y-1/2 translate-x-1/2 border-l-0 border-b-0',
      right: 'right-full top-1/2 transform -translate-y-1/2 -translate-x-1/2 border-r-0 border-t-0'
    };

    return `${baseClasses} ${arrowPositions[actualPosition]}`;
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={getTooltipClasses()}
          role="tooltip"
        >
          {content}
          <div className={getArrowClasses()} />
        </div>
      )}
    </div>
  );
};

// Specialized tooltip for royalty information
export const RoyaltyTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const royaltyContent = (
    <div className="text-left w-48">
      <div className="font-bold text-cyan-300 mb-2">NFT Royalties</div>
      <div className="space-y-1.5">
        <div className="text-cyan-400">• Total: 7.5%</div>
        <div className="text-gray-300">• Creator: 5.0%</div>
        <div className="text-gray-300">• Platform: 2.5%</div>
      </div>
      <div className="text-xs text-gray-400 mt-3 border-t border-gray-600 pt-2">
        Applied on secondary sales
      </div>
    </div>
  );

  return (
    <Tooltip content={royaltyContent} position="top" delay={200} className="min-w-48">
      {children}
    </Tooltip>
  );
};
