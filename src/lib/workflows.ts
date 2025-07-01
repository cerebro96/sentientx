import { supabase } from './supabase';
import { toast } from 'sonner';

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  agent_type: string;
  is_active: boolean;
  tags: string[];
  nodes: any[];
  edges: any[];
  created_at: string;
  updated_at: string;
}

export interface CreateWorkflowParams {
  name: string;
  description?: string;
  agent_type: string;
  tags?: string[];
  is_active?: boolean;
  nodes?: any[];
  edges?: any[];
}

export async function createWorkflow(params: CreateWorkflowParams) {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    
    const { data, error } = await supabase
      .from('workflows')
      .insert({
        user_id: userData.user.id,
        name: params.name,
        description: params.description || null,
        agent_type: params.agent_type,
        is_active: params.is_active !== undefined ? params.is_active : true,
        tags: params.tags || [],
        nodes: params.nodes || [],
        edges: params.edges || [],
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error creating workflow:', error);
    toast.error(error.message || 'Failed to create workflow');
    throw error;
  }
}

export async function getWorkflows() {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Workflow[];
  } catch (error: any) {
    console.error('Error fetching workflows:', error);
    toast.error(error.message || 'Failed to fetch workflows');
    throw error;
  }
}

export async function getWorkflow(id: string) {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .eq('user_id', userData.user.id)
      .single();
    
    if (error) throw error;
    return data as Workflow;
  } catch (error: any) {
    console.error('Error fetching workflow:', error);
    toast.error(error.message || 'Failed to fetch workflow');
    throw error;
  }
}

export async function updateWorkflow(id: string, updates: Partial<CreateWorkflowParams>) {
  try {
    const { data, error } = await supabase
      .from('workflows')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    // toast.success('Workflow updated successfully');
    return data;
  } catch (error: any) {
    console.error('Error updating workflow:', error);
    toast.error(error.message || 'Failed to update workflow');
    throw error;
  }
}

export async function deleteWorkflow(id: string) {
  try {
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    toast.success('Workflow deleted successfully');
    return true;
  } catch (error: any) {
    console.error('Error deleting workflow:', error);
    toast.error(error.message || 'Failed to delete workflow');
    throw error;
  }
} 