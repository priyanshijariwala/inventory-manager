import { AfterViewInit, Directive, ElementRef, Input } from '@angular/core';

@Directive({
  selector: '[appAutoFocus]',
  standalone: true,
})
export class AutoFocusDirective implements AfterViewInit {
  @Input() appAutoFocus: boolean | '' = true;

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    if (this.appAutoFocus === false) {
      return;
    }

    window.setTimeout(() => {
      const host = this.elementRef.nativeElement;
      const focusTarget = this.getFocusableElement(host);
      focusTarget?.focus();
    });
  }

  private getFocusableElement(host: HTMLElement): HTMLElement | null {
    if (this.isFocusable(host)) {
      return host;
    }

    return host.querySelector<HTMLElement>(
      'input, textarea, select, button, [tabindex]:not([tabindex="-1"])'
    );
  }

  private isFocusable(element: HTMLElement): boolean {
    return element.matches('input, textarea, select, button, [tabindex]:not([tabindex="-1"])');
  }
}
