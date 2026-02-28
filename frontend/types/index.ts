// ── Tag types ────────────────────────────────────────────────

export interface TagBrief {
  id: number;
  name: string;
}

export interface Tag {
  id: number;
  name: string;
  description: string;
  category: string;
}

// ── Resource types ───────────────────────────────────────────

export interface Resource {
  id: number;
  title: string;
  description: string;
  file_path: string | null;
  hierarchy: string;
  parent_id: number | null;
  filename: string | null;
  size: number | null;
  type: string;
  is_public: boolean;
  is_anonymous: boolean;
  uploader_id: number;
  owner_id: number;
  is_archived: boolean;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string | null;
  tags: TagBrief[];
}

// ── User types ───────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: number; // 0=student, 1=moderator, 2=admin, 3=superadmin
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface UserPublicProfile {
  id: number;
  full_name: string;
  role: number;
  created_at: string;
}

// ── Auth types ───────────────────────────────────────────────

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// ── Visibility types ─────────────────────────────────────────

export interface VisibilityEntry {
  id: number;
  resource_id: number;
  user_id: number;
  access_type: number; // 0=whitelist, 1=blacklist
}

// ── Error types ──────────────────────────────────────────────

export interface ApiError {
  detail: string;
}
