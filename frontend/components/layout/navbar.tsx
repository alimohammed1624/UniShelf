'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bookmark, FolderOpen, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '@/lib/hooks';
import { logout } from '@/lib/features/auth/authSlice';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/search', label: 'Search', icon: Search },
  { href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { href: '/my-resources', label: 'My Resources', icon: FolderOpen },
  { href: '/profile', label: 'Profile', icon: User },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
    toast.success('Logged out successfully');
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <span className="text-lg font-semibold">UniShelf</span>
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted',
                pathname === href ? 'bg-muted text-foreground' : 'text-muted-foreground'
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
