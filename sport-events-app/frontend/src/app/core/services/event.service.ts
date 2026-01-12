import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  SportEvent,
  CreateSportEvent,
  EventParticipant,
  JoinEvent,
  UpdateParticipantStatus,
  RateEvent,
  EventImage,
  PaginatedResponse,
  EventFilterParams
} from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl = `${environment.apiUrl}/events`;

  constructor(private http: HttpClient) {}

  /**
   * Események listázása szűrőkkel
   */
  getEvents(filters?: EventFilterParams): Observable<PaginatedResponse<SportEvent>> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.append(key, value.toString());
        }
      });
    }
    
    return this.http.get<PaginatedResponse<SportEvent>>(`${this.apiUrl}/`, { params });
  }

  /**
   * Esemény részletek lekérése
   */
  getEventById(id: number): Observable<SportEvent> {
    return this.http.get<SportEvent>(`${this.apiUrl}/${id}/`);
  }

  /**
   * Esemény létrehozása
   */
  createEvent(data: CreateSportEvent): Observable<SportEvent> {
    const payload = {
      ...data,
      latitude: Number(data.latitude.toFixed(6)),
      longitude: Number(data.longitude.toFixed(6)),
    };

    return this.http.post<SportEvent>(`${this.apiUrl}/`, payload);
  }

  /**
   * Esemény frissítése
   */
  updateEvent(id: number, data: Partial<CreateSportEvent>): Observable<SportEvent> {
    return this.http.patch<SportEvent>(`${this.apiUrl}/${id}/`, data);
  }

  /**
   * Esemény törlése (státusz változtatás)
   */
  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/`);
  }

  /**
   * Saját létrehozott események
   */
  getMyEvents(): Observable<PaginatedResponse<SportEvent>> {
    return this.http.get<PaginatedResponse<SportEvent>>(`${this.apiUrl}/my-events/`);
  }

  /**
   * Események, amikre jelentkeztem
   */
  getMyParticipations(): Observable<PaginatedResponse<SportEvent>> {
    return this.http.get<PaginatedResponse<SportEvent>>(`${this.apiUrl}/my-participations/`);
  }

  /**
   * Ajánlott események
   */
  getRecommendedEvents(): Observable<SportEvent[]> {
    return this.http.get<SportEvent[]>(`${this.apiUrl}/recommended/`);
  }

  /**
   * Csatlakozás eseményhez
   */
  joinEvent(eventId: number, data?: JoinEvent): Observable<any> {
    return this.http.post(`${this.apiUrl}/${eventId}/join/`, data || {});
  }

  /**
   * Kilépés eseményből
   */
  leaveEvent(eventId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${eventId}/leave/`, {});
  }

  /**
   * Esemény résztvevőinek lekérése
   */
  getEventParticipants(eventId: number): Observable<PaginatedResponse<EventParticipant>> {
    return this.http.get<PaginatedResponse<EventParticipant>>(`${this.apiUrl}/${eventId}/participants/`);
  }

  /**
   * Résztvevő státuszának kezelése (csak szervező)
   */
  manageParticipant(
    eventId: number, 
    participantId: number, 
    data: UpdateParticipantStatus
  ): Observable<EventParticipant> {
    return this.http.patch<EventParticipant>(
      `${this.apiUrl}/${eventId}/participants/${participantId}/`,
      data
    );
  }

  /**
   * Esemény értékelése
   */
  rateEvent(eventId: number, data: RateEvent): Observable<any> {
    return this.http.post(`${this.apiUrl}/${eventId}/rate/`, data);
  }

  /**
   * Kép feltöltése eseményhez
   */
  uploadEventImage(eventId: number, image: File, caption?: string, isPrimary?: boolean): Observable<EventImage> {
    const formData = new FormData();
    formData.append('image', image);
    if (caption) {
      formData.append('caption', caption);
    }
    if (isPrimary !== undefined) {
      formData.append('is_primary', isPrimary.toString());
    }
    
    return this.http.post<EventImage>(`${this.apiUrl}/${eventId}/images/`, formData);
  }

  /**
   * Események keresése távolság alapján
   */
  searchEventsByLocation(
    latitude: number,
    longitude: number,
    radius: number = 10,
    otherFilters?: Partial<EventFilterParams>
  ): Observable<PaginatedResponse<SportEvent>> {
    const filters: EventFilterParams = {
      user_lat: latitude,
      user_lng: longitude,
      radius: radius,
      ...otherFilters
    };
    
    return this.getEvents(filters);
  }

  /**
   * Események szűrése sportág szerint
   */
  getEventsBySportType(sportTypeId: number): Observable<PaginatedResponse<SportEvent>> {
    return this.getEvents({ sport_type: sportTypeId });
  }

  /**
   * Események szűrése időpont szerint
   */
  getEventsByDateRange(startDate: string, endDate: string): Observable<PaginatedResponse<SportEvent>> {
    return this.getEvents({
      start_date_from: startDate,
      start_date_to: endDate
    });
  }
}
