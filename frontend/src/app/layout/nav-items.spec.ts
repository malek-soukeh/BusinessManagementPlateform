import { NAV_ITEMS, visibleNavGroups, visibleNavItems } from './nav-items';

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

  it('groups the entries by section for the menu', () => {
    const groups = (role: Parameters<typeof visibleNavGroups>[0]) =>
      visibleNavGroups(role).map(group => `${group.label ?? '-'}: ${group.items.map(item => item.label).join(', ')}`);

    expect(groups('ADMIN')).toEqual([
      '-: Tableau de bord',
      'Gestion: Clients, Produits, Catégories, Stock',
      'Ventes: Commandes, Factures',
      'Administration: Utilisateurs'
    ]);
    expect(groups('EMPLOYEE')).toEqual([
      '-: Tableau de bord',
      'Gestion: Clients, Produits, Stock',
      'Ventes: Commandes, Factures'
    ]);
  });
});
