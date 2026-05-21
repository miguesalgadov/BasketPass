'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Props {
  steps: string[];
  current: number;
  onStepClick?: (i: number) => void;
}

export function WizardStepper({ steps, current, onStepClick }: Props) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => onStepClick?.(i)}
              disabled={i > current}
              className={cn(
                'flex items-center gap-2 text-sm font-medium transition-colors',
                done && 'text-primary cursor-pointer',
                active && 'text-secondary cursor-default',
                !done && !active && 'text-muted-foreground cursor-not-allowed'
              )}
            >
              <span className={cn(
                'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 flex-shrink-0',
                done  && 'bg-primary border-primary text-white',
                active && 'border-primary text-primary bg-primary/5',
                !done && !active && 'border-border text-muted-foreground bg-surface'
              )}>
                {done ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>
              <span className="hidden sm:inline truncate">{label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mx-2',
                done ? 'bg-primary' : 'bg-border'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
