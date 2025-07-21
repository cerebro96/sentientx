import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  session_id: string;
  user_id: string;
  workflow_id?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

// Generate a unique session ID
export function generateSessionId(): string {
  return uuidv4();
}

// Create a new chat session
export async function createChatSession(workflowId?: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const sessionId = generateSessionId();
  
  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .insert({
      session_id: sessionId,
      user_id: user.id,
      workflow_id: workflowId || null,
      metadata: {}
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating chat session:', error);
    throw error;
  }

  return sessionId;
}

// Get existing session for a workflow or create new one
export async function getOrCreateWorkflowSession(workflowId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // First, try to find existing session for this workflow
  const { data: existingSession, error: findError } = await supabase
    .from('ai_chat_sessions')
    .select('session_id')
    .eq('user_id', user.id)
    .eq('workflow_id', workflowId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (existingSession && !findError) {
    console.log('Found existing session for workflow:', workflowId, existingSession.session_id);
    return existingSession.session_id;
  }

  // No existing session found, create new one
  console.log('Creating new session for workflow:', workflowId);
  return await createChatSession(workflowId);
}

// Save a message to a session
export async function saveChatMessage(sessionId: string, message: ChatMessage): Promise<void> {
  const { error } = await supabase
    .from('ai_chat_messages')
    .insert({
      session_id: sessionId,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
      metadata: {}
    });

  if (error) {
    console.error('Error saving message:', error);
    throw error;
  }

  // Update session updated_at timestamp
  await supabase
    .from('ai_chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('session_id', sessionId);
}

// Load chat history for a session
export async function loadChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('role, content, timestamp')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('Error loading chat history:', error);
    throw error;
  }

  return data?.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    timestamp: new Date(msg.timestamp)
  })) || [];
}

// Load chat history for a specific workflow
export async function loadWorkflowChatHistory(workflowId: string): Promise<ChatMessage[]> {
  const sessionId = await getOrCreateWorkflowSession(workflowId);
  return await loadChatHistory(sessionId);
}

// Get all user sessions
export async function getUserChatSessions(): Promise<ChatSession[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error loading user sessions:', error);
    throw error;
  }

  return data || [];
}

// Get sessions for a specific workflow
export async function getWorkflowChatSessions(workflowId: string): Promise<ChatSession[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('ai_chat_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('workflow_id', workflowId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error loading workflow sessions:', error);
    throw error;
  }

  return data || [];
} 