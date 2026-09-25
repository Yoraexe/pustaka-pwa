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
        'grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto',
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
        'group/bento relative overflow-hidden rounded-3xl p-6 bg-card border border-border/80 hover:border-primary/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer select-none',
        className
      )}
    >
      {/* Background subtle hover glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover/bento:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {header && <div className="mb-4 relative z-10">{header}</div>}

      <div className="relative z-10 flex flex-col justify-between flex-1">
        <div>
          {badge && <div className="mb-3">{badge}</div>}
          <h3 className="font-bold text-base text-foreground tracking-tight group-hover/bento:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-primary">
          <span>{actionText}</span>
          <span className="group-hover/bento:translate-x-1 transition-transform">→</span>
        </div>
      </div>
    </div>
  );
};
