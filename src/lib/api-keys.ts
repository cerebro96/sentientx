import { supabase } from './supabase';
import { ApiKey, ApiKeyWithDecrypted } from '@/types/api-keys';
import { encryptApiKey, decryptApiKey } from './encryption';
import { toast } from 'sonner';

export async function createApiKey(name: string, service: string, key: string): Promise<ApiKey | null> {
  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    // Encrypt the API key
    const userId = userData.user.id;
    const encryptedKey = encryptApiKey(key, userId);
    
    // Insert into database
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        name,
        service,
        encrypted_key: encryptedKey
      })
      .select('id, name, service, is_active, created_at, updated_at')
      .single();
    
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error creating API key:', error);
    throw error;
  }
}

export async function getApiKeys(): Promise<ApiKey[]> {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, service, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Error fetching API keys:', error);
    throw error;
  }
}

export async function getApiKeyWithValue(id: string): Promise<ApiKeyWithDecrypted | null> {
  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    // Get the encrypted key
    const { data, error } = await supabase
      .from('api_keys')
      .select('*, encrypted_key')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) return null;
    
    // Decrypt the key
    const decryptedKey = decryptApiKey(data.encrypted_key, userData.user.id);
    
    return {
      id: data.id,
      name: data.name,
      service: data.service,
      is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at,
      decrypted_key: decryptedKey
    };
  } catch (error: any) {
    console.error('Error fetching API key with value:', error);
    throw error;
  }
}

export async function deleteApiKey(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  } catch (error: any) {
    console.error('Error deleting API key:', error);
    throw error;
  }
} 