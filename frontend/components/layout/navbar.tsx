'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bookmark, FolderOpen, User, Shield, Settings } from 'lucide-react';
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
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const userRole = useAppSelector((state) => state.auth.user?.role ?? -1);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
    toast.success('Logged out successfully');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[oklch(0.68_0.14_75/18%)] bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <span className="brand-logo text-lg font-bold tracking-tight">UniShelf</span>
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
