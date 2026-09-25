/**
 * @file src/client/components/ui/input.tsx
 * @description Shadcn UI Input component dengan styling token Tailwind, border presisi, dan focus ring aksesibel.
 * @layer Presentation Component
 * 
 * Tujuan: Menyediakan input form standar yang konsisten untuk seluruh dialog dan halaman.
 * Caller: LoginPage, AddBookModal, CirculationDesk, CatalogPage, dll.
 * Dependensi: react, src/client/lib/utils.ts
 * Main Functions: Input
 * Side Effects: Menerima input keyboard pengguna.
 */

import * as React from 'react';
import { cn } from '../../lib/utils.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xl border border-input bg-background/60 px-3.5 py-2 text-xs sm:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
