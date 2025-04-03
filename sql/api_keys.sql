-- Create api_keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  service TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS (Row Level Security)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own keys
CREATE POLICY "Users can only access their own API keys"
ON api_keys
FOR ALL
USING (auth.uid() = user_id);

-- Create an update trigger for updated_at
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_keys_timestamp
BEFORE UPDATE ON api_keys
FOR EACH ROW
EXECUTE FUNCTION update_api_keys_updated_at(); 