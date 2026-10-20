import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';
import { SharedModule } from '../../shared/shared.module';
import { OrderDetailComponent } from './order-detail/order-detail.component';
import { OrderFormComponent } from './order-form/order-form.component';
import { OrderListComponent } from './order-list/order-list.component';

/** Every role creates and reads orders; only ADMIN and MANAGER modify them, as the API decides. */
export const orderRoutes: Routes = [
  { path: '', component: OrderListComponent },
  { path: 'new', component: OrderFormComponent },
  { path: ':id', component: OrderDetailComponent },
  { path: ':id/edit', component: OrderFormComponent, canActivate: [roleGuard(['ADMIN', 'MANAGER'])] }
];

@NgModule({
  declarations: [OrderListComponent, OrderDetailComponent, OrderFormComponent],
  imports: [SharedModule, RouterModule.forChild(orderRoutes)]
})
export class OrdersModule {}
