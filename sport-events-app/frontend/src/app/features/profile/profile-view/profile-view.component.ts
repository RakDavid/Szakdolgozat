import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { SportTypeService } from '../../../core/services/sport-type.service'; // Ezt add hozzá!
import { User, UserSportPreference, SportType } from '../../../core/models/models'; // SportType is kell!

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile-view.component.html',
  styleUrls: ['./profile-view.component.css']
})
export class ProfileViewComponent implements OnInit {
  user: User | null = null;
  sportPreferences: UserSportPreference[] = [];
  sportTypes: SportType[] = []; // Ide mentjük a sportágakat
  loading = true;
  errorMessage = '';

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private sportTypeService: SportTypeService, // Injektáljuk a szervizt
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadSportPreferences();
    this.loadSportTypes(); // Ezt is meghívjuk induláskor
  }

  // --- ÚJ FÜGGVÉNYEK ---

  loadSportTypes(): void {
    this.sportTypeService.getAllSportTypes().subscribe({
      next: (types) => {
        // Kezeljük, ha tömb vagy ha objektum (results)
        this.sportTypes = Array.isArray(types) ? types : (types as any).results || [];
      },
      error: (error) => console.error('Error loading sport types', error)
    });
  }

  getSportName(sportId: number): string {
    const sport = this.sportTypes.find(s => s.id === sportId);
    return sport ? sport.name : 'Ismeretlen sportág';
  }

  // Opcionális: Ha ikonokat is akarsz (ahogy az editornál volt)
  getSportIcon(sportId: number): string {
    const icons: { [key: string]: string } = {
      'Futás': '🏃', 'Kerékpározás': '🚴', 'Úszás': '🏊', 'Foci': '⚽',
      'Kosárlabda': '🏀', 'Tenisz': '🎾', 'Röplabda': '🏐', 'Tollaslabda': '🏸',
      'Asztalitenisz': '🏓', 'Jóga': '🧘', 'Fitnesz': '💪', 'Túrázás': '🥾'
    };
    const name = this.getSportName(sportId);
    return icons[name] || '🎯';
  }

  loadUserProfile(): void {
    this.userService.getUserProfile().subscribe({
      next: (user) => {
        this.user = user;
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
        console.log('Backend válasz (preferenciák):', preferences); // Ezt add hozzá!
        
        // Ha a válasz egy objektum "results" kulccsal:
        if (preferences && (preferences as any).results) {
            this.sportPreferences = (preferences as any).results;
        } 
        // Ha közvetlenül egy tömb:
        else if (Array.isArray(preferences)) {
            this.sportPreferences = preferences;
        } 
        // Ha valami más (pl. egy formázatlan string)
        else {
            this.sportPreferences = [];
        }
        
        console.log('Feldolgozott preferenciák:', this.sportPreferences); // Ezt is!
      },
      error: (error) => {
        console.error('Error loading sport preferences', error);
      }
    });
  }
  editProfile(): void {
    this.router.navigate(['/profile/edit']);
  }

  getSkillLevelLabel(level: string): string {
    const labels: { [key: string]: string } = {
      'beginner': 'Kezdő',
      'intermediate': 'Haladó',
      'advanced': 'Profi'
    };
    return labels[level] || level;
  }

  getUserInitials(): string {
    if (!this.user) return '';
    
    const firstInitial = this.user.first_name?.charAt(0) || '';
    const lastInitial = this.user.last_name?.charAt(0) || '';
    
    return (firstInitial + lastInitial).toUpperCase() || this.user.username.charAt(0).toUpperCase();
  }

  getMemberSince(): string {
    if (!this.user) return '';
    
    const date = new Date(this.user.date_joined);
    return date.toLocaleDateString('hu-HU', { 
      year: 'numeric', 
      month: 'long' 
    });
  }
}
