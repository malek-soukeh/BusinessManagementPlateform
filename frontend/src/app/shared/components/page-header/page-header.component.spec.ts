import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { SharedModule } from '../../shared.module';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { Breadcrumb } from './page-header.component';

@Component({
  template: `
    <app-page-header title="Commandes" subtitle="Toutes les commandes" [breadcrumbs]="crumbs">
      <button id="action">Nouvelle commande</button>
    </app-page-header>
    <app-empty-state icon="inbox" title="Rien ici" description="Ajoutez un élément.">
      <button id="empty-action">Ajouter</button>
    </app-empty-state>
  `
})
class HostComponent {
  crumbs: Breadcrumb[] = [{ label: 'Ventes', link: '/orders' }, { label: 'Commandes' }];
}

describe('PageHeaderComponent and EmptyStateComponent', () => {
  function create() {
    TestBed.configureTestingModule({ declarations: [HostComponent], imports: [SharedModule, RouterTestingModule] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the title, the subtitle and the projected actions', () => {
    const element = create();

    expect(element.querySelector('h1')?.textContent).toContain('Commandes');
    expect(element.querySelector('.page-subtitle')?.textContent).toContain('Toutes les commandes');
    expect(element.querySelector('.page-actions #action')).not.toBeNull();
  });

  it('links the breadcrumb except for the current page', () => {
    const element = create();

    const links = element.querySelectorAll('.crumbs a');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe('/orders');
    expect(element.querySelector('.crumbs [aria-current="page"]')?.textContent).toContain('Commandes');
  });

  it('shows an empty state with its icon, texts and action', () => {
    const element = create();
    const empty = element.querySelector('app-empty-state') as HTMLElement;

    expect(empty.querySelector('.empty-title')?.textContent).toContain('Rien ici');
    expect(empty.querySelector('.empty-text')?.textContent).toContain('Ajoutez un élément.');
    expect(empty.querySelector('#empty-action')).not.toBeNull();
    expect(EmptyStateComponent).toBeDefined();
  });
});
