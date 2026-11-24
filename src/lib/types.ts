// Types mirroring the TerraByte API schemas (backend/terrabyte/schemas).

export type Role = 'farmer' | 'vendor' | 'hardware_vendor' | 'expert' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type Language = 'en' | 'hi' | 'mr';

export const ROLES: Role[] = ['farmer', 'vendor', 'hardware_vendor', 'expert', 'admin'];
export const SELF_REGISTER_ROLES: Exclude<Role, 'admin'>[] = ['farmer', 'vendor', 'hardware_vendor', 'expert'];
export const USER_STATUSES: UserStatus[] = ['pending', 'approved', 'rejected', 'suspended'];

export interface User {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  role: Role;
  status: UserStatus;
  preferred_language: Language;
  organization: string | null;
  qualifications: string | null;
  state: string | null;
  district: string | null;
  village: string | null;
  lat: number | null;
  lon: number | null;
  created_at: string;
}

export interface AdminUser extends User {
  status_reason: string | null;
  status_changed_at: string | null;
}

export interface UserPage {
  items: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RegisterResponse {
  user: User;
  requires_approval: boolean;
  access_token: string | null;
  expires_in: number | null;
}

export interface RegisterPayload {
  name: string;
  phone: string;
  password: string;
  role: Exclude<Role, 'admin'>;
  email?: string;
  preferred_language?: Language;
  organization?: string;
  qualifications?: string;
  state?: string;
  district?: string;
  village?: string;
}

export type MeUpdate = Partial<
  Pick<User, 'name' | 'email' | 'preferred_language' | 'organization' | 'qualifications' | 'state' | 'district' | 'village' | 'lat' | 'lon'>
>;

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}
