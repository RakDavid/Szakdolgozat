import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../../core/services/event.service';
import { SportTypeService } from '../../../core/services/sport-type.service';
import { SportEvent, SportType, EventFilterParams } from '../../../core/models/models';
import { MapComponent } from '../../../shared/map/map.component';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MapComponent],
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.css']
})
export class EventListComponent implements OnInit {
  events: SportEvent[] = [];
  sportTypes: SportType[] = [];
  loading = false;
  
  // View mode
  viewMode: 'list' | 'map' = 'list';
  
  // Map markers
  mapMarkers: Array<{lat: number, lng: number, popup: string}> = [];
  
  // Filters
  filters: EventFilterParams = {
    search: '',
    sport_type: undefined,
    status: '',
    difficulty: undefined,
    is_free: undefined,
    ordering: 'start_date_time'
  };

  // Pagination
  currentPage = 1;
  totalCount = 0;
  hasNext = false;
  hasPrevious = false;

  // Location search
  useLocation = false;
  userLocation: { lat: number, lng: number } | null = null;
  searchRadius = 10;

  constructor(
    private eventService: EventService,
    private sportTypeService: SportTypeService
  ) {}

  ngOnInit(): void {
    this.loadSportTypes();
    this.loadEvents();
  }

  loadSportTypes(): void {
    console.log('Loading sport types...');
    this.sportTypeService.getAllSportTypes().subscribe({
      next: (types) => {
        console.log('Raw response:', types);
        console.log('Is array?', Array.isArray(types));
        console.log('Type of:', typeof types);
        
        // Ha nem tömb, próbáljuk kikényszeríteni
        if (Array.isArray(types)) {
          this.sportTypes = types;
        } else {
          // Ha objektum, lehet hogy results property-ben van
          this.sportTypes = (types as any).results || [];
        }
        
        console.log('Final sportTypes:', this.sportTypes);
      },
      error: (error) => {
        console.error('Error loading sport types', error);
        this.sportTypes = []; // Üres tömb hiba esetén
      }
    });
  }

  loadEvents(): void {
    this.loading = true;
    
    const params: EventFilterParams = {
      ...this.filters,
      page: this.currentPage
    };

    // Location filter hozzáadása, ha engedélyezett
    if (this.useLocation && this.userLocation) {
      params.user_lat = this.userLocation.lat;
      params.user_lng = this.userLocation.lng;
      params.radius = this.searchRadius;
    }

    this.eventService.getEvents(params).subscribe({
      next: (response) => {
        this.events = response.results;
        this.totalCount = response.count;
        this.hasNext = !!response.next;
        this.hasPrevious = !!response.previous;
        this.loading = false;
        
        // Térkép markerek frissítése IDE KERÜL!
        this.updateMapMarkers();
      },
      error: (error) => {
        console.error('Error loading events', error);
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadEvents();
  }

  resetFilters(): void {
    this.filters = {
      search: '',
      sport_type: undefined,
      status: 'upcoming',
      difficulty: undefined,
      is_free: undefined,
      ordering: 'start_date_time'
    };
    this.useLocation = false;
    this.currentPage = 1;
    this.loadEvents();
  }

  nextPage(): void {
    if (this.hasNext) {
      this.currentPage++;
      this.loadEvents();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousPage(): void {
    if (this.hasPrevious) {
      this.currentPage--;
      this.loadEvents();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  toggleLocationSearch(): void {
    if (this.useLocation && !this.userLocation) {
      this.getCurrentLocation();
    } else if (!this.useLocation) {
      this.applyFilters();
    }
  }

  getCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          this.applyFilters();
        },
        (error) => {
          console.error('Error getting location', error);
          alert('Nem sikerült lekérni a helyzeted. Kérlek, engedélyezd a helymeghatározást.');
          this.useLocation = false;
        }
      );
    } else {
      alert('A böngésződ nem támogatja a helymeghatározást.');
      this.useLocation = false;
    }
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'upcoming': 'Közelgő',
      'ongoing': 'Folyamatban',
      'completed': 'Befejezett',
      'cancelled': 'Törölve'
    };
    return labels[status] || status;
  }

  getEventDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getEventTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('hu-HU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getDifficultyLabel(difficulty: string): string {
    const labels: { [key: string]: string } = {
      'easy': 'Kezdő',
      'medium': 'Közepes',
      'hard': 'Haladó'
    };
    return labels[difficulty] || difficulty;
  }

  switchViewMode(mode: 'list' | 'map'): void {
  this.viewMode = mode;
}

  updateMapMarkers(): void {
    this.mapMarkers = this.events.map(event => ({
      lat: event.latitude,
      lng: event.longitude,
      popup: `<div style="text-align: center;">
                <strong>${event.title}</strong><br>
                <small>${event.sport_type_detail?.name}</small><br>
                📍 ${event.location_name}<br>
                👥 ${event.participants_count}/${event.max_participants}<br>
                <a href="/events/${event.id}" style="color: #667eea; font-weight: 600;">Részletek →</a>
              </div>`
    }));
  }
}
