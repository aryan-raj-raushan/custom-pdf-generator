// components/ui/FontSizeStepper.tsx
'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface FontSizeStepperProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
}

export function FontSizeStepper({
  value,
  onChange,
  step = 1,
  min = 8,
  max = 28,
}: Readonly<FontSizeStepperProps>) {
  return (
    <div className="flex shrink-0 items-center overflow-hidden rounded-md border border-stone-200">
      <button
        type="button"
        title="Decrease font size"
        onClick={() => onChange(Math.max(min, Number((value - step).toFixed(2))))}
        disabled={value <= min}
        className="flex h-7 w-6 items-center justify-center bg-white text-stone-500 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus size={10} />
      </button>
      <span className="flex h-7 w-9 items-center justify-center border-x border-stone-200 bg-white text-[11px] text-stone-600">
        {value}
      </span>
      <button
        type="button"
        title="Increase font size"
        onClick={() => onChange(Math.min(max, Number((value + step).toFixed(2))))}
        disabled={value >= max}
        className="flex h-7 w-6 items-center justify-center bg-white text-stone-500 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={10} />
      </button>
    </div>
  );
}

export default FontSizeStepper;
