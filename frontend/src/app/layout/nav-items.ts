import { Role } from '../core/models/auth.models';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: Role[];
  /** The page does not exist yet: the item is shown greyed out. Remove the flag when the module is built. */
  comingSoon?: boolean;
}

const EVERYONE: Role[] = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
const MANAGEMENT: Role[] = ['ADMIN', 'MANAGER'];

/** The menu, following the role matrix of the specification. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', icon: 'dashboard', route: '/dashboard', roles: EVERYONE },
  { label: 'Clients', icon: 'people', route: '/customers', roles: EVERYONE },
  { label: 'Produits', icon: 'devices', route: '/products', roles: EVERYONE },
  { label: 'Catégories', icon: 'category', route: '/categories', roles: MANAGEMENT },
  { label: 'Stock', icon: 'storage', route: '/inventory', roles: EVERYONE },
  { label: 'Commandes', icon: 'shopping_cart', route: '/orders', roles: EVERYONE },
  { label: 'Factures', icon: 'receipt_long', route: '/invoices', roles: EVERYONE },
  { label: 'Utilisateurs', icon: 'manage_accounts', route: '/users', roles: ['ADMIN'], comingSoon: true }
];

/** The menu entries a role is allowed to see. Nobody logged in sees nothing. */
export function visibleNavItems(role: Role | null): NavItem[] {
  return role === null ? [] : NAV_ITEMS.filter(item => item.roles.includes(role));
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrateur',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employé'
};