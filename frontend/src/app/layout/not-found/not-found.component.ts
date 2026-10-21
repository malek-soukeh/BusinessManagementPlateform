import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

/** Shown inside the shell for any unknown address, so that the menu stays at hand. */
@Component({
  selector: 'app-not-found',
  template: `
    <section class="not-found" aria-labelledby="not-found-title">
      <span class="code" aria-hidden="true">404</span>
      <h1 id="not-found-title">Page introuvable</h1>
      <p class="message">
        L'adresse <code>{{ url }}</code> ne correspond à aucune page.
        Elle a peut-être été déplacée, ou le lien est incorrect.
      </p>
      <div class="actions">
        <a mat-flat-button color="primary" routerLink="/dashboard">
          <mat-icon>dashboard</mat-icon>
          Tableau de bord
        </a>
        <button mat-stroked-button type="button" id="back-button" (click)="back()">
          <mat-icon>arrow_back</mat-icon>
          Page précédente
        </button>
      </div>
    </section>
  `,
  styles: [`
    .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 560px;
      margin: 48px auto;
      text-align: center;
    }
    .code {
      font-size: 96px;
      font-weight: 300;
      line-height: 1;
      color: var(--app-primary);
      opacity: 0.6;
    }
    h1 { margin: 16px 0 8px; font-size: 24px; font-weight: 500; }
    .message { margin: 0 0 24px; color: var(--app-muted); }
    code { overflow-wrap: anywhere; color: var(--app-text); }
    .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
  `]
})
export class NotFoundComponent {
  private readonly location = inject(Location);
  readonly url = inject(Router).url;

  back(): void {
    this.location.back();
  }
}
