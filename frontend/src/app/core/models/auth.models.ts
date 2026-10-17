export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface LoginRequest {
  email: string;
  password: string;
}

/** Response of POST /api/auth/login (expiresIn is in seconds). */
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  email: string;
  role: Role;
}

/** Response of GET /api/auth/me. */
export interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: Role;
  status: string;
}

/** What the browser keeps between page reloads. */
export interface AuthSession {
  accessToken: string;
  email: string;
  role: Role;
  /** Expiration instant, in milliseconds since the epoch. */
  expiresAt: number;
}
