'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAppDispatch } from '../../lib/hooks';
import { loginUser } from '../../lib/features/auth/authSlice';

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
      router.push('/dashboard');
    } catch (err) {
      // Error handled by toast
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded shadow-md w-96">
        <h1 className="mb-6 text-2xl font-bold text-center text-gray-800">UniShelf</h1>
        <h2 className="mb-4 text-lg text-center text-gray-600">Login</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block mb-2 text-sm font-bold text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded text-gray-700 focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block mb-2 text-sm font-bold text-gray-700">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded text-gray-700 focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700 focus:outline-none focus:shadow-outline"
          >
            Login
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link href="/signup" className="text-sm text-blue-500 hover:underline">
            Need an account? Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
