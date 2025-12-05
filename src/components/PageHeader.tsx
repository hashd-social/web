import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: ReactNode;
  rightContent?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon: Icon,
  title,
  subtitle,
  rightContent
}) => {
  return (
    <div className="relative pb-2 pt-8">
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <Icon className="w-12 h-12 neon-text-cyan" />
            <div>
              <h2 className="text-2xl font-bold neon-text-cyan tracking-wide font-mono">{title}</h2>
              <p className="text-gray-400 mt-1 font-mono text-sm">{subtitle}</p>
            </div>
          </div>
          {rightContent && (
            <div className="flex items-center gap-3">
              {rightContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
