import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { Role } from '../../../core/models/auth.models';
import { InvoiceSummary } from '../../../core/models/invoice.models';
import { Page } from '../../../core/models/page.models';
import { AuthService } from '../../../core/services/auth.service';
import { InvoiceService } from '../../../core/services/invoice.service';
import { SharedModule } from '../../../shared/shared.module';
import { InvoiceListComponent } from './invoice-list.component';

registerLocaleData(localeFr);

describe('InvoiceListComponent', () => {
  const isoDaysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  const invoice = (id: number, changes: Partial<InvoiceSummary> = {}): InvoiceSummary => ({
    id, invoiceNumber: `INV-2026-0000${id}`, orderId: id, orderNumber: `ORD-2026-0000${id}`, customerId: 3,
    customerName: 'Sami Trabelsi', issueDate: '2026-10-01', dueDate: '2026-10-31', totalAmount: 1488.095,
    paidAmount: 0, remainingAmount: 0, status: 'ISSUED', paymentStatus: 'UNPAID', ...changes
  });
  const page = (invoices: InvoiceSummary[]): Page<InvoiceSummary> => ({
    content: invoices, page: 0, size: 10, totalElements: invoices.length, totalPages: 1
  });

  let service: jasmine.SpyObj<InvoiceService>;

  function create(role: Role = 'MANAGER', queryParams: Record<string, string> = {}): ComponentFixture<InvoiceListComponent> {
    TestBed.configureTestingModule({
      declarations: [InvoiceListComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: InvoiceService, useValue: service },
        { provide: AuthService, useValue: { hasAnyRole: (roles: Role[]) => roles.includes(role) } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
        { provide: LOCALE_ID, useValue: 'fr' }
      ]
    });
    const fixture = TestBed.createComponent(InvoiceListComponent);
    fixture.detectChanges();
    return fixture;
  }

  const cells = (fixture: ComponentFixture<InvoiceListComponent>, column: string) =>
    Array.from<Element>(fixture.nativeElement.querySelectorAll(`td.mat-column-${column}`))
      .map(cell => (cell.textContent ?? '').replace(/\s+/g, ' ').trim());

  beforeEach(() => {
    service = jasmine.createSpyObj<InvoiceService>('InvoiceService', ['list', 'get', 'create', 'cancel', 'findByOrder']);
    service.list.and.returnValue(of(page([
      invoice(1), invoice(2, { status: 'OVERDUE', dueDate: isoDaysAgo(5), paymentStatus: 'PARTIALLY_PAID' })
    ])));
  });

  it('loads every invoice on start, with French statuses and amounts', () => {
    const fixture = create();

    expect(service.list).toHaveBeenCalledWith({ q: '', status: '', paymentStatus: '', page: 0, size: 10 });
    expect(cells(fixture, 'number')).toEqual(['INV-2026-00001', 'INV-2026-00002']);
    expect(cells(fixture, 'status')).toEqual(['Émise', 'En retard']);
    expect(cells(fixture, 'payment')).toEqual(['Non payée', 'Partiellement payée']);
    expect(cells(fixture, 'amount')[0]).toMatch(/^1\D488,095 TND$/);
  });

  it('shows the delay of an overdue invoice', () => {
    const fixture = create();

    expect(cells(fixture, 'dueDate')[1]).toContain('5 j de retard');
    expect(cells(fixture, 'dueDate')[0]).not.toContain('retard');
  });

  it('opens on the overdue invoices when asked by the dashboard', () => {
    create('MANAGER', { status: 'OVERDUE', paymentStatus: 'WRONG' });

    expect(service.list.calls.first().args[0]).toEqual(jasmine.objectContaining({ status: 'OVERDUE', paymentStatus: '' }));
  });

  it('searches after a pause in typing and filters by status and payment', fakeAsync(() => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.search.setValue('INV-2026');
    tick(300);
    component.onStatusChange('PAID');
    component.onPaymentStatusChange('PAID');

    expect(service.list.calls.mostRecent().args[0]).toEqual(
      { q: 'INV-2026', status: 'PAID', paymentStatus: 'PAID', page: 0, size: 10 });
    flush();
  }));

  it('offers the creation to a manager only', () => {
    expect(create('MANAGER').nativeElement.textContent).toContain('Nouvelle facture');

    TestBed.resetTestingModule();
    expect(create('EMPLOYEE').nativeElement.textContent).not.toContain('Nouvelle facture');
  });

  it('shows the error and reloads on demand', () => {
    service.list.and.returnValues(throwError(() => new HttpErrorResponse({ status: 0 })), of(page([invoice(1)])));
    const fixture = create();

    expect(fixture.nativeElement.querySelector('.error-panel').textContent).toContain('Serveur injoignable');

    (fixture.nativeElement.querySelector('.error-panel button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(cells(fixture, 'number')).toEqual(['INV-2026-00001']);
  });

  it('says when no invoice matches', () => {
    service.list.and.returnValue(of(page([])));
    const fixture = create();

    expect(fixture.nativeElement.querySelector('app-empty-state').textContent).toContain('Aucune facture trouvée.');
  });
});
