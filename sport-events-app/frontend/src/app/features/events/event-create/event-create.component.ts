import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { SportTypeService } from '../../../core/services/sport-type.service';
import { GeocodingService, GeocodingResult } from '../../../core/services/geocoding.service';
import { SportType, CreateSportEvent } from '../../../core/models/models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-event-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './event-create.component.html',
  styleUrls: ['./event-create.component.css']
})
export class EventCreateComponent implements OnInit {
  eventForm!: FormGroup;
  sportTypes: SportType[] = [];
  loading = false;
  errorMessage = '';
  errors: any = {};
  isEditMode = false;
  eventId: number | null = null;

  selectedFile: File | null = null;
  imagePreview: string | null = null;
  
  selectedLocation: { lat: number, lng: number } | null = null;
  useCurrentLocation = false;
  searchingLocation = false;
  geocodingResults: GeocodingResult[] = [];
  showGeocodingResults = false;

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private sportTypeService: SportTypeService,
    private geocodingService: GeocodingService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadSportTypes();
    this.initForm();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.eventId = +idParam;
      this.loadEventData(this.eventId);
    }
  }

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

  initForm(): void {
    const targetDate = new Date();
    targetDate.setHours(targetDate.getHours() + 1);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const defaultDate = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}`;
    
    this.eventForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      sport_type: [null, Validators.required],
      start_date_time: [defaultDate, Validators.required],
      duration_minutes: [60, [Validators.required, Validators.min(15)]],
      location_name: ['', [Validators.required, Validators.maxLength(200)]],
      location_address: [''],
      latitude: [null],
      longitude: [null],
      max_participants: [10, [Validators.required, Validators.min(2)]],
      min_participants: [2, [Validators.required, Validators.min(1)]],
      has_friends: [false], 
      friends_count: [null],
      difficulty: ['medium', Validators.required],
      is_public: [true],
      requires_approval: [false],
      is_free: [true],
      price: [null],
      notes: ['']
    });

    this.eventForm.get('has_friends')?.valueChanges.subscribe(hasFriends => {
      const friendsControl = this.eventForm.get('friends_count');
      if (hasFriends) {
        friendsControl?.setValidators([Validators.required, Validators.min(1)]);
        if (!friendsControl?.value) friendsControl?.setValue(1);
      } else {
        friendsControl?.clearValidators();
        friendsControl?.setValue(null);
      }
      friendsControl?.updateValueAndValidity();
    });

    this.eventForm.get('is_free')?.valueChanges.subscribe(isFree => {
      const priceControl = this.eventForm.get('price');
      if (isFree) {
        priceControl?.clearValidators();
        priceControl?.setValue(null);
      } else {
        priceControl?.setValidators([Validators.required, Validators.min(0)]);
      }
      priceControl?.updateValueAndValidity();
    });
  }

  get f() {
    return this.eventForm.controls;
  }

getCurrentLocation(): void {
    if (navigator.geolocation) {
      this.useCurrentLocation = true;
      this.searchingLocation = true;
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.selectedLocation = { lat, lng };
          this.eventForm.patchValue({ latitude: lat, longitude: lng });

          this.geocodingService.reverseGeocode(lat, lng).subscribe({
            next: (address) => {
              const addressParts = address.split(',');
              const streetPart = addressParts.length > 1 
                ? addressParts[1].trim() 
                : addressParts[0].trim();

              this.eventForm.patchValue({
                location_name: streetPart || 'Jelenlegi helyszín',
                location_address: address
              });
              this.searchingLocation = false;
            },
            error: () => {
              this.eventForm.patchValue({ location_name: 'Jelenlegi helyszín' });
              this.searchingLocation = false;
            }
          });
        },
        (error) => {
          this.toastService.showError('Nem sikerült lekérni a helyzeted. Kérlek, add meg manuálisan!');
          this.useCurrentLocation = false;
          this.searchingLocation = false;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } 
      );
    } else {
      this.toastService.showError('A böngésződ nem támogatja a helymeghatározást.');
    }
  }

  setManualLocation(): void {
    const lat = parseFloat(prompt('Add meg a szélességi fokot:', '47.4979') || '47.4979');
    const lng = parseFloat(prompt('Add meg a hosszúsági fokot:', '19.0402') || '19.0402');
    
    if (!isNaN(lat) && !isNaN(lng)) {
      this.selectedLocation = { lat, lng };
      this.eventForm.patchValue({
        latitude: lat,
        longitude: lng
      });
    }
  }

  searchLocationByAddress(): void {
    const locationName = this.eventForm.get('location_name')?.value;
    
    const searchQuery = locationName;
    
    if (!searchQuery || searchQuery.trim().length < 3) {
      this.toastService.showError('Kérlek, adj meg legalább 3 karaktert a "Helyszín neve" mezőben a kereséshez!');
      return;
    }

    this.searchingLocation = true;
    this.geocodingService.geocodeAddress(searchQuery).subscribe({
      next: (results) => {
        this.geocodingResults = results;
        this.showGeocodingResults = true;
        this.searchingLocation = false;
        
        if (results.length === 0) {
          this.toastService.showError('Nem találtunk eredményt ehhez a névhez. Próbáld meg pontosítani (pl. város hozzáadásával)!');
        }
      },
      error: (error) => {
        console.error('Geocoding error', error);
        this.toastService.showError('Hiba történt a keresés során. Próbáld újra!');
        this.searchingLocation = false;
      }
    });
  }

  selectGeocodingResult(result: GeocodingResult): void {
    this.selectedLocation = { lat: result.lat, lng: result.lng };
    
    const currentTypedName = this.eventForm.get('location_name')?.value;
    
    this.eventForm.patchValue({
      latitude: result.lat,
      longitude: result.lng,
      location_address: result.display_name,

      location_name: result.place_name ? result.place_name : currentTypedName
    });
    
    this.showGeocodingResults = false;
    this.geocodingResults = [];
    
    this.toastService.showSuccess('Helyszín és pontos cím sikeresen beállítva!');
  }

  closeGeocodingResults(): void {
    this.showGeocodingResults = false;
  }

  loadEventData(id: number): void {
    this.loading = true;
    this.eventService.getEventById(id).subscribe({
      next: (event: any) => {
        const dateObj = new Date(event.start_date_time);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formattedDate = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;

        this.selectedLocation = { lat: Number(event.latitude), lng: Number(event.longitude) };

        const reservedSpots = event.reserved_spots || 1;
        const hasFriends = reservedSpots > 1;
        const friendsCount = hasFriends ? (reservedSpots - 1) : null;

        this.eventForm.patchValue({
          title: event.title,
          description: event.description,
          sport_type: event.sport_type,
          start_date_time: formattedDate,
          duration_minutes: event.duration_minutes,
          location_name: event.location_name,
          location_address: event.location_address,
          latitude: Number(event.latitude),
          longitude: Number(event.longitude),
          max_participants: event.max_participants,
          min_participants: event.min_participants,
          has_friends: hasFriends,
          friends_count: friendsCount,
          difficulty: event.difficulty,
          is_public: event.is_public,
          requires_approval: event.requires_approval,
          is_free: event.is_free,
          price: event.price,
          notes: event.notes
        });
        this.loading = false;
      },
      error: (error) => {
        this.toastService.showError('Nem sikerült betölteni a szerkesztendő eseményt.');
        this.router.navigate(['/my-events']);
      }
    });
  }

  onSubmit(): void {
    if (this.eventForm.invalid) {
      this.toastService.showError('Kérlek töltsd ki az összes kötelező mezőt helyesen!');
      Object.keys(this.eventForm.controls).forEach(key => {
        const control = this.eventForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.errors = {};
    const formData: any = { ...this.eventForm.value };
    const hasFriends = formData.has_friends;
    const friendsCount = formData.friends_count || 0;
    formData.reserved_spots = hasFriends ? (1 + friendsCount) : 1;
    delete formData.has_friends;
    delete formData.friends_count;

    if (formData.reserved_spots > formData.max_participants) {
      this.toastService.showError('A veled érkezők száma nem lehet nagyobb a maximális létszámnál!');
      this.loading = false; 
      return; 
    }

    if (this.isEditMode && this.eventId) {
      this.eventService.updateEvent(this.eventId, formData).subscribe({
        next: () => {
          this.toastService.showSuccess('Esemény sikeresen frissítve!');
          this.router.navigate(['/events', this.eventId]); 
        },
        error: (error) => this.handleBackendError(error),
        complete: () => {
          this.loading = false;
        }
      });
    } else {
      this.eventService.createEvent(formData).subscribe({
        next: (event) => {
          this.toastService.showSuccess('Esemény sikeresen létrehozva!');
          this.router.navigate(['/my-events']);
        },
        error: (error) => this.handleBackendError(error),
        complete: () => {
          this.loading = false;
        }
      });
    }
  }

  private handleBackendError(error: any): void {
    if (error.error) {
      if (typeof error.error === 'string') {
        this.toastService.showError(error.error);
      } else {
        this.errors = error.error;
        
        const errorMsg = 'Hiba az űrlapban:\n' + 
          Object.keys(error.error)
            .map(key => `• ${key}: ${error.error[key]}`)
            .join('\n');
            
        this.toastService.showError(errorMsg);
      }
    } else {
      this.toastService.showError('Ismeretlen hiba történt a szerverrel való kommunikáció során.');
    }

    this.loading = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}