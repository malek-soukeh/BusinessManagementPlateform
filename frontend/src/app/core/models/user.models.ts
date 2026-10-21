import { Role } from './auth.models';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export const ROLES: Role[] = ['ADMIN', 'MANAGER', 'EMPLOYEE'];

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: 'Accès complet, dont la gestion des utilisateurs',
  MANAGER: 'Catalogue, stock, commandes, factures et paiements',
  EMPLOYEE: 'Clients, consultation du catalogue et ses propres commandes'
};

/** Response of GET /api/users and GET /api/users/{id} (ADMIN only). */
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

/** Body of POST /api/users: the password is only given at creation. */
export interface UserCreatePayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string | null;
  role: Role;
}

/** Body of PUT /api/users/{id}: an administrator cannot change his own email nor his own role. */
export interface UserUpdatePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: Role;
}

/** Same bounds as the API (bcrypt only uses the first 72 bytes). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
