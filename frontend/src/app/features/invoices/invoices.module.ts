import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';
import { SharedModule } from '../../shared/shared.module';
import { InvoiceDetailComponent } from './invoice-detail/invoice-detail.component';
import { InvoiceFormComponent } from './invoice-form/invoice-form.component';
import { InvoiceListComponent } from './invoice-list/invoice-list.component';

/** Every role reads the invoices; only ADMIN and MANAGER create them, as the API decides. */
export const invoiceRoutes: Routes = [
  { path: '', component: InvoiceListComponent },
  { path: 'new', component: InvoiceFormComponent, canActivate: [roleGuard(['ADMIN', 'MANAGER'])] },
  { path: ':id', component: InvoiceDetailComponent }
];

@NgModule({
  declarations: [InvoiceListComponent, InvoiceDetailComponent, InvoiceFormComponent],
  imports: [SharedModule, RouterModule.forChild(invoiceRoutes)]
})
export class InvoicesModule {}
