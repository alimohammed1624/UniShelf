'use client';

import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import api from '@/lib/api';

interface PublicProfile {
  id: number;
  email: string;
  full_name: string;
  role: number;
}

// Module-level cache so repeated renders don't trigger duplicate fetches
const profileCache = new Map<number, PublicProfile | null>();
const inFlight = new Map<number, Promise<PublicProfile | null>>();

async function fetchProfile(userId: number): Promise<PublicProfile | null> {
  if (profileCache.has(userId)) return profileCache.get(userId)!;
  if (inFlight.has(userId)) return inFlight.get(userId)!;

  const promise = api
    .get<PublicProfile>(`/users/${userId}`)
    .then((res) => {
      profileCache.set(userId, res.data);
      return res.data;
    })
    .catch(() => {
      profileCache.set(userId, null);
      return null;
    })
    .finally(() => inFlight.delete(userId));

  inFlight.set(userId, promise);
  return promise;
}

/** Returns the first word of a full name string */
function firstName(fullName: string): string {
  return fullName.split(' ')[0] || fullName;
}

interface UserLabelProps {
  /** The numeric user ID to display */
  userId: number;
  /**
   * Optional pre-loaded data (e.g. from admin user list).
   * When supplied, no API call is made.
   */
  preloaded?: { full_name: string; email?: string };
  className?: string;
}

/**
 * Renders the uploader's first name with a styled CSS tooltip
 * showing their email (when available) on hover.
 */
export function UserLabel({ userId, preloaded, className }: UserLabelProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(
    profileCache.get(userId) ?? null,
  );

  useEffect(() => {
    if (preloaded) return;
    if (profileCache.has(userId)) {
      setProfile(profileCache.get(userId)!);
      return;
    }
    let cancelled = false;
    fetchProfile(userId).then((data) => {
      if (!cancelled) setProfile(data);
    });
    return () => { cancelled = true; };
  }, [userId, preloaded]);

  const resolvedFullName = preloaded?.full_name ?? profile?.full_name ?? null;
  const resolvedEmail    = preloaded?.email    ?? profile?.email    ?? null;
  const displayName = resolvedFullName ? firstName(resolvedFullName) : '';

  // Tooltip: show email when available (name is already visible on screen).
  // Fall back to full name when it adds info beyond the displayed first name.
  const tooltipContent: string | null =
    resolvedEmail
      ? resolvedEmail
      : resolvedFullName && resolvedFullName !== displayName
        ? resolvedFullName
        : null;

  return (
    <span className={`group relative inline-flex items-center gap-1 hover:z-[9999] ${className ?? ''}`}>
      {/* Icon + name pill */}
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[oklch(0.78_0.14_75)] bg-[oklch(0.68_0.14_75/12%)] text-xs font-medium transition-colors hover:bg-[oklch(0.68_0.14_75/22%)] cursor-default select-none">
        <User className="h-3 w-3 opacity-70 shrink-0" />
        {displayName}
      </span>

      {/* CSS tooltip — follows the trigger element regardless of transforms or overflow */}
      {tooltipContent && (
        <span
          className="pointer-events-none absolute top-full left-1/2 z-[9999] -translate-x-1/2 translate-y-3 whitespace-nowrap rounded-md bg-[#171421] border border-[oklch(0.68_0.14_75/25%)] px-3 py-2 text-xs text-[oklch(0.78_0.14_75)] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        >
          {tooltipContent}
        </span>
      )}
    </span>
  );
}
