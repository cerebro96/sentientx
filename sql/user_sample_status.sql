-- Simple table to track if user has sample workflows created
CREATE TABLE IF NOT EXISTS public.user_sample_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  samples_created BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_sample_status ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see/modify their own status
CREATE POLICY "Users manage own sample status" 
  ON public.user_sample_status 
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX user_sample_status_user_id_idx ON public.user_sample_status(user_id); 