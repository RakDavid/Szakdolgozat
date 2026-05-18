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

  /** 
   * Sikeres műveletet jelző értesítés megjelenítése. 
   */
  showSuccess(message: string) {
    this.toastSubject.next({ message, type: 'success' });
    this.autoClose();
  }

  /** 
   * Hibát jelző értesítés megjelenítése. 
   */
  showError(message: string) {
    this.toastSubject.next({ message, type: 'error' });
    this.autoClose();
  }

  /** 
   * Az aktuális értesítés azonnali eltüntetése. 
   */
  clear() {
    this.toastSubject.next(null);
  }

  /** 
   * Automatikus bezárás időzítője (4 másodperc után eltünteti az üzenetet). 
   */
  private autoClose() {
    setTimeout(() => {
      this.clear();
    }, 4000);
  }
}