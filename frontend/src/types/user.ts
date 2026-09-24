export type Role = 'student' | 'faculty' | 'admin';

export interface UserProfile {
  phone?: string;
  avatarUrl?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  profile?: UserProfile;
  createdAt?: string;
}
