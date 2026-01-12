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
    return this.http.get<UserSportPreference[]>(`${this.apiUrl}/users/sport-preferences/`);
  }

  /**
   * Sportág preferencia létrehozása
   */
  createSportPreference(data: CreateUserSportPreference): Observable<UserSportPreference> {
    return this.http.post<UserSportPreference>(`${this.apiUrl}/users/sport-preferences/`, data);
  }

  /**
   * Sportág preferencia frissítése
   */
  updateSportPreference(id: number, data: Partial<CreateUserSportPreference>): Observable<UserSportPreference> {
    return this.http.patch<UserSportPreference>(`${this.apiUrl}/users/sport-preferences/${id}/`, data);
  }

  /**
   * Sportág preferencia törlése
   */
  deleteSportPreference(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/sport-preferences/${id}/`);
  }
}
