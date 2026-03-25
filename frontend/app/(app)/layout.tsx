'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { useAppDispatch } from '@/lib/hooks';
import { fetchCurrentUser, initializeAuth, logout } from '@/lib/features/auth/authSlice';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    dispatch(initializeAuth());
    dispatch(fetchCurrentUser()).unwrap()
      .then(() => setReady(true))
      .catch(() => {
        dispatch(logout());
        router.replace('/login');
      });
  }, [dispatch, router]);

  if (!ready) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
