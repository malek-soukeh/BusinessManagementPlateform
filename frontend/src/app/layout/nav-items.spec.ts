import { NAV_ITEMS, visibleNavItems } from './nav-items';

describe('visibleNavItems', () => {
  const labels = (role: Parameters<typeof visibleNavItems>[0]) => visibleNavItems(role).map(item => item.label);

  it('gives an administrator the whole menu', () => {
    expect(visibleNavItems('ADMIN').length).toBe(NAV_ITEMS.length);
    expect(labels('ADMIN')).toContain('Utilisateurs');
  });

  it('hides the users from a manager but keeps the categories', () => {
    expect(labels('MANAGER')).toContain('Catégories');
    expect(labels('MANAGER')).not.toContain('Utilisateurs');
  });

  it('keeps an employee away from the categories and the users', () => {
    expect(labels('EMPLOYEE')).toEqual(
      ['Tableau de bord', 'Clients', 'Produits', 'Stock', 'Commandes', 'Factures']);
  });

  it('shows nothing when nobody is logged in', () => {
    expect(visibleNavItems(null)).toEqual([]);
  });
});