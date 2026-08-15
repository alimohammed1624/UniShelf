'use client';

import { EyeOff } from 'lucide-react';

interface AnonymizeFieldProps {
  /** Whether the resource is already anonymous. */
  isAnonymous: boolean;
  /** Directories carry their whole subtree along, so the copy says so. */
  isDirectory: boolean;
  checked: boolean;
  onChange: (value: boolean) => void;
  id?: string;
}

/**
 * "Make anonymous" control for the edit modals.
 *
 * Anonymity is a one-way latch, so a resource that already has it gets a
 * statement of fact rather than an input — there is no setting left to change,
 * and offering a checked box the user cannot uncheck reads as a bug.
 */
export function AnonymizeField({
  isAnonymous,
  isDirectory,
  checked,
  onChange,
  id = 'edit-anonymous',
}: AnonymizeFieldProps) {
  if (isAnonymous) {
    return (
      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
        <EyeOff className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
        <span>
          <span className="font-medium">Uploaded anonymously.</span>{' '}
          <span className="text-muted-foreground">This cannot be changed back.</span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        checked ? 'border-amber-500/50 bg-amber-500/10' : 'bg-muted/35'
      }`}
    >
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 shrink-0 accent-primary"
        />
        <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="text-sm font-medium leading-none">Make anonymous</span>
          <span className="text-xs text-muted-foreground leading-none">This cannot be undone.</span>
        </span>
      </label>
      {checked && isDirectory ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Everything inside this folder becomes anonymous too.
        </p>
      ) : null}
    </div>
  );
}
