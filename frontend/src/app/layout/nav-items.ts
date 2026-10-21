import { Role } from '../core/models/auth.models';

export type NavGroupLabel = 'Gestion' | 'Ventes' | 'Administration';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: Role[];
  /** Section of the menu; none for the dashboard, shown first. */
  group?: NavGroupLabel;
  /** The page does not exist yet: the item is shown greyed out. Remove the flag when the module is built. */
  comingSoon?: boolean;
}

const EVERYONE: Role[] = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
const MANAGEMENT: Role[] = ['ADMIN', 'MANAGER'];

/** The menu, following the role matrix of the specification. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', icon: 'space_dashboard', route: '/dashboard', roles: EVERYONE },
  { label: 'Clients', icon: 'people', route: '/customers', roles: EVERYONE, group: 'Gestion' },
  { label: 'Produits', icon: 'inventory_2', route: '/products', roles: EVERYONE, group: 'Gestion' },
  { label: 'Catégories', icon: 'category', route: '/categories', roles: MANAGEMENT, group: 'Gestion' },
  { label: 'Stock', icon: 'warehouse', route: '/inventory', roles: EVERYONE, group: 'Gestion' },
  { label: 'Commandes', icon: 'shopping_cart', route: '/orders', roles: EVERYONE, group: 'Ventes' },
  { label: 'Factures', icon: 'receipt_long', route: '/invoices', roles: EVERYONE, group: 'Ventes' },
  { label: 'Utilisateurs', icon: 'manage_accounts', route: '/users', roles: ['ADMIN'], group: 'Administration' }
];

export interface NavGroup {
  label: NavGroupLabel | null;
  items: NavItem[];
}

/** The menu entries a role is allowed to see. Nobody logged in sees nothing. */
export function visibleNavItems(role: Role | null): NavItem[] {
  return role === null ? [] : NAV_ITEMS.filter(item => item.roles.includes(role));
}

/** The visible entries grouped by section, in the menu order; a section without entry is left out. */
export function visibleNavGroups(role: Role | null): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const item of visibleNavItems(role)) {
    const label = item.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrateur',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employé'
};