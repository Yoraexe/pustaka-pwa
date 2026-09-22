import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils.js';

export const HoverEffect = ({
  items,
  className,
  onItemClick,
}: {
  items: {
    id: number | string;
    title: string;
    description: string;
    link?: string;
    icon?: React.ReactNode;
    badge?: string;
  }[];
  className?: string;
  onItemClick?: (item: any) => void;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 py-6 gap-4',
        className
      )}
    >
      {items.map((item, idx) => (
        <div
          key={item?.id || idx}
          className="relative group block p-2 h-full w-full cursor-pointer"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
          onClick={() => onItemClick?.(item)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-primary/10 dark:bg-primary/20 block rounded-3xl"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.15 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.2 },
                }}
              />
            )}
          </AnimatePresence>
          <div className="rounded-3xl h-full w-full p-5 overflow-hidden bg-card border border-border group-hover:border-primary/50 relative z-20 transition-colors shadow-xs">
            <div className="relative z-50">
              <div className="flex items-center justify-between mb-2">
                {item.icon}
                {item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {item.badge}
                  </span>
                )}
              </div>
              <h4 className="text-foreground font-bold tracking-wide text-sm mt-1">
                {item.title}
              </h4>
              <p className="mt-1.5 text-muted-foreground tracking-wide leading-relaxed text-xs">
                {item.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
