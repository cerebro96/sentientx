'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { ProfileDialog } from '@/components/profile/ProfileDialog';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { useTheme } from 'next-themes';
import { Activity } from 'lucide-react';

export function ExecutionHeader() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [initials, setInitials] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setEmail(user.email || '');
          
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (profile && !error) {
            setFullName(profile.full_name || '');
            setAvatarUrl(profile.avatar_url || '');
          }
          
          if (!profile?.full_name) {
            const emailInitials = user.email?.substring(0, 2).toUpperCase() || 'U';
            setInitials(emailInitials);
          } else {
            generateInitials(profile.full_name);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    }
    
    fetchUserData();
  }, []);
  
  const generateInitials = (name: string) => {
    const nameArray = name.split(' ');
    let initials = '';
    
    if (nameArray.length === 1) {
      initials = nameArray[0].substring(0, 2).toUpperCase();
    } else {
      initials = (nameArray[0].charAt(0) + nameArray[nameArray.length - 1].charAt(0)).toUpperCase();
    }
    
    setInitials(initials);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNameUpdate = (newName: string) => {
    setFullName(newName);
    generateInitials(newName);
  };

  const handleOpenProfile = () => {
    setIsDropdownOpen(false);
    // Add small delay to allow dropdown to close properly
    setTimeout(() => {
      setIsProfileOpen(true);
    }, 100);
  };

  const handleOpenSettings = () => {
    setIsDropdownOpen(false);
    // Add small delay to allow dropdown to close properly
    setTimeout(() => {
      setIsSettingsOpen(true);
    }, 100);
  };

  return (
    <header className="border-b">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center">
          <Activity className="mr-2 h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Executions</h1>
          <p className="ml-2 text-sm text-muted-foreground">
            Track and monitor your workflow execution history
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
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
              <DropdownMenuItem onClick={handleOpenProfile}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenSettings}>Settings</DropdownMenuItem>
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