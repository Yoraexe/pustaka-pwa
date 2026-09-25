/**
 * @file src/client/components/ui/bento-grid.tsx
 * @description Aceternity UI Bento Grid & Bento Grid Item dengan hover motion, border presisi, dan tata letak modular.
 * @layer Presentation Component
 * 
 * Tujuan: Menyediakan tata letak bento grid khas Aceternity UI untuk etalase fitur dan kurasi cerdas.
 * Caller: src/client/pages/CatalogPage.tsx
 * Dependensi: react, src/client/lib/utils.ts
 * Main Functions: BentoGrid, BentoGridItem
 * Side Effects: Menerima interaksi klik pengguna.
 */

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
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0',
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
  badge,
  actionText = 'Jelajahi',
  onClick,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  badge?: React.ReactNode;
  actionText?: string;
  onClick?: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group/bento relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer select-none min-w-0 w-full',
        className
      )}
    >
      {/* Background subtle hover glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover/bento:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {header && <div className="mb-3 relative z-10">{header}</div>}

      <div className="relative z-10 flex flex-col justify-between flex-1 min-w-0">
        <div className="min-w-0">
          {badge && <div className="mb-2.5">{badge}</div>}
          <h3 className="font-bold text-sm text-foreground tracking-tight group-hover/bento:text-primary transition-colors truncate">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>

        <div className="mt-3.5 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-primary">
          <span className="truncate">{actionText}</span>
          <span className="group-hover/bento:translate-x-1 transition-transform shrink-0 ml-1">→</span>
        </div>
      </div>
    </div>
  );
};
