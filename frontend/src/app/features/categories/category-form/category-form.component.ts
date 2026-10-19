import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';

import { Category, CategoryNode, buildCategoryTree, descendantIds } from '../../../core/models/category.models';
import { CategoryService } from '../../../core/services/category.service';
import { apiMessage, extractErrorMessage } from '../../../core/utils/http-error.util';

@Component({
  selector: 'app-category-form',
  templateUrl: './category-form.component.html',
  styleUrls: ['./category-form.component.scss']
})
export class CategoryFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly categories = inject(CategoryService);
  private readonly snackBar = inject(MatSnackBar);

  categoryId: number | null = null;
  loading = true;
  saving = false;
  loadError: string | null = null;
  errorMessage: string | null = null;
  /** The categories that may become the parent: the edited one and its sub-categories are left out. */
  parentOptions: CategoryNode[] = [];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(255)]],
    parentId: [null as number | null]
  });

  get isEdit(): boolean {
    return this.categoryId !== null;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id !== null) {
      const parsed = Number(id);
      if (!Number.isInteger(parsed)) {
        this.loading = false;
        this.loadError = 'Catégorie introuvable.';
        return;
      }
      this.categoryId = parsed;
    }
    this.load();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = null;
    const value = this.form.getRawValue();
    const description = value.description.trim();
    const payload = { name: value.name.trim(), description: description === '' ? null : description, parentId: value.parentId };

    const request$ = this.categoryId === null
      ? this.categories.create(payload)
      : this.categories.update(this.categoryId, payload);

    request$.subscribe({
      next: () => {
        this.snackBar.open(this.isEdit ? 'Catégorie mise à jour.' : 'Catégorie créée.', 'OK', { duration: 4000 });
        this.router.navigate(['/categories']);
      },
      error: (error: unknown) => {
        this.saving = false;
        this.showError(error);
      }
    });
  }

  private load(): void {
    const category$ = this.categoryId === null ? of(null) : this.categories.get(this.categoryId);

    forkJoin({ all: this.categories.list(), category: category$ }).subscribe({
      next: ({ all, category }) => {
        this.parentOptions = this.buildParentOptions(all, category);
        if (category) {
          this.form.patchValue({
            name: category.name,
            description: category.description ?? '',
            parentId: category.parentId
          });
        } else {
          this.form.patchValue({ parentId: this.requestedParent(all) });
        }
        this.loading = false;
      },
      error: (error: unknown) => {
        this.loading = false;
        this.loadError = error instanceof HttpErrorResponse && error.status === 404
          ? 'Catégorie introuvable.'
          : extractErrorMessage(error, 'Impossible de charger la catégorie.');
      }
    });
  }

  private buildParentOptions(all: Category[], edited: Category | null): CategoryNode[] {
    const excluded = edited ? descendantIds(all, edited.id) : new Set<number>();
    return buildCategoryTree(all).filter(node => !excluded.has(node.category.id));
  }

  /** "Add a sub-category" from the list opens the form with ?parent=<id>. */
  private requestedParent(all: Category[]): number | null {
    const parent = Number(this.route.snapshot.queryParamMap.get('parent'));
    return all.some(category => category.id === parent) ? parent : null;
  }

  /** A duplicate name or an invalid parent is shown under its field, any other error above the buttons. */
  private showError(error: unknown): void {
    const message = apiMessage(error);
    if (message.startsWith('Category name already in use')) {
      this.setFieldError('name', 'taken');
      return;
    }
    if (message.startsWith('A category cannot be its own parent')) {
      this.setFieldError('parentId', 'cycle');
      return;
    }
    if (message.startsWith('Parent category not found')) {
      this.setFieldError('parentId', 'missing');
      return;
    }
    this.errorMessage = extractErrorMessage(error, 'Enregistrement impossible. Réessayez plus tard.');
  }

  private setFieldError(field: 'name' | 'parentId', key: string): void {
    this.form.controls[field].setErrors({ [key]: true });
    this.form.controls[field].markAsTouched();
  }
}
