import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';
import { SharedModule } from '../../shared/shared.module';
import { ProductFormComponent } from './product-form/product-form.component';
import { ProductListComponent } from './product-list/product-list.component';

/** Every role reads the products; only ADMIN and MANAGER create or edit them, as the API decides. */
export const productRoutes: Routes = [
  { path: '', component: ProductListComponent },
  { path: 'new', component: ProductFormComponent, canActivate: [roleGuard(['ADMIN', 'MANAGER'])] },
  { path: ':id/edit', component: ProductFormComponent, canActivate: [roleGuard(['ADMIN', 'MANAGER'])] }
];

@NgModule({
  declarations: [ProductListComponent, ProductFormComponent],
  imports: [SharedModule, RouterModule.forChild(productRoutes)]
})
export class ProductsModule {}
