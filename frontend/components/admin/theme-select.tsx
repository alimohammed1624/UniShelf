'use client';

import { useEffect, useRef, useState } from 'react';

/* ── Fully-themed custom select ─────────────────────────────────────── */
export function ThemeSelect<T extends string | number>({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        style={{
          height: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0 0.75rem',
          borderRadius: '0.375rem',
          border: `1px solid oklch(0.68 0.14 75 / ${open ? '80%' : '45%'})`,
          background: 'oklch(0.155 0.026 272)',
          color: 'oklch(0.82 0.13 75)',
          fontSize: '0.875rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          whiteSpace: 'nowrap',
          boxShadow: open ? '0 0 0 2px oklch(0.68 0.14 75 / 25%)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          outline: 'none',
          minWidth: '6rem',
          justifyContent: 'space-between',
        }}
      >
        <span>{selected?.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="currentColor"
          style={{ opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            minWidth: '100%',
            zIndex: 50,
            background: 'oklch(0.155 0.026 272)',
            border: '1px solid oklch(0.68 0.14 75 / 40%)',
            borderRadius: '0.375rem',
            boxShadow: '0 8px 24px oklch(0 0 0 / 50%), 0 0 0 1px oklch(0.68 0.14 75 / 12%) inset',
            overflow: 'hidden',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                display: 'block',
                width: '100%',
                padding: '0.4rem 0.75rem',
                textAlign: 'left',
                fontSize: '0.875rem',
                cursor: 'pointer',
                border: 'none',
                outline: 'none',
                background: opt.value === value
                  ? 'oklch(0.68 0.14 75 / 22%)'
                  : 'transparent',
                color: opt.value === value
                  ? 'oklch(0.88 0.16 75)'
                  : 'oklch(0.85 0.02 272)',
                fontWeight: opt.value === value ? 500 : 400,
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value) {
                  e.currentTarget.style.background = 'oklch(0.68 0.14 75 / 12%)';
                  e.currentTarget.style.color = 'oklch(0.88 0.13 75)';
                }
              }}
              onMouseLeave={(e) => {
                if (opt.value !== value) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'oklch(0.85 0.02 272)';
                }
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
