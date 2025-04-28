'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Use next/navigation for App Router
import { supabase } from '@/lib/supabase'; // Adjust path if needed
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState(false); // Track if session is valid for reset
  const router = useRouter();

  useEffect(() => {
    // Supabase automatically handles the session restoration from the URL fragment
    // We just check if a session exists upon mount to ensure the user arrived via the link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsValidSession(true);
      } else {
        // Optional: Redirect or show message if no session (user didn't come from link)
        setError("Invalid or expired password reset link."); 
        router.push('/auth/login'); // Redirect to login if invalid
      }
    };
    checkSession();

    // Listen for password recovery event specifically, though getSession is often sufficient
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            setIsValidSession(true);
        }
    });

    return () => {
        authListener?.subscription.unsubscribe();
    };
}, [router]);


  const handlePasswordUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) { // Example: Enforce minimum password length
        setError("Password must be at least 6 characters long.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    const { error: updateError } = await supabase.auth.updateUser({ 
      password: password 
    });

    setIsLoading(false);

    if (updateError) {
      console.error("Password Update Error:", updateError);
      setError(updateError.message || "Failed to update password. Please try again or request a new reset link.");
    } else {
      setMessage("Password updated successfully! Redirecting to login...");
      setPassword('');
      setConfirmPassword('');
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/auth/login'); 
      }, 3000); // 3 second delay
    }
  };

  // Optional: Render loading or invalid state before session check completes
  // if (!isValidSession && !error) { 
  //   return <div>Loading...</div>; // Or a more sophisticated loading indicator
  // }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set New Password</CardTitle>
          <CardDescription>
            Please enter and confirm your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Render form only if session is valid, otherwise show error/message */} 
          {isValidSession ? (
            <form onSubmit={handlePasswordUpdate} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {message && (
                <Alert variant="default"> {/* Assuming default variant styles success */} 
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}
              {!message && ( // Hide form fields after success message
                <>
                 <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
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
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
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
                  <Button type="submit" className="w-full" disabled={isLoading}> 
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </>
               )}
            </form>
          ) : (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    {error || 'Invalid or expired password reset session. Please request a new link.'}
                </AlertDescription>
                <div className="mt-4">
                    <Link href="/auth/forgot-password">
                         <Button variant="outline">Request New Link</Button>
                    </Link>
                </div>
             </Alert>
          )}
          
          {!isValidSession && (
             <div className="mt-4 text-center text-sm">
                <Link href="/auth/login" className="underline text-muted-foreground hover:text-primary">
                    Back to Login
                </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 