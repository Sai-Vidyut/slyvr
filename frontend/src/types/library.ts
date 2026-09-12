export type LibraryType = "personal" | "workspace" | "legacy";

export interface UploaderInfo {
  id: string;
  display_name?: string | null;
  email?: string | null;
}

export interface SlyvrUser {
  id: string;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface LibrarySummary {
  id: number;
  type: LibraryType;
  name: string;
  workspace_id?: number | null;
  role: string;
}

export interface MeResponse {
  user: SlyvrUser;
  libraries: LibrarySummary[];
  active_library: LibrarySummary;
}

export interface CreateWorkspaceResponse {
  id: number;
  name: string;
  slug: string;
  library_id: number;
  role: string;
  join_code: string;
  join_code_prefix?: string | null;
  join_code_active: boolean;
}

export interface WorkspaceResponse {
  id: number;
  name: string;
  slug: string;
  library_id: number;
  role: string;
  join_code_prefix?: string | null;
  join_code_active: boolean;
}

export interface JoinCodeResponse {
  join_code?: string | null;
  join_code_prefix?: string | null;
  join_code_active: boolean;
}
