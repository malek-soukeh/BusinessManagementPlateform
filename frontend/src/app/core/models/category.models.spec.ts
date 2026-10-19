import { Category, buildCategoryTree, descendantIds } from './category.models';

describe('category tree', () => {
  const category = (id: number, name: string, parentId: number | null = null): Category => ({
    id, name, description: null, parentId, parentName: null,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
  });
  const categories = [
    category(1, 'Informatique'),
    category(2, 'Ordinateurs', 1),
    category(3, 'Accessoires', 1),
    category(4, 'Portables', 2),
    category(5, 'Bureautique'),
    category(6, 'Orpheline', 99)
  ];

  it('puts each parent before its children, alphabetically', () => {
    const tree = buildCategoryTree(categories);

    expect(tree.map(node => node.category.name)).toEqual(
      ['Bureautique', 'Informatique', 'Accessoires', 'Ordinateurs', 'Portables', 'Orpheline']);
    expect(tree.map(node => node.depth)).toEqual([0, 0, 1, 1, 2, 0]);
  });

  it('gives the path and the number of direct children', () => {
    const portables = buildCategoryTree(categories).find(node => node.category.id === 4);
    const informatique = buildCategoryTree(categories).find(node => node.category.id === 1);

    expect(portables?.path).toBe('Informatique › Ordinateurs › Portables');
    expect(informatique?.childCount).toBe(2);
  });

  it('finds a category and all its sub-categories', () => {
    expect([...descendantIds(categories, 1)].sort()).toEqual([1, 2, 3, 4]);
    expect([...descendantIds(categories, 5)]).toEqual([5]);
  });
});
