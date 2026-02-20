import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  related_event_id?: number;
  related_event_title?: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  getNotifications(): Observable<AppNotification[]> {
    return this.http.get<any>(`${this.apiUrl}/`).pipe(
      map(response => {
        if (response && Array.isArray(response.results)) {
          return response.results as AppNotification[];
        }
        if (Array.isArray(response)) {
          return response as AppNotification[];
        }
        return [];
      })
    );
  }

  getUnreadCount(): Observable<{ unread_count: number }> {
    return this.http.get<{ unread_count: number }>(`${this.apiUrl}/unread-count/`).pipe(
      tap(res => this.unreadCountSubject.next(res.unread_count))
    );
  }

  markAllRead(): Observable<any> {
    return this.http.post(`${this.apiUrl}/mark-all-read/`, {}).pipe(
      tap(() => this.unreadCountSubject.next(0))
    );
  }

  markRead(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/mark-read/`, {}).pipe(
      tap(() => {
        const current = this.unreadCountSubject.value;
        if (current > 0) this.unreadCountSubject.next(current - 1);
      })
    );
  }

  startPolling(): void {
    this.getUnreadCount().subscribe();
    interval(30000).pipe(
      switchMap(() => this.getUnreadCount())
    ).subscribe();
  }
}