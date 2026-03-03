import { Component, Input, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() latitude: number = 47.4979; 
  @Input() longitude: number = 19.0402;
  @Input() zoom: number = 13;
  @Input() markers: Array<{lat: number, lng: number, title?: string, popup?: string}> = [];
  @Input() height: string = '400px';
  @Input() clickable: boolean = false;
  
  private map!: L.Map;
  private markerLayer!: L.LayerGroup;
  public mapId: string;

  constructor() {
    this.mapId = 'map-' + Math.random().toString(36).substr(2, 9);
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.fixLeafletIconIssue();
    
    setTimeout(() => {
      this.initMap();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    this.map = L.map(this.mapId, {
      center: [this.latitude, this.longitude],
      zoom: this.zoom
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap, © CartoDB'
    }).addTo(this.map);

    this.markerLayer = L.layerGroup().addTo(this.map);

    if (this.markers.length > 0) {
      this.addMarkers();
    } else {
      this.addMarker(this.latitude, this.longitude);
    }

    if (this.clickable) {
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.onMapClick(e);
      });
    }

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 200);
  }

  private addMarkers(): void {
    this.markers.forEach(marker => {
      const leafletMarker = L.marker([marker.lat, marker.lng]);
      
      if (marker.popup) {
        leafletMarker.bindPopup(marker.popup);
      }
      
      leafletMarker.addTo(this.markerLayer);
    });

    if (this.markers.length > 1) {
      const bounds = L.latLngBounds(this.markers.map(m => [m.lat, m.lng]));
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  private addMarker(lat: number, lng: number, popup?: string): L.Marker {
    const marker = L.marker([lat, lng]);
    
    if (popup) {
      marker.bindPopup(popup);
    }
    
    marker.addTo(this.markerLayer);
    return marker;
  }

  private onMapClick(e: L.LeafletMouseEvent): void {
    this.markerLayer.clearLayers();
    
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    this.addMarker(lat, lng, `Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}`);
    
    console.log('Map clicked:', { lat, lng });
  }

  private fixLeafletIconIssue(): void {
    const iconDefault = L.icon({
      iconUrl: '/marker-icon.png',
      iconRetinaUrl: '/marker-icon-2x.png',
      shadowUrl: '/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });
    
    L.Marker.prototype.options.icon = iconDefault;
  }

  public setCenter(lat: number, lng: number, zoom?: number): void {
    if (this.map) {
      this.map.setView([lat, lng], zoom || this.zoom);
    }
  }

  public clearMarkers(): void {
    if (this.markerLayer) {
      this.markerLayer.clearLayers();
    }
  }

  public updateMarkers(markers: Array<{lat: number, lng: number, title?: string, popup?: string}>): void {
    this.clearMarkers();
    this.markers = markers;
    this.addMarkers();
  }
}