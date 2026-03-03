import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new BehaviorSubject<ToastMessage | null>(null);
  toastState$ = this.toastSubject.asObservable();

  showSuccess(message: string) {
    this.toastSubject.next({ message, type: 'success' });
    this.autoClose();
  }

  showError(message: string) {
    this.toastSubject.next({ message, type: 'error' });
    this.autoClose();
  }

  clear() {
    this.toastSubject.next(null);
  }

  private autoClose() {
    setTimeout(() => {
      this.clear();
    }, 4000);
  }
}