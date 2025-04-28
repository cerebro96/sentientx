'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OAuthButtons } from './OAuthButtons';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from 'lucide-react';

interface AuthFormProps {
  mode: 'login' | 'register';
  onSubmit: (email: string, password: string, fullName?: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function AuthForm({ mode, onSubmit, isLoading, error: propError }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (mode === 'register' && password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    await onSubmit(email, password, mode === 'register' ? fullName : undefined);
  };

  const displayError = formError || propError;

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
        <form onSubmit={handleSubmit} className="space-y-6">
          {displayError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}
          
          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="fullname">Full Name</Label>
              <Input 
                id="fullname"
                type="text" 
                placeholder="Your Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required 
                disabled={isLoading}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="you@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password"
              type="password"
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              disabled={isLoading}
            />
          </div>
          
          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input 
                id="confirm-password"
                type="password"
                placeholder="••••••••" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required 
                disabled={isLoading}
              />
            </div>
          )}
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </>
            ) : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </Button>
        </form>
        
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className=" px-2 text-muted-foreground">
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
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
} 