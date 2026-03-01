import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { SportTypeService } from '../../../core/services/sport-type.service';
import { GeocodingService, GeocodingResult } from '../../../core/services/geocoding.service';
import { SportType, CreateSportEvent } from '../../../core/models/models';

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
  
  // Location
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
    private route: ActivatedRoute
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
      difficulty: ['medium', Validators.required],
      is_public: [true],
      requires_approval: [false],
      is_free: [true],
      price: [null],
      notes: ['']
    });

    // Price validation
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

          // Reverse geocoding: pontos cím lekérése
          this.geocodingService.reverseGeocode(lat, lng).subscribe({
            next: (address) => {
              // Első rész = utca + házszám (Nominatim formátum)
              const streetPart = address.split(',')[0]?.trim() || 'Jelenlegi helyszín';
              this.eventForm.patchValue({
                location_name: streetPart,
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
          console.error('Error getting location', error);
          alert('Nem sikerült lekérni a helyzeted. Kérlek, add meg manuálisan!');
          this.useCurrentLocation = false;
          this.searchingLocation = false;
        }
      );
    } else {
      alert('A böngésződ nem támogatja a helymeghatározást.');
    }
  }

  setManualLocation(): void {
    // Placeholder coordinates (Budapest center)
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
    const address = this.eventForm.get('location_address')?.value;
    const locationName = this.eventForm.get('location_name')?.value;
    
    const searchQuery = address || locationName;
    
    if (!searchQuery || searchQuery.trim().length < 3) {
      alert('Kérlek, adj meg legalább 3 karaktert a kereséshezhez!');
      return;
    }

    this.searchingLocation = true;
    this.geocodingService.geocodeAddress(searchQuery).subscribe({
      next: (results) => {
        this.geocodingResults = results;
        this.showGeocodingResults = true;
        this.searchingLocation = false;
        
        if (results.length === 0) {
          alert('Nem találtunk eredményt ehhez a címhez. Próbálj meg pontosabb címet megadni!');
        }
      },
      error: (error) => {
        console.error('Geocoding error', error);
        alert('Hiba történt a keresés során. Próbáld újra!');
        this.searchingLocation = false;
      }
    });
  }

  selectGeocodingResult(result: GeocodingResult): void {
    this.selectedLocation = { lat: result.lat, lng: result.lng };
    this.eventForm.patchValue({
      latitude: result.lat,
      longitude: result.lng,
      location_address: result.display_name
    });
    this.showGeocodingResults = false;
    this.geocodingResults = [];
  }

  closeGeocodingResults(): void {
    this.showGeocodingResults = false;
  }

  loadEventData(id: number): void {
    this.loading = true;
    this.eventService.getEventById(id).subscribe({
      next: (event) => {
        // A dátumot át kell alakítani a datetime-local input formátumára (YYYY-MM-DDTHH:mm)
        const dateObj = new Date(event.start_date_time);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formattedDate = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;

        // A helyszín koordinátáit is eltároljuk a térképhez
        this.selectedLocation = { lat: Number(event.latitude), lng: Number(event.longitude) };

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
        console.error('Hiba az esemény betöltésekor', error);
        alert('Nem sikerült betölteni a szerkesztendő eseményt.');
        this.router.navigate(['/my-events']);
      }
    });
  }

  onSubmit(): void {
    console.log('Submitting form...');

    if (this.eventForm.invalid) {
      console.warn('Form invalid:', this.eventForm.value);

      Object.keys(this.eventForm.controls).forEach(key => {
        const control = this.eventForm.get(key);
        control?.markAsTouched();
        console.warn(`${key}:`, control?.errors);
      });

      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.errors = {};

    const formData: CreateSportEvent = this.eventForm.value;

    console.log('Sending payload to backend:', JSON.stringify(formData, null, 2));

    if (this.isEditMode && this.eventId) {
      this.eventService.updateEvent(this.eventId, formData).subscribe({
        next: () => {
          alert('✅ Esemény sikeresen frissítve!');
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
          alert('✅ Esemény sikeresen létrehozva!');
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
    console.error('%cBackend error response:', 'color: red; font-weight: bold;', error);

    if (error.error) {
      console.log('%cRaw backend error body:', 'color: orange;', error.error);

      if (typeof error.error === 'string') {
        this.errorMessage = error.error;
      } else {
        this.errors = error.error;
        
        this.errorMessage =
          'Hiba az űrlapban:\n' +
          Object.keys(error.error)
            .map(key => `• ${key}: ${error.error[key]}`)
            .join('\n');
      }
    } else {
      this.errorMessage = 'Ismeretlen hiba történt.';
    }

    this.loading = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}