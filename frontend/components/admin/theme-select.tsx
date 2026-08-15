'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const PANEL_GAP = 4;
const PANEL_MAX_HEIGHT = 260;

type PanelPosition = {
  left: number;
  minWidth: number;
  maxHeight: number;
} & ({ top: number; bottom?: never } | { bottom: number; top?: never });

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
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // The panel is portalled to <body> so no ancestor with `overflow: hidden`
  // (Card) or `overflow-x: auto` (Table) can clip it. That means it is
  // positioned in viewport coordinates, measured off the trigger.
  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP;
    const spaceAbove = rect.top - PANEL_GAP;
    const flipUp = spaceBelow < Math.min(PANEL_MAX_HEIGHT, spaceAbove);
    const maxHeight = Math.min(PANEL_MAX_HEIGHT, Math.max(flipUp ? spaceAbove : spaceBelow, 96));

    setPosition({
      left: rect.left,
      minWidth: rect.width,
      maxHeight,
      // Anchor the flipped panel by its bottom edge so a short list still sits
      // right above the trigger instead of floating a max-height away from it.
      ...(flipUp
        ? { bottom: window.innerHeight - rect.top + PANEL_GAP }
        : { top: rect.bottom + PANEL_GAP }),
    });
  }, []);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    // Capture phase so Escape closes only this select — without it a select
    // opened inside a dialog would dismiss the dialog too.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, reposition]);

  const selected = options.find((o) => o.value === value);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
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
      {open && position && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          style={{
            position: 'fixed',
            top: position.top,
            bottom: position.bottom,
            left: position.left,
            minWidth: position.minWidth,
            maxHeight: position.maxHeight,
            overflowY: 'auto',
            overflowX: 'hidden',
            // Radix marks the body `pointer-events: none` while a modal dialog
            // is open; opt this layer back in so the options stay clickable.
            pointerEvents: 'auto',
            zIndex: 100,
            background: 'oklch(0.155 0.026 272)',
            border: '1px solid oklch(0.68 0.14 75 / 40%)',
            borderRadius: '0.375rem',
            boxShadow: '0 8px 24px oklch(0 0 0 / 50%), 0 0 0 1px oklch(0.68 0.14 75 / 12%) inset',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
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
        </div>,
        document.body,
      )}
    </div>
  );
}
