'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAppDispatch } from '@/lib/hooks';
import { loginUser } from '@/lib/features/auth/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthCard } from '@/components/auth/auth-card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useAppDispatch();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const promise = dispatch(loginUser(formData)).unwrap();
      
      toast.promise(promise, {
        loading: 'Logging in...',
        success: 'Login successful',
        error: (err) => err || 'Login failed'
      });
      
      await promise;
      router.push('/my-resources');
    } catch {
      // Error handled by toast
    }
  };

  return (
    <AuthCard
      title="UniShelf"
      description="Sign in to your account"
      footerText="Need an account?"
      footerHref="/signup"
      footerLinkLabel="Sign up"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full">
          Login
        </Button>
      </form>
    </AuthCard>
  );
}
