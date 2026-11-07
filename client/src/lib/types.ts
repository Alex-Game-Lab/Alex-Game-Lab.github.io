export interface Page<T> {
  items: T[];
  total?: number;
  limit?: number;
  offset?: number;
}
export interface Project {
  slug: string;
  title: string;
  summary: string;
  description: string;
  kind: string;
  status: string;
  cover: string;
  published: boolean;
  revision: number;
  owner_protected?: boolean;
  updated_at?: string;
}
export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  format: "plain" | "markdown";
  project_slug: string | null;
  cover: string;
  status: "draft" | "published" | "archived";
  author: string;
  author_id?: string;
  owner_protected?: boolean;
  revision: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}
export interface Profile {
  id: string;
  display_name: string;
  locale: string;
  bio: string;
  avatar_key: string;
  created_at: string;
  updated_at: string;
}
export interface Access {
  account_id: string;
  owner: boolean;
  roles: {
    slug: string;
    title: string;
    color?: string;
    description?: string;
  }[];
  permissions: string[];
  projects: { slug: string; kind: string; permissions: string[] }[];
  restrictions: {
    project_slug: string | null;
    reason: string;
    expires_at?: string;
  }[];
}
export interface Role {
  slug: string;
  title: string;
  description: string;
  color: string;
  permissions: string[];
  system: boolean;
  revision: number;
  assigned_count?: number;
  editable?: boolean;
  deletable?: boolean;
}
export interface Permission {
  id: string;
  title: string;
  group: string;
  delegable_by_admin: boolean;
  owner_only: boolean;
}
export interface UserSummary {
  id: string;
  display_name: string;
  locale: string;
  created_at: string;
  roles?: string[];
  overrides?: Override[];
  bans?: Ban[];
}
export interface Override {
  id: string;
  permission: string;
  effect: "allow" | "deny";
  project_slug: string | null;
  expires_at: string | null;
  reason: string;
}
export interface Ban {
  id: string;
  project_slug: string | null;
  reason: string;
  expires_at: string | null;
  revoked_at: string | null;
}
export interface Report {
  id: string;
  project_slug: string;
  author_id: string;
  title: string;
  build: string;
  severity: string;
  steps: string;
  expected: string;
  actual: string;
  environment: string;
  status: string;
  revision: number;
  created_at: string;
}
export interface Phone {
  enabled: boolean;
  linked: boolean;
  masked_phone: string | null;
}
export interface Game {
  slug: string;
  title: string;
  status: string;
}
export interface Stats {
  account_id: string;
  game_slug: string;
  balance: number;
  metrics: Record<string, number>;
  revision: number;
}
