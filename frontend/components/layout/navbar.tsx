'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bookmark, FolderOpen, User, Shield, ShieldCheck, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { logout } from '@/lib/features/auth/authSlice';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/search', label: 'Search', icon: Search },
  { href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { href: '/my-resources', label: 'My Resources', icon: FolderOpen },
  { href: '/profile', label: 'Profile', icon: User },
];

const ADMIN_LINKS = [
  { href: '/moderate', label: 'Moderate', icon: Shield, role: 1 },
  { href: '/admin', label: 'Admin', icon: Settings, role: 2 },
  { href: '/superadmin', label: 'Superadmin', icon: ShieldCheck, role: 3 },
];

/**
 * `containerClassName` exists so the landing page can widen the bar to match
 * its own max-w-6xl content. cn() runs through tailwind-merge, so a max-w-*
 * passed in replaces the default rather than fighting it.
 */
export function Navbar({ containerClassName }: { containerClassName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const userRole = useAppSelector((state) => state.auth.user?.role ?? -1);

  const handleLogout = () => {
    dispatch(logout());
    // Landing page, not /login: signing out is not a request to sign back in.
    // The guard in (app)/layout.tsx still sends you to /login if you try to
    // reach a protected page without a session.
    router.push('/');
    toast.success('Logged out successfully');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[oklch(0.68_0.14_75/18%)] bg-background/80 backdrop-blur-md">
      <div
        className={cn(
          'mx-auto flex max-w-5xl items-center justify-between px-4 py-3',
          containerClassName
        )}
      >
        <Link
          href="/"
          className="brand-logo text-lg font-bold tracking-tight transition-opacity hover:opacity-80"
        >
          UniShelf
        </Link>
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                pathname === href ? 'nav-link-active' : 'text-muted-foreground'
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          {ADMIN_LINKS.map(({ href, label, icon: Icon, role }) =>
            userRole >= role ? (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                  pathname === href ? 'nav-link-active' : 'text-muted-foreground'
                )}
              >
                <Icon size={15} />
                {label}
              </Link>
            ) : null
          )}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
