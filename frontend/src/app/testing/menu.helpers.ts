import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';

/**
 * Opens the actions menu of a table row and returns the menu panel. Material renders menus in an
 * overlay, outside the component: their items cannot be found in the fixture itself.
 */
export function openRowMenu<T>(fixture: ComponentFixture<T>, rowIndex = 0): HTMLElement {
  const buttons = fixture.nativeElement.querySelectorAll('.row-menu-button') as NodeListOf<HTMLButtonElement>;
  const button = buttons[rowIndex];
  if (!button) {
    throw new Error(`No actions menu on row ${rowIndex}`);
  }
  button.click();
  fixture.detectChanges();
  const panels = TestBed.inject(OverlayContainer).getContainerElement().querySelectorAll('.mat-mdc-menu-panel');
  return panels[panels.length - 1] as HTMLElement;
}

/** Clicks an item of a row menu, found by its CSS class. */
export function clickRowMenuItem<T>(fixture: ComponentFixture<T>, rowIndex: number, itemClass: string): void {
  const item = openRowMenu(fixture, rowIndex).querySelector(`.${itemClass}`) as HTMLElement | null;
  if (!item) {
    throw new Error(`No menu item .${itemClass} on row ${rowIndex}`);
  }
  item.click();
  fixture.detectChanges();
}
