import { useState } from 'react';
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
    badge?: string;
    indexNumber?: string;
  }[];
  className?: string;
  onItemClick?: (item: any) => void;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-3 gap-4 py-4',
        className
      )}
    >
      {items.map((item, idx) => (
        <div
          key={item?.id || idx}
          className="relative group block p-1 h-full w-full cursor-pointer select-none"
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
          <div className="rounded-3xl h-full w-full p-6 overflow-hidden bg-card border border-border group-hover:border-primary/40 relative z-20 transition-all duration-200 shadow-xs flex flex-col justify-between">
            <div className="relative z-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono font-medium text-muted-foreground">
                  {item.indexNumber || `0${idx + 1}`}
                </span>
                {item.badge && (
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                    {item.badge}
                  </span>
                )}
              </div>
              <h4 className="text-foreground font-bold tracking-tight text-sm">
                {item.title}
              </h4>
              <p className="mt-2 text-muted-foreground leading-relaxed text-xs">
                {item.description}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] font-semibold text-primary">
              <span>Buka Koleksi</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
