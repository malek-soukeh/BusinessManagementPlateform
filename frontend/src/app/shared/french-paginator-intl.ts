import { MatPaginatorIntl } from '@angular/material/paginator';

/** French labels for every Material paginator of the application. */
export function frenchPaginatorIntl(): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();
  intl.itemsPerPageLabel = 'Éléments par page';
  intl.firstPageLabel = 'Première page';
  intl.previousPageLabel = 'Page précédente';
  intl.nextPageLabel = 'Page suivante';
  intl.lastPageLabel = 'Dernière page';
  intl.getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) {
      return `0 sur ${length}`;
    }
    const start = page * pageSize;
    const end = Math.min(start + pageSize, length);
    return `${start + 1} – ${end} sur ${length}`;
  };
  return intl;
}