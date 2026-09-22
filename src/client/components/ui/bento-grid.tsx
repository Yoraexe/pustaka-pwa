import React from 'react';
import { cn } from '../../lib/utils.js';

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        'grid md:auto-rows-[16rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto',
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
  badge,
  onClick,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'row-span-1 rounded-3xl group/bento hover:shadow-lg transition duration-200 shadow-xs p-4 bg-card border border-border justify-between flex flex-col space-y-3 cursor-pointer',
        className
      )}
    >
      {header}
      <div className="group-hover/bento:translate-x-1 transition duration-200">
        <div className="flex items-center justify-between mb-1.5">
          {icon}
          {badge}
        </div>
        <div className="font-bold text-sm text-foreground mb-1">
          {title}
        </div>
        <div className="text-xs text-muted-foreground line-clamp-2">
          {description}
        </div>
      </div>
    </div>
  );
};
