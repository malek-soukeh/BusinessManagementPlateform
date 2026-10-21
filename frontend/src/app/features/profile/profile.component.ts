import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Role, UserProfile } from '../../core/models/auth.models';
import { ROLE_DESCRIPTIONS } from '../../core/models/user.models';
import { AuthService } from '../../core/services/auth.service';
import { extractErrorMessage } from '../../core/utils/http-error.util';
import { NavItem, ROLE_LABELS, visibleNavItems } from '../../layout/nav-items';

/**
 * Profile of the logged-in user, read-only: the API offers no endpoint to change one's own data
 * or password, an administrator does it from the users page.
 */
@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  profile: UserProfile | null = null;
  loading = true;
  errorMessage: string | null = null;
  /** The pages the role may open, as in the menu. */
  readonly pages: NavItem[] = visibleNavItems(this.auth.role).filter(item => item.route !== '/dashboard');
  readonly expiresAt = this.auth.expiresAt;

  get initials(): string {
    const profile = this.profile;
    return profile ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() : '';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = null;
    this.auth.me().subscribe({
      next: profile => {
        this.profile = profile;
        this.loading = false;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = extractErrorMessage(error, 'Impossible de charger votre profil.');
      }
    });
  }

  roleLabel(role: Role): string {
    return ROLE_LABELS[role];
  }

  roleDescription(role: Role): string {
    return ROLE_DESCRIPTIONS[role];
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
