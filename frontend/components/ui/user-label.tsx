'use client';

import { useEffect, useRef, useState } from 'react';
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
 * Renders the uploader's first name with a styled custom tooltip
 * showing their full name and email (when available).
 * Falls back gracefully to "User #<id>" while loading or on error.
 */
export function UserLabel({ userId, preloaded, className }: UserLabelProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(
    profileCache.get(userId) ?? null,
  );
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<'above' | 'below'>('above');
  const wrapperRef = useRef<HTMLSpanElement>(null);

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
  const displayName = resolvedFullName ? firstName(resolvedFullName) : `User #${userId}`;

  // Tooltip: show email when available (name is already visible on screen).
  // Fall back to full name when it adds info beyond the displayed first name.
  const tooltipContent: string | null =
    resolvedEmail
      ? resolvedEmail
      : resolvedFullName && resolvedFullName !== displayName
        ? resolvedFullName
        : null;

  const handleMouseEnter = () => {
    if (!tooltipContent || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setTooltipPos(rect.top > 80 ? 'above' : 'below');
    setTooltipVisible(true);
  };

  return (
    <span
      ref={wrapperRef}
      className={`relative inline-flex items-center gap-1 ${className ?? ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      {/* Icon + name pill */}
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[oklch(0.78_0.18_280)] bg-[oklch(0.68_0.24_280/12%)] text-xs font-medium transition-colors hover:bg-[oklch(0.68_0.24_280/22%)] cursor-default select-none">
        <User className="h-3 w-3 opacity-70 shrink-0" />
        {displayName}
      </span>

      {/* Custom tooltip — shown only when there's something extra to display */}
      {tooltipContent && tooltipVisible && (
        <span
          className={`
            pointer-events-none absolute z-50 left-0
            ${tooltipPos === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'}
            min-w-max rounded-md
            bg-[oklch(0.20_0.04_280)] border border-[oklch(0.68_0.24_280/25%)]
            px-3 py-2 shadow-lg shadow-[oklch(0.68_0.24_280/15%)]
          `}
        >
          <span className="text-xs text-[oklch(0.78_0.14_280)] whitespace-nowrap leading-tight">
            {tooltipContent}
          </span>
        </span>
      )}
    </span>
  );
}
