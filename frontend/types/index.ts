export interface Resource {
  id: number;
  title: string;
  description: string;
  visibility: string;
  file_path: string;
  uploader_id: number;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface ApiError {
  detail: string;
}
