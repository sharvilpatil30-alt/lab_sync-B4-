import { Role, User } from './user';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
  department?: string;
}

export interface AuthResponseData {
  token: string;
  user: User;
}
