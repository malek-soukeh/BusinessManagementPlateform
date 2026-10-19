import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { CustomerFormComponent } from './customer-form/customer-form.component';
import { CustomerListComponent } from './customer-list/customer-list.component';

const routes: Routes = [
  { path: '', component: CustomerListComponent },
  { path: 'new', component: CustomerFormComponent },
  { path: ':id/edit', component: CustomerFormComponent }
];

@NgModule({
  declarations: [CustomerListComponent, CustomerFormComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class CustomersModule {}