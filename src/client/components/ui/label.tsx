/**
 * @file src/client/components/ui/label.tsx
 * @description Shadcn UI Label component dengan tipografi rapi untuk form field.
 * @layer Presentation Component
 * 
 * Tujuan: Menyediakan label teks aksesibel untuk input form.
 * Caller: LoginPage, AddBookModal, CirculationDesk
 * Dependensi: react, src/client/lib/utils.ts
 * Main Functions: Label
 * Side Effects: Tidak ada.
 */

import * as React from 'react';
import { cn } from '../../lib/utils.js';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-xs font-semibold text-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none block mb-1.5',
        className
      )}
      {...props}
    />
  )
);
Label.displayName = 'Label';

export { Label };
