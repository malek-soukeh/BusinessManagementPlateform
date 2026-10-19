/** Response of GET /api/categories and GET /api/categories/{id}. */
export interface Category {
  id: number;
  name: string;
  description: string | null;
  parentId: number | null;
  parentName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Body of POST and PUT /api/categories. */
export interface CategoryPayload {
  name: string;
  description: string | null;
  parentId: number | null;
}

/** A category placed in the tree: depth 0 for a root category. */
export interface CategoryNode {
  category: Category;
  depth: number;
  /** Names from the root down to the category, e.g. "Informatique › Ordinateurs". */
  path: string;
  childCount: number;
}

/**
 * Orders the categories as a tree (each parent followed by its children, alphabetically).
 * A category whose parent is missing from the list is treated as a root.
 */
export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const ids = new Set(categories.map(category => category.id));
  const children = new Map<number | null, Category[]>();
  for (const category of categories) {
    const parentId = category.parentId !== null && ids.has(category.parentId) ? category.parentId : null;
    children.set(parentId, [...(children.get(parentId) ?? []), category]);
  }

  const nodes: CategoryNode[] = [];
  const visited = new Set<number>();
  const visit = (parentId: number | null, depth: number, parentPath: string) => {
    const level = [...(children.get(parentId) ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    for (const category of level) {
      if (visited.has(category.id)) {
        continue;
      }
      visited.add(category.id);
      const path = parentPath ? `${parentPath} › ${category.name}` : category.name;
      nodes.push({ category, depth, path, childCount: children.get(category.id)?.length ?? 0 });
      visit(category.id, depth + 1, path);
    }
  };
  visit(null, 0, '');
  return nodes;
}

/** The category and all its sub-categories: none of them can become its parent. */
export function descendantIds(categories: Category[], id: number): Set<number> {
  const result = new Set<number>([id]);
  let added = true;
  while (added) {
    added = false;
    for (const category of categories) {
      if (category.parentId !== null && result.has(category.parentId) && !result.has(category.id)) {
        result.add(category.id);
        added = true;
      }
    }
  }
  return result;
}
