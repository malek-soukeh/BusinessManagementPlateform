import { frenchPaginatorIntl } from './french-paginator-intl';

describe('frenchPaginatorIntl', () => {
  it('labels the controls in French', () => {
    const intl = frenchPaginatorIntl();

    expect(intl.itemsPerPageLabel).toBe('Éléments par page');
    expect(intl.firstPageLabel).toBe('Première page');
    expect(intl.previousPageLabel).toBe('Page précédente');
    expect(intl.nextPageLabel).toBe('Page suivante');
    expect(intl.lastPageLabel).toBe('Dernière page');
  });

  it('labels the range in French', () => {
    const intl = frenchPaginatorIntl();

    expect(intl.getRangeLabel(0, 10, 0)).toBe('0 sur 0');
    expect(intl.getRangeLabel(0, 10, 25)).toBe('1 – 10 sur 25');
    expect(intl.getRangeLabel(2, 10, 25)).toBe('21 – 25 sur 25');
  });
});
