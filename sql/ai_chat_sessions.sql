-- Create AI Chat Sessions table
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id UUID NULL, -- Associated workflow ID (can be null for general sessions)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create AI Chat Messages table
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES ai_chat_sessions(session_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS ai_chat_sessions_user_id_idx ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS ai_chat_sessions_session_id_idx ON ai_chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS ai_chat_sessions_workflow_id_idx ON ai_chat_sessions(workflow_id);
CREATE INDEX IF NOT EXISTS ai_chat_sessions_user_workflow_idx ON ai_chat_sessions(user_id, workflow_id);
CREATE INDEX IF NOT EXISTS ai_chat_messages_session_id_idx ON ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS ai_chat_messages_timestamp_idx ON ai_chat_messages(timestamp);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating updated_at
CREATE TRIGGER update_ai_chat_sessions_updated_at
    BEFORE UPDATE ON ai_chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only access their own chat sessions
CREATE POLICY "Users can view their own chat sessions" ON ai_chat_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat sessions" ON ai_chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" ON ai_chat_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only access messages from their own sessions
CREATE POLICY "Users can view messages from their sessions" ON ai_chat_messages
    FOR SELECT USING (
        session_id IN (
            SELECT session_id FROM ai_chat_sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages to their sessions" ON ai_chat_messages
    FOR INSERT WITH CHECK (
        session_id IN (
            SELECT session_id FROM ai_chat_sessions WHERE user_id = auth.uid()
        )
    ); 