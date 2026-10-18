import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadChildren: () => import('./layout/layout.module').then(m => m.LayoutModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }