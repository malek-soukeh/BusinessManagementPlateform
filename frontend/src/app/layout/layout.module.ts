import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { roleGuard } from '../core/guards/role.guard';
import { SharedModule } from '../shared/shared.module';
import { ShellComponent } from './shell/shell.component';

/** Every page of a logged-in user lives under the shell. New feature modules are added as children. */
export const layoutRoutes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadChildren: () => import('../features/dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'customers',
        loadChildren: () => import('../features/customers/customers.module').then(m => m.CustomersModule)
      },
      {
        path: 'products',
        loadChildren: () => import('../features/products/products.module').then(m => m.ProductsModule)
      },
      {
        path: 'categories',
        canActivate: [roleGuard(['ADMIN', 'MANAGER'])],
        loadChildren: () => import('../features/categories/categories.module').then(m => m.CategoriesModule)
      },
      { path: '**', redirectTo: 'dashboard' }
    ]
  }
];

@NgModule({
  declarations: [ShellComponent],
  imports: [SharedModule, RouterModule.forChild(layoutRoutes)]
})
export class LayoutModule {}