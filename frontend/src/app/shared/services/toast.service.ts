import { Injectable, inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastr = inject(ToastrService);

  success(message: string, title?: string) {
    this.toastr.success(message, title);
  }

  error(error: unknown, fallback = 'Something went wrong', title?: string) {
    this.toastr.error(this.getErrorMessage(error, fallback), title);
  }

  info(message: string, title?: string) {
    this.toastr.info(message, title);
  }

  warning(message: string, title?: string) {
    this.toastr.warning(message, title);
  }

  getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
    const source = this.unwrapError(error);
    const message = source?.message ?? source?.error ?? source;

    if (Array.isArray(message)) {
      return message.map(item => this.stringifyMessage(item)).filter(Boolean).join(', ') || fallback;
    }

    return this.stringifyMessage(message) || fallback;
  }

  private unwrapError(error: any) {
    return error?.error ?? error;
  }

  private stringifyMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message.trim();
    }

    if (message && typeof message === 'object') {
      const nested = (message as { message?: unknown }).message;
      if (nested) {
        return this.stringifyMessage(nested);
      }
    }

    return '';
  }
}
