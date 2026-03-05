import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { SportTypeService } from '../../../core/services/sport-type.service';
import { User, UserUpdate, SportType, UserSportPreference, CreateUserSportPreference } from '../../../core/models/models';
import { GeocodingService, GeocodingResult } from '../../../core/services/geocoding.service';
import { SportPreferencesComponent } from '../sport-preferences/sport-preferences.component';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    SportPreferencesComponent
  ],
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.css']
})
export class ProfileEditComponent implements OnInit {
  profileForm!: FormGroup;
  user: User | null = null;
  sportTypes: SportType[] = [];
  sportPreferences: UserSportPreference[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';
  activeTab: 'personal' | 'preferences' | 'password' = 'personal';

  searchingLocation = false;
  geocodingResults: GeocodingResult[] = [];
  showGeocodingResults = false;
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  passwordForm!: FormGroup;
  passwordSaving = false;
  passwordSuccessMessage = '';
  passwordErrorMessage = '';

  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmIcon = '❓';
  confirmButtonText = 'Igen';
  confirmButtonClass = 'btn-danger';
  confirmAction: () => void = () => {};

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private sportTypeService: SportTypeService,
    private router: Router,
    private geocodingService: GeocodingService,
    private route: ActivatedRoute,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadSportTypes();
    this.loadUserProfile();
    this.initForm();
    this.initPasswordForm();

    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'preferences') this.activeTab = 'preferences';
      else if (params['tab'] === 'password') this.activeTab = 'password';
      else this.activeTab = 'personal';
    });
  }

  setTab(tab: 'personal' | 'preferences' | 'password'): void {
    this.activeTab = tab;
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

  loadUserProfile(): void {
    this.userService.getUserProfile().subscribe({
      next: (user) => {
        this.user = user;
        this.populateForm();
        this.loading = false;
      },
      error: (error) => {
        this.toastService.showError('Profil betöltése sikertelen.');
        this.loading = false;
      }
    });
  }

  loadSportPreferences(): void {
    this.userService.getSportPreferences().subscribe({
      next: (preferences) => {
        this.sportPreferences = preferences;
      },
      error: (error) => {
        console.error('Nem sikerült a sportág prefeenciák betöltése', error);
      }
    });
  }

  initForm(): void {
    this.profileForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      bio: ['', Validators.maxLength(500)],
      phone_number: [''],
      email: ['', [Validators.required, Validators.email]],
      default_location_name: [''],
      default_latitude: [null],
      default_longitude: [null],
      default_search_radius: [10, [Validators.min(1), Validators.max(100)]]
    });
  }

  populateForm(): void {
    if (this.user) {
      this.profileForm.patchValue({
        first_name: this.user.first_name,
        last_name: this.user.last_name,
        bio: this.user.bio,
        phone_number: this.user.phone_number,
        email: this.user.email,
        default_location_name: this.user.default_location_name,
        default_latitude: this.user.default_latitude,
        default_longitude: this.user.default_longitude,
        default_search_radius: this.user.default_search_radius
      });
      
      if (this.user.profile_picture) {
        this.imagePreview = this.user.profile_picture;
      }
      
      this.loadSportPreferences();
    }
  }

  get f() {
    return this.profileForm.controls;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  getCurrentLocation(): void {
    if (navigator.geolocation) {
      this.profileForm.patchValue({ default_location_name: 'Helyzet meghatározása...' });
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          this.profileForm.patchValue({
            default_latitude: lat,
            default_longitude: lng
          });

          this.geocodingService.reverseGeocode(lat, lng).subscribe({
            next: (address) => {
              const addressParts = address.split(',');
              const detailedAddress = addressParts.slice(0, 3).join(',').trim() || 'Saját helyzet';
              
              this.profileForm.patchValue({
                default_location_name: detailedAddress
              });
            },
            error: () => {
              this.profileForm.patchValue({ 
                default_location_name: 'Saját helyzet' 
              });
            }
          });
        },
        (error) => {
          this.profileForm.patchValue({ default_location_name: '' });
          this.toastService.showError('Nem sikerült lekérni a helyzeted. Kérlek, engedélyezd a helyadatokat a böngészőben!');
        }
      );
    } else {
      this.toastService.showError('A böngésződ nem támogatja a helymeghatározást.');
    }
  }

  deleteMyProfile(): void {
    this.openConfirmModal(
      'Profil törlése',
      '⚠️ BIZTOSAN TÖRÖLNI SZERETNÉD A PROFILODAT?\n\nEz a művelet végleges és nem vonható vissza! Minden eseményed és jelentkezésed azonnal törlődik.',
      '⚠️',
      'Végleges törlés',
      'btn-danger',
      () => {
        this.userService.deleteProfile().subscribe({
          next: () => {
            this.authService.logout(); 
            this.router.navigate(['/']);
            this.toastService.showSuccess('A profilod sikeresen törlésre került.');
          },
          error: (err) => {
            this.toastService.showError('Hiba történt a profil törlése során. Kérjük, próbáld újra később.');
          }
        });
      }
    );
  }

  searchLocationByAddress(): void {
    const address = this.profileForm.get('default_location_name')?.value;
    
    if (!address || address.trim().length < 3) {
      this.toastService.showError('Kérlek, adj meg legalább 3 karaktert a kereséshez!');
      return;
    }

    this.searchingLocation = true;
    this.geocodingService.geocodeAddress(address).subscribe({
      next: (results) => {
        this.geocodingResults = results;
        this.showGeocodingResults = true;
        this.searchingLocation = false;
        
        if (results.length === 0) {
          this.toastService.showError('Nem találtunk eredményt ehhez a címhez. Próbálj meg pontosabb címet megadni!');
        }
      },
      error: (error) => {
        this.toastService.showError('Hiba történt a keresés során. Próbáld újra!');
        this.searchingLocation = false;
      }
    });
  }

  selectGeocodingResult(result: GeocodingResult): void {
    const detailedAddress = result.display_name.split(',').slice(0, 3).join(',').trim();

    this.profileForm.patchValue({
      default_latitude: result.lat,
      default_longitude: result.lng,
      default_location_name: detailedAddress
    });
    
    this.showGeocodingResults = false;
    this.geocodingResults = [];
  }

  closeGeocodingResults(): void {
    this.showGeocodingResults = false;
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.toastService.showError('Kérlek, töltsd ki helyesen a kötelező mezőket!');
      Object.keys(this.profileForm.controls).forEach(key => {
        this.profileForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.saving = true;

    const formData: any = { ...this.profileForm.value };
    
    if (formData.default_latitude === null || formData.default_latitude === '') {
      delete formData.default_latitude;
    } else {
      formData.default_latitude = parseFloat(formData.default_latitude).toFixed(6);
    }

    if (formData.default_longitude === null || formData.default_longitude === '') {
      delete formData.default_longitude;
    } else {
      formData.default_longitude = parseFloat(formData.default_longitude).toFixed(6);
    }

    if (formData.default_location_name === '') {
      delete formData.default_location_name;
    }
    
    if (this.selectedFile) {
      formData.profile_picture = this.selectedFile;
    }

    this.userService.updateUserProfile(formData).subscribe({
      next: (user) => {
        this.toastService.showSuccess('Profil sikeresen frissítve!');
        this.saving = false;
        
        this.authService.updateCurrentUserState(user);

        this.router.navigate(['/profile']);
      },
      error: (error) => {
        console.error('Hiba történt a profil frissítése közben', error);
        if (error.error) {
          console.error('Django hiba részletei:', error.error);
        }
        
        this.toastService.showError('Profil frissítése sikertelen. Próbáld újra!');
        this.saving = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  initPasswordForm(): void {
    this.passwordForm = this.fb.group({
      old_password: ['', Validators.required],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('new_password')?.value === g.get('confirm_password')?.value
      ? null : { mismatch: true };
  }

  get p() {
    return this.passwordForm.controls;
  }

 onPasswordSubmit(): void {
    if (this.passwordForm.invalid) {
      this.toastService.showError('Kérlek, ellenőrizd a megadott jelszavakat!');
      Object.keys(this.passwordForm.controls).forEach(key => {
        this.passwordForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.passwordSaving = true;

    const payload = {
      old_password: this.passwordForm.value.old_password,
      new_password: this.passwordForm.value.new_password,
      new_password2: this.passwordForm.value.confirm_password 
    };

    this.userService.changePassword(payload).subscribe({
      next: () => {
        this.passwordSaving = false;
        this.passwordForm.reset(); 
        this.toastService.showSuccess('A jelszavad sikeresen megváltozott!');
        this.router.navigate(['/profile']);
      },
      error: (error) => {
        this.passwordSaving = false;
        const errMsg = error.error?.old_password 
          ? 'A megadott jelenlegi jelszó helytelen!' 
          : 'Hiba történt a jelszó módosításakor!';
        
        this.toastService.showError(errMsg);
      }
    });
  }

  addSportPreference(): void {}
  deleteSportPreference(id: number): void {}
  getSkillLevelLabel(level: string): string {
    const labels: { [key: string]: string } = {
      'beginner': 'Kezdő',
      'intermediate': 'Haladó',
      'advanced': 'Profi'
    };
    return labels[level] || level;
  }

  openConfirmModal(title: string, message: string, icon: string, btnText: string, btnClass: string, action: () => void) {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmIcon = icon;
    this.confirmButtonText = btnText;
    this.confirmButtonClass = btnClass;
    this.confirmAction = action;
    this.showConfirmModal = true;
  }

  cancelConfirm() {
    this.showConfirmModal = false;
  }

  executeConfirm() {
    this.showConfirmModal = false;
    this.confirmAction();
  }
}