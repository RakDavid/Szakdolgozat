import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  User, 
  UserUpdate,
  UserSportPreference,
  CreateUserSportPreference
} from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Felhasználó profiljának lekérése
   */
  getUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/profile/`);
  }

  /**
   * Felhasználó profiljának frissítése
   */
  updateUserProfile(data: UserUpdate): Observable<User> {
    // Ha van profilkép, FormData-t használunk
    if (data.profile_picture) {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });
      return this.http.patch<User>(`${this.apiUrl}/users/profile/`, formData);
    }
    
    return this.http.patch<User>(`${this.apiUrl}/users/profile/`, data);
  }

  /**
   * Felhasználó adatainak lekérése ID alapján
   */
  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}/`);
  }

  /**
   * Sportág preferenciák lekérése
   */
  getSportPreferences(): Observable<UserSportPreference[]> {
    return this.http.get<UserSportPreference[]>(`${this.apiUrl}/sport-preferences/`);
  }

  /**
   * Sportág preferencia létrehozása
   */
  createSportPreference(data: CreateUserSportPreference): Observable<UserSportPreference> {
    return this.http.post<UserSportPreference>(`${this.apiUrl}/sport-preferences/`, data);
  }

  /**
   * Sportág preferencia frissítése
   */
  updateSportPreference(id: number, data: Partial<CreateUserSportPreference>): Observable<UserSportPreference> {
    return this.http.patch<UserSportPreference>(`${this.apiUrl}/sport-preferences/${id}/`, data);
  }

  /**
   * Sportág preferencia törlése
   */
  deleteSportPreference(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/sport-preferences/${id}/`);
  }

  getUserPreferencesById(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}/preferences/`); 
  }

  changePassword(passwordData: any): Observable<any> {
    return this.http.post('/api/users/change-password/', passwordData);
  }
}
