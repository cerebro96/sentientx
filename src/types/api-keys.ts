export interface ApiKey {
  id: string;
  name: string;
  service: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyWithDecrypted extends ApiKey {
  decrypted_key: string;
}

export interface ApiKeyFormData {
  name: string;
  service: string;
  key: string;
} 