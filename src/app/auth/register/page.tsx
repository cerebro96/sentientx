'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '@/lib/auth';
import { AuthForm } from '@/components/auth/AuthForm';

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (email: string, password: string, fullName?: string) => {
    setIsLoading(true);
    setError(null);

    const { user, error } = await signUp(email, password, fullName);

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
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">SentientX</h1>
          <p className="text-muted-foreground">Create your account</p>
        </div>
        <AuthForm 
          mode="register" 
          onSubmit={handleRegister} 
          isLoading={isLoading} 
          error={error} 
        />
      </div>
    </div>
  );
} 