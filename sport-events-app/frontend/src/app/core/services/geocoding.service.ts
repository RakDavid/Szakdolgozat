import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface GeocodingResult {
  lat: number;
  lng: number;
  display_name: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private nominatimUrl = 'https://nominatim.openstreetmap.org/search';

  constructor(private http: HttpClient) {}

  /**
   * Cím alapú geocoding - koordináták lekérése címből
   */
  geocodeAddress(address: string): Observable<GeocodingResult[]> {
    const params = {
      q: address,
      format: 'json',
      limit: '5',
      addressdetails: '1',
      'accept-language': 'hu'
    };

    return this.http.get<any[]>(this.nominatimUrl, { params }).pipe(
      map(results => {
        return results.map(result => ({
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          display_name: result.display_name
        }));
      })
    );
  }

  /**
   * Reverse geocoding - cím lekérése koordinátákból
   */
  reverseGeocode(lat: number, lng: number): Observable<string> {
    const reverseUrl = 'https://nominatim.openstreetmap.org/reverse';
    const params = {
      lat: lat.toString(),
      lon: lng.toString(),
      format: 'json',
      'accept-language': 'hu'
    };

    return this.http.get<any>(reverseUrl, { params }).pipe(
      map(result => result.display_name || '')
    );
  }
}