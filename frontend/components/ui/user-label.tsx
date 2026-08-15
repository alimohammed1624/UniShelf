'use client';

import { useEffect, useRef, useState } from 'react';
import { User, UserRoundX } from 'lucide-react';
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
  /** The numeric user ID to display. Null when the API withheld it. */
  userId: number | null;
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
 *
 * A null `userId` means the viewer is not allowed to know who this is — an
 * anonymous upload seen by a member. That renders as a plain "Anonymous" pill
 * with no fetch and no tooltip. The check keys off the missing id rather than a
 * separate flag so the component cannot be talked into revealing a name the API
 * never sent.
 */
export function UserLabel({ userId, preloaded, className }: UserLabelProps) {
  const anonymous = userId === null;

  const [profile, setProfile] = useState<PublicProfile | null>(
    userId !== null ? profileCache.get(userId) ?? null : null,
  );

  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<'above' | 'below'>('above');
  const [tooltipCoords, setTooltipCoords] = useState<{ left: number; top: number } | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (preloaded || userId === null) return;
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
  const displayName = anonymous
    ? 'Anonymous'
    : resolvedFullName ? firstName(resolvedFullName) : '';

  // Tooltip: show email when available (name is already visible on screen).
  // Fall back to full name when it adds info beyond the displayed first name.
  // Anonymous labels never get one — there is nothing to reveal.
  const tooltipContent: string | null =
    anonymous
      ? null
      : resolvedEmail
        ? resolvedEmail
        : resolvedFullName && resolvedFullName !== displayName
          ? resolvedFullName
          : null;

  const handleMouseEnter = () => {
    if (!tooltipContent || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const above = rect.top > 80;
    setTooltipPos(above ? 'above' : 'below');
    setTooltipCoords({ left: rect.left, top: above ? rect.top - 8 : rect.bottom + 8 });
    setTooltipVisible(true);
  };

  const handleMouseLeave = () => {
    setTooltipVisible(false);
    setTooltipCoords(null);
  };

  return (
    <span ref={wrapperRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className={`inline-flex items-center gap-1 ${className ?? ''}`}>
      {/* Icon + name pill. Anonymous wears a muted variant so it reads as an
          absence of attribution rather than as a user named "Anonymous". */}
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium transition-colors cursor-default select-none ${
          anonymous
            ? 'text-muted-foreground bg-muted/60 italic'
            : 'text-[oklch(0.78_0.14_75)] bg-[oklch(0.68_0.14_75/12%)] hover:bg-[oklch(0.68_0.14_75/22%)]'
        }`}
      >
        {anonymous ? (
          <UserRoundX className="h-3 w-3 opacity-70 shrink-0" />
        ) : (
          <User className="h-3 w-3 opacity-70 shrink-0" />
        )}
        {displayName}
      </span>

      {/* Custom tooltip — fixed positioning escapes overflow-x-auto clipping */}
      {tooltipContent && tooltipVisible && tooltipCoords && (
        <span
          className="pointer-events-none fixed z-[9999] min-w-max rounded-md bg-[#171421] border border-[oklch(0.68_0.14_75/25%)] px-3 py-2 text-xs text-[oklch(0.78_0.14_75)]"
          style={{ left: tooltipCoords.left, top: tooltipCoords.top, transform: tooltipPos === 'above' ? 'translateY(-100%)' : 'translateY(0)' }}
        >
          {tooltipContent}
        </span>
      )}
    </span>
  );
}
