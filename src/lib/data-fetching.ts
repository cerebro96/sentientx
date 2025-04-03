import { cache } from 'react'
import { supabase } from './supabase'

export interface Execution {
  id: string
  workflow_id: string
  workflow_name: string
  status: 'success' | 'failed' | 'running' | 'pending'
  started_at: string
  run_time: string
  triggered_by: string
  created_at: string
  updated_at: string
}

export const fetchUserData = cache(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
    
  return { user, profile }
})

export const fetchExecutions = cache(async () => {
  try {
    console.log('Fetching executions from Supabase...');
    
    // First, check if the table exists and has data
    const { count, error: countError } = await supabase
      .from('executions')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error checking executions table:', countError);
      throw countError;
    }
    
    console.log(`Found ${count} executions in table`);
    
    const { data: executions, error } = await supabase
      .from('executions')
      .select('*')
      .order('started_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching executions:', error);
      throw error;
    }
    
    console.log('Executions fetched successfully:', executions?.length || 0);
    return executions as Execution[];
  } catch (error) {
    console.error('Error in fetchExecutions:', error);
    throw error;
  }
})

export const fetchWorkflowExecutions = cache(async (workflowId: string) => {
  try {
    const { data: executions, error } = await supabase
      .from('executions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('started_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching workflow executions:', error);
      throw error;
    }
    
    return executions as Execution[];
  } catch (error) {
    console.error('Error in fetchWorkflowExecutions:', error);
    throw error;
  }
})

export async function revalidateData(path: string) {
  try {
    await fetch(`/api/revalidate?path=${path}`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path })
    })
  } catch (error) {
    console.error('Error revalidating data:', error)
  }
} 