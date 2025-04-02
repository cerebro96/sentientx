import { supabase, User } from './supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export interface AuthResponse {
  user: User | null;
  error: Error | null;
}

export interface ProfileResponse {
  profile: UserProfile | null;
  error: Error | null;
}

export const signUp = async (email: string, password: string, fullName?: string): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;

    // Create a profile for the new user
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            email: data.user.email,
            full_name: fullName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Don't throw here as the user is already created
      }
    }

    return { user: data.user, error: null };
  } catch (error) {
    console.error('Error signing up:', error);
    return { user: null, error: error as Error };
  }
};

export const signIn = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return { user: data.user, error: null };
  } catch (error) {
    console.error('Error signing in:', error);
    return { user: null, error: error as Error };
  }
};

export const signOut = async (): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error: error as Error };
  }
};

export const getCurrentUser = async (): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user: data.user, error: null };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { user: null, error: error as Error };
  }
};

export const getUserProfile = async (userId: string): Promise<ProfileResponse> => {
  try {
    console.log('Fetching profile for user:', userId);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      // If the error is that the profile doesn't exist, create it
      if (error.code === 'PGRST116') {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([
              {
                id: userId,
                email: userData.user.email,
                full_name: userData.user.user_metadata?.full_name || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]);

          if (insertError) {
            console.error('Error creating profile:', insertError);
            return { profile: null, error: insertError };
          }

          // Fetch the newly created profile
          const { data: newProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (fetchError) {
            console.error('Error fetching new profile:', fetchError);
            return { profile: null, error: fetchError };
          }

          return { profile: newProfile as UserProfile, error: null };
        }
      }
      return { profile: null, error };
    }

    console.log('Profile data:', data);
    return { profile: data as UserProfile, error: null };
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return { profile: null, error: error as Error };
  }
};

export const signInWithProvider = async (provider: 'google' | 'github') => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error(`Error signing in with ${provider}:`, error);
    return { data: null, error: error as Error };
  }
}; 