import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, Input, ViewChild, forwardRef, inject
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Compact search field (36 px, max 320 px wide) used by every list toolbar:
 * magnifier on the left, clear button once there is text, "/" anywhere on the page focuses it,
 * Escape clears it. Works with `[formControl]` / `formControlName` like a native input.
 */
@Component({
  selector: 'app-search-field',
  templateUrl: './search-field.component.html',
  styleUrls: ['./search-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SearchFieldComponent), multi: true }]
})
export class SearchFieldComponent implements ControlValueAccessor {
  @Input() placeholder = 'Rechercher';
  /** Accessible name; the placeholder is used when it is not given. */
  @Input() label: string | null = null;
  /** Focus the field with the "/" key. */
  @Input() shortcut = true;

  @ViewChild('input', { static: true }) private readonly input!: ElementRef<HTMLInputElement>;

  private readonly changeDetector = inject(ChangeDetectorRef);
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  value = '';
  disabled = false;
  focused = false;

  writeValue(value: string | null): void {
    this.value = value ?? '';
    this.changeDetector.markForCheck();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
    this.changeDetector.markForCheck();
  }

  onInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.onChange(this.value);
  }

  onBlur(): void {
    this.focused = false;
    this.onTouched();
  }

  clear(): void {
    if (this.value === '') {
      return;
    }
    this.value = '';
    this.onChange('');
    this.input.nativeElement.focus();
  }

  focus(): void {
    this.input.nativeElement.focus();
  }

  /** "/" focuses the field, unless the user is already typing somewhere. */
  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.shortcut || this.disabled || event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const target = event.target as HTMLElement | null;
    const typing = !!target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
    if (!typing) {
      event.preventDefault();
      this.focus();
    }
  }
}
