import { Injectable } from '@angular/core';
import { HttpClient, HttpBackend, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GeocodingResult {
  lat: number;
  lng: number;
  display_name: string;
  place_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private googleApiKey = environment.googleMapsApiKey;
  private httpBypass: HttpClient;

  constructor(private handler: HttpBackend) {
    this.httpBypass = new HttpClient(handler);
  }

  /**
   * Helyszín és POI keresése (Google Places API - New)
   */
  geocodeAddress(query: string): Observable<GeocodingResult[]> {
    const url = `https://places.googleapis.com/v1/places:searchText`;

    const body = {
      textQuery: query,
      languageCode: "hu"
    };

    const headers = new HttpHeaders({
      'X-Goog-Api-Key': this.googleApiKey,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location',
      'Content-Type': 'application/json'
    });

    return this.httpBypass.post<any>(url, body, { headers }).pipe(
      map(response => {
        if (!response.places) {
          return [];
        }
        
        return response.places.slice(0, 10).map((place: any) => ({
          lat: place.location.latitude,
          lng: place.location.longitude,
          display_name: place.formattedAddress, 
          place_name: place.displayName?.text  
        }));
      })
    );
  }

  /**
   * Koordináta átalakítása címmé (Reverse Geocoding a "Jelenlegi helyzet" gombhoz)
   */
  reverseGeocode(lat: number, lng: number): Observable<string> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleApiKey}&language=hu`;

    return this.httpBypass.get<any>(url).pipe(
      map(response => {
        if (response.status === 'OK' && response.results.length > 0) {
          return response.results[0].formatted_address;
        }
        return 'Ismeretlen helyszín';
      })
    );
  }
}