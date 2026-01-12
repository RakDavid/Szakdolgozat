import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SportType } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class SportTypeService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Összes sportág lekérése
   */
  getAllSportTypes(): Observable<SportType[]> {
    return this.http.get<SportType[]>(`${this.apiUrl}/sport-types/`);
  }

  /**
   * Sportág lekérése ID alapján
   */
  getSportTypeById(id: number): Observable<SportType> {
    return this.http.get<SportType>(`${this.apiUrl}/sport-types/${id}/`);
  }
}
