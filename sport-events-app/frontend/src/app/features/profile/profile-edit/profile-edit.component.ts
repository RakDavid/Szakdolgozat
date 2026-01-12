import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { SportTypeService } from '../../../core/services/sport-type.service';
import { User, UserUpdate, SportType, UserSportPreference, CreateUserSportPreference } from '../../../core/models/models';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
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
  
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private sportTypeService: SportTypeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSportTypes();
    this.loadUserProfile();
    this.initForm();
  }

  loadSportTypes(): void {
    this.sportTypeService.getAllSportTypes().subscribe({
      next: (types) => {
        this.sportTypes = types;
      },
      error: (error) => {
        console.error('Error loading sport types', error);
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
        console.error('Error loading profile', error);
        this.errorMessage = 'Profil betöltése sikertelen.';
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
        console.error('Error loading sport preferences', error);
      }
    });
  }

  initForm(): void {
    this.profileForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      bio: ['', Validators.maxLength(500)],
      phone_number: [''],
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
      
      // Preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  getCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.profileForm.patchValue({
            default_latitude: position.coords.latitude,
            default_longitude: position.coords.longitude,
            default_location_name: 'Jelenlegi helyzet'
          });
        },
        (error) => {
          console.error('Error getting location', error);
          alert('Nem sikerült lekérni a helyzeted.');
        }
      );
    }
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      Object.keys(this.profileForm.controls).forEach(key => {
        this.profileForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData: UserUpdate = this.profileForm.value;
    
    if (this.selectedFile) {
      formData.profile_picture = this.selectedFile;
    }

    this.userService.updateUserProfile(formData).subscribe({
      next: (user) => {
        this.successMessage = 'Profil sikeresen frissítve!';
        this.saving = false;
        
        setTimeout(() => {
          this.router.navigate(['/profile']);
        }, 1500);
      },
      error: (error) => {
        console.error('Error updating profile', error);
        this.errorMessage = 'Profil frissítése sikertelen. Próbáld újra!';
        this.saving = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  addSportPreference(): void {
    // Egyszerű prompt alapú hozzáadás - valós implementációban modális ablakot használj
    const sportTypeId = prompt('Add meg a sportág ID-t (1-' + this.sportTypes.length + '):');
    if (!sportTypeId) return;

    const newPref: CreateUserSportPreference = {
      sport_type: parseInt(sportTypeId),
      skill_level: 'intermediate',
      interest_level: 5
    };

    this.userService.createSportPreference(newPref).subscribe({
      next: () => {
        this.loadSportPreferences();
        this.successMessage = 'Preferencia hozzáadva!';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error adding preference', error);
        this.errorMessage = 'Preferencia hozzáadása sikertelen.';
      }
    });
  }

  deleteSportPreference(id: number): void {
    if (!confirm('Biztosan törölni szeretnéd ezt a preferenciát?')) return;

    this.userService.deleteSportPreference(id).subscribe({
      next: () => {
        this.sportPreferences = this.sportPreferences.filter(p => p.id !== id);
        this.successMessage = 'Preferencia törölve!';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error deleting preference', error);
        this.errorMessage = 'Preferencia törlése sikertelen.';
      }
    });
  }

  getSkillLevelLabel(level: string): string {
    const labels: { [key: string]: string } = {
      'beginner': 'Kezdő',
      'intermediate': 'Haladó',
      'advanced': 'Profi'
    };
    return labels[level] || level;
  }
}
