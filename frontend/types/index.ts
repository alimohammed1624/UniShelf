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
  /**
   * Null when the resource was uploaded anonymously and the viewer is below
   * moderator — the API withholds the id rather than trusting the UI to hide it.
   */
  uploader_id: number | null;
  /**
   * Null on an anonymous resource for anyone who is neither its owner nor a
   * moderator+ — the owner starts out as the uploader, so publishing it would
   * undo the redaction above.
   */
  owner_id: number | null;
  is_archived: boolean;
  archived_at: string | null;
  archived_by_id: number | null;
  archive_reason: string | null;
  archive_kind: ArchiveKind | null;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string | null;
  tags: TagBrief[];
}

/**
 * Why a resource was archived. SELF archives are the owner's own housekeeping
 * and the owner may restore them; MODERATION archives are takedowns that only
 * a moderator+ may lift.
 */
export const ArchiveKind = {
  SELF: 0,
  MODERATION: 1,
} as const;

export type ArchiveKind = (typeof ArchiveKind)[keyof typeof ArchiveKind];

// ── User types ───────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: number; // 0=member, 1=moderator, 2=admin, 3=superadmin
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
