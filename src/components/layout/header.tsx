'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getCurrentUser, getUserProfile, signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { ProfileDialog } from '@/components/profile/ProfileDialog';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { useTheme } from 'next-themes';

export function Header() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [initials, setInitials] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log('Fetching user data...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error getting current user:', userError);
          return;
        }
        
        if (user) {
          console.log('User found:', user);
          setEmail(user.email || '');
          setFullName(user.user_metadata?.full_name || '');
          
          // Generate initials from full name or email
          if (user.user_metadata?.full_name) {
            const names = user.user_metadata.full_name.split(' ');
            if (names.length >= 2) {
              setInitials(`${names[0][0].toUpperCase()}${names[1][0].toUpperCase()}`);
            } else {
              setInitials(names[0][0].toUpperCase());
            }
          } else if (user.email) {
            setInitials(user.email[0].toUpperCase());
          } else {
            setInitials('U');
          }
        }
      } catch (error) {
        console.error('Error in fetchUserData:', error);
        setInitials('U');
      }
    };
    
    fetchUserData();
  }, []);
  
  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  const handleNameUpdate = (newName: string) => {
    setFullName(newName);
    // Update initials
    const names = newName.split(' ');
    if (names.length >= 2) {
      setInitials(`${names[0][0].toUpperCase()}${names[1][0].toUpperCase()}`);
    } else {
      setInitials(names[0][0].toUpperCase());
    }
  };

  return (
    <header className="border-b">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold">Overview</h1>
          <p className="ml-2 text-sm text-muted-foreground">
            All the AI workflows, credentials and executions you have access to
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={fullName || email} />
                  ) : null}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{fullName || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ProfileDialog 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentName={fullName}
        onNameUpdate={handleNameUpdate}
      />
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={theme || 'system'}
        onThemeChange={setTheme}
      />
    </header>
  );
} 