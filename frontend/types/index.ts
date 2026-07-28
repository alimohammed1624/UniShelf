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

export interface TagSuggestion {
  id: number;
  name: string;
  reason: string;
}

export interface TagSuggestionsResponse {
  suggestions: TagSuggestion[];
  // How the backend produced the list: llm / cache / popular / fallback / disabled
  source: string;
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

/** A user as returned by the /admin endpoints, with moderation metadata. */
export interface AdminUser extends User {
  banned_until: string | null;
  ban_reason: string | null;
  banned_at: string | null;
  banned_by_id: number | null;
  must_change_password: boolean;
}

/** Returned exactly once by POST /admin/users/{id}/reset-password. */
export interface TempPasswordResult {
  user_id: number;
  email: string;
  temp_password: string;
  must_change_password: boolean;
}

export interface UserPublicProfile {
  id: number;
  email: string;
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

// ── Report types ─────────────────────────────────────────────

export interface ResourceBrief {
  id: number;
  title: string;
  filename: string | null;
  uploader_id: number;
  is_archived: boolean;
}

export interface Report {
  id: number;
  reported_by: number;
  resource_id: number;
  reason: string;
  status: number; // 0=open, 1=resolved
  created_at: string;
  resolved_at: string | null;
  resource: ResourceBrief;
}

export interface ReportCreate {
  resource_id: number;
  reason: string;
}

// ── Error types ──────────────────────────────────────────────

export interface ApiError {
  detail: string;
}
