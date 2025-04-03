'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth';
import { AuthForm } from '@/components/auth/AuthForm';
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    const { user, error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    if (user) {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <Link href="/" className="flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-primary" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7.5 12H16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10.5 7.5L7.5 12L10.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h1 className="text-3xl font-bold ml-2">SentientX</h1>
          </Link>
          <p className="text-muted-foreground">Next Generation of Intelligent AI Agents</p>
        </div>
        <AuthForm mode="login" onSubmit={handleLogin} isLoading={isLoading} error={error} />
      </div>
    </div>
  );
} 