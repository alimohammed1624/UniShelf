'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRegistering) {
        // Registration Logic
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (res.ok) {
                alert('Registration successful! Please login.');
                setIsRegistering(false);
            } else {
                const data = await res.json();
                alert(`Registration failed: ${data.detail}`);
            }
        } catch (error) {
            console.error('An error occurred:', error);
            alert('An error occurred during registration.');
        }

    } else {
        // Login Logic
        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.access_token);
                router.push('/dashboard');
            } else {
                alert('Login failed');
            }
        } catch (error) {
             console.error('An error occurred:', error);
             alert('An error occurred during login.');
        }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded shadow-md w-96">
        <h1 className="mb-6 text-2xl font-bold text-center text-gray-800">UniShelf</h1>
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
            {isRegistering ? 'Register' : 'Login'}
          </button>
        </form>
        <div className="mt-4 text-center">
            <button 
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm text-blue-500 hover:underline"
            >
                {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
            </button>
        </div>
      </div>
    </div>
  );
}
