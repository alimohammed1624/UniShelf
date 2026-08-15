'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
];

interface VisibilitySelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Visibility picker built from a button and a listbox rather than a native
 * <select>: browsers paint the option list with OS colors, which comes out
 * white on the dark theme regardless of the classes on the <select> itself.
 */
function VisibilitySelect({ id, value, onChange, className }: VisibilitySelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const label = VISIBILITY_OPTIONS.find((option) => option.value === value)?.label ?? 'Select visibility';

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {label}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover p-1 shadow-md"
        >
          {VISIBILITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export { VisibilitySelect, VISIBILITY_OPTIONS };
