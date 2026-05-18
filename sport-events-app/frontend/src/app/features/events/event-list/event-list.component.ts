import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../../core/services/event.service';
import { SportTypeService } from '../../../core/services/sport-type.service';
import { SportEvent, SportType, EventFilterParams } from '../../../core/models/models';
import { MapComponent } from '../../../shared/map/map.component';
import { ToastService } from '../../../core/services/toast.service';

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
  
  viewMode: 'list' | 'map' = 'list';
  
  mapMarkers: Array<{lat: number, lng: number, popup: string}> = [];

  filters: EventFilterParams = {
    search: '',
    sport_type: undefined,
    status: '',
    difficulty: undefined,
    is_free: undefined,
    ordering: 'start_date_time'
  };

  currentPage = 1;
  totalCount = 0;
  hasNext = false;
  hasPrevious = false;

  useLocation = false;
  userLocation: { lat: number, lng: number } | null = null;
  searchRadius = 10;

  constructor(
    private eventService: EventService,
    private sportTypeService: SportTypeService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadSportTypes();
    this.loadEvents();
  }

  /**
   * Betölti a szűrőhöz szükséges elérhető sportágakat a szerverről.
   */
  loadSportTypes(): void {
    this.sportTypeService.getAllSportTypes().subscribe({
      next: (types) => {
        if (Array.isArray(types)) {
          this.sportTypes = types;
        } else {
          this.sportTypes = (types as any).results || [];
        }
      },
      error: (error) => {
        console.error('Nem sikerült a sportágak betöltése', error);
        this.sportTypes = []; 
      }
    });
  }

  /**
   * Lekéri az események listáját a beállított szűrők és lapozás alapján.
   */
  loadEvents(): void {
    this.loading = true;
    
    const params: EventFilterParams = {
      ...this.filters,
      page: this.currentPage
    };

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
        
        this.updateMapMarkers();
      },
      error: (error) => {
        console.error('Nem sikerült az események betöltése', error);
        this.loading = false;
      }
    });
  }

  /**
   * Alkalmazza a beállított szűrőket és újratölti az eseményeket az első oldaltól.
   */
  applyFilters(): void {
    this.currentPage = 1;
    this.loadEvents();
  }

  /**
   * Visszaállítja a szűrőket az alapértelmezett állapotra, majd újratölti a listát.
   */
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

  /**
   * Betölti a következő oldalt a találati listában.
   */
  nextPage(): void {
    if (this.hasNext) {
      this.currentPage++;
      this.loadEvents();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Visszalép az előző oldalra a találati listában.
   */
  previousPage(): void {
    if (this.hasPrevious) {
      this.currentPage--;
      this.loadEvents();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Be- vagy kikapcsolja a helyalapú keresést, és szükség esetén lekéri a pozíciót.
   */
  toggleLocationSearch(): void {
    if (this.useLocation && !this.userLocation) {
      this.getCurrentLocation();
    } else if (!this.useLocation) {
      this.applyFilters();
    }
  }

  /**
   * Lekéri a felhasználó aktuális földrajzi helyzetét a böngészőből.
   */
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
          this.toastService.showError('Nem sikerült lekérni a helyzeted. Kérlek, engedélyezd a helymeghatározást.');
          this.useLocation = false;
        }
      );
    } else {
      this.toastService.showError('A böngésződ nem támogatja a helymeghatározást.');
      this.useLocation = false;
    }
  }

  /**
   * Visszaadja az esemény státuszának olvasható, magyar megfelelőjét.
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'upcoming': 'Közelgő',
      'ongoing': 'Folyamatban',
      'completed': 'Befejezett',
      'cancelled': 'Törölve'
    };
    return labels[status] || status;
  }

  /**
   * Formázott magyar dátumot készít (hónap, nap) az ISO dátumsztringből.
   */
  getEventDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  /**
   * Formázott időpontot készít (óra, perc) az ISO dátumsztringből.
   */
  getEventTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('hu-HU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Visszaadja a nehézségi szint olvasható, magyar megfelelőjét.
   */
  getDifficultyLabel(difficulty: string): string {
    const labels: { [key: string]: string } = {
      'easy': 'Kezdő',
      'medium': 'Közepes',
      'hard': 'Haladó'
    };
    return labels[difficulty] || difficulty;
  }

  /**
   * Vált a listás és a térképes nézet között.
   */
  switchViewMode(mode: 'list' | 'map'): void {
  this.viewMode = mode;
}

  /**
   * Frissíti a térképen megjelenő jelölőket (markereket) a betöltött események alapján.
   */
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