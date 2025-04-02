'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OAuthButtons } from './OAuthButtons';
import Link from 'next/link';

interface AuthFormProps {
  mode: 'login' | 'register';
  onSubmit: (email: string, password: string, fullName?: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function AuthForm({ mode, onSubmit, isLoading, error }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'register') {
      await onSubmit(email, password, fullName);
    } else {
      await onSubmit(email, password);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{mode === 'login' ? 'Login' : 'Create an account'}</CardTitle>
        <CardDescription>
          {mode === 'login' 
            ? 'Enter your email and password to log in to your account' 
            : 'Fill in the details below to create a new account'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name" 
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@example.com" 
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
              placeholder="••••••••" 
              required 
            />
          </div>
          
          {error && (
            <div className="text-sm text-red-500">{error}</div>
          )}
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Loading...' : mode === 'login' ? 'Login' : 'Create Account'}
          </Button>
        </form>
        
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        
        <OAuthButtons isLoading={isLoading} />
      </CardContent>
      <CardFooter className="flex justify-center">
        <div className="text-sm text-muted-foreground">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-primary hover:underline">
                Register
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:underline">
                Login
              </Link>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
} 