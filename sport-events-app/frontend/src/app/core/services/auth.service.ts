import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { 
  User, 
  LoginCredentials, 
  UserRegistration, 
  AuthResponse,
  ChangePassword 
} from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Alkalmazás indításakor ellenőrizzük, van-e mentett felhasználó
    this.loadUserFromStorage();
  }

  /**
   * Felhasználó regisztrációja
   */
  register(data: UserRegistration): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register/`, data).pipe(
      tap(response => {
        this.handleAuthResponse(response);
      })
    );
  }

  /**
   * Bejelentkezés
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login/`, credentials).pipe(
      tap(response => {
        this.handleAuthResponse(response);
      })
    );
  }

  /**
   * Kijelentkezés
   */
  logout(): void {
    const refreshToken = this.getRefreshToken();
    
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/auth/logout/`, { refresh: refreshToken })
        .subscribe({
          next: () => this.clearAuthData(),
          error: () => this.clearAuthData()
        });
    } else {
      this.clearAuthData();
    }
  }

  /**
   * Token frissítés
   */
  refreshToken(refreshToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/token/refresh/`, {
      refresh: refreshToken
    });
  }

  /**
   * Jelszó változtatás
   */
  changePassword(data: ChangePassword): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/change-password/`, data);
  }

  /**
   * Aktuális felhasználó lekérése
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/me/`).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      })
    );
  }

  /**
   * Authentikáció ellenőrzése
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (!token) {
      return false;
    }
    
    // Token lejáratának ellenőrzése
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationDate = new Date(payload.exp * 1000);
      return expirationDate > new Date();
    } catch (error) {
      return false;
    }
  }

  /**
   * Access token lekérése
   */
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Refresh token lekérése
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Tokenek mentése
   */
  saveTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  /**
   * Aktuális felhasználó értéke
   */
  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Auth válasz kezelése
   */
  private handleAuthResponse(response: AuthResponse): void {
    // Tokenek mentése
    console.log('Saving tokens:', response.tokens);
    this.saveTokens(response.tokens.access, response.tokens.refresh);
    
    // Felhasználó mentése
    this.currentUserSubject.next(response.user);
    localStorage.setItem('currentUser', JSON.stringify(response.user));
  }

  /**
   * Felhasználó betöltése localStorage-ból
   */
  private loadUserFromStorage(): void {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Error parsing user from storage', error);
      }
    }
  }

  /**
   * Auth adatok törlése
   */
  private clearAuthData(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }
}
