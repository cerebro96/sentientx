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
    
    // Get the current session to identify the user
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    
    if (!userId) {
      console.error('No authenticated user found');
      return [];
    }
    
    console.log(`Fetching executions for user: ${userId}`);
    
    // First, fetch all workflows owned by the user
    const { data: userWorkflows, error: workflowsError } = await supabase
      .from('workflows')
      .select('id')
      .eq('user_id', userId);
    
    if (workflowsError) {
      console.error('Error fetching user workflows:', workflowsError);
      return [];
    }
    
    // Extract workflow IDs
    const workflowIds = userWorkflows.map(workflow => workflow.id);
    
    if (workflowIds.length === 0) {
      console.log('User has no workflows');
      return [];
    }
    
    // Fetch executions for the user's workflows
    const { data: executions, error } = await supabase
      .from('executions')
      .select('*')
      .in('workflow_id', workflowIds)
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
    // Get the current session to identify the user
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    
    if (!userId) {
      console.error('No authenticated user found');
      return [];
    }
    
    // First verify the workflow belongs to the current user
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single();
    
    if (workflowError || !workflow) {
      console.error('Workflow not found or not owned by current user');
      return [];
    }
    
    // Fetch executions for the specific workflow
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