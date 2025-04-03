import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClientComponentClient({
  supabaseUrl,
  supabaseKey: supabaseAnonKey
})

export type { User } from '@supabase/supabase-js'; 