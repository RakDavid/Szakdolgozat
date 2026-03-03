import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { SportTypeService } from '../../../core/services/sport-type.service';
import { EventService } from '../../../core/services/event.service';
import { ActivatedRoute } from '@angular/router';
import { User, UserSportPreference, SportType, SportEvent } from '../../../core/models/models';
import { ToastService } from '../../../core/services/toast.service';

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
  sportTypes: SportType[] = []; 
  loading = true;
  errorMessage = '';
  isOwnProfile = true; 
  viewedUserId: number | null = null;

  createdEvents: SportEvent[] = [];
  participatedEvents: SportEvent[] = [];
  showCreated = false;
  showParticipated = false;
  loadingEvents = false;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private sportTypeService: SportTypeService,
    private eventService: EventService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const currentUser = this.authService.currentUserValue;

    this.loadSportTypes();

    if (idParam && Number(idParam) !== currentUser?.id) {
      this.isOwnProfile = false;
      this.viewedUserId = Number(idParam);
      this.loadPublicProfile(this.viewedUserId);
    } else {
      this.isOwnProfile = true;
      this.loadUserProfile();
    }
  }

  loadPublicProfile(id: number): void {
    this.loading = true;
    this.userService.getUserById(id).subscribe({
      next: (user) => {
        this.user = user;
      
        if (user.sport_preferences) {
            this.sportPreferences = user.sport_preferences;
        } else {
            this.sportPreferences = [];
        }
        
        this.loading = false;
      },
      error: () => {
        this.toastService.showError('A felhasználó nem található.');
        this.loading = false;
        this.router.navigate(['/']);
      }
    });
  }

  loadSportTypes(): void {
    this.sportTypeService.getAllSportTypes().subscribe({
      next: (types) => {
        this.sportTypes = Array.isArray(types) ? types : (types as any).results || [];
      },
      error: (error) => console.error('Hiba a sportágak betöltése közben', error)
    });
  }

  getSportName(sportId: number): string {
    const sport = this.sportTypes.find(s => s.id === sportId);
    return sport ? sport.name : 'Ismeretlen sportág';
  }

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
        
        if (user.sport_preferences) {
            this.sportPreferences = user.sport_preferences;
        } else {
            this.sportPreferences = [];
        }
        
        console.log('=== DEBUG: Teljes user objektum ===', this.user);
        console.log('=== DEBUG: Szervezői értékelés (organizer_rating) ===', this.user?.organizer_rating);
        this.loading = false;
      },
      error: (error) => {
        this.toastService.showError('Profil betöltése sikertelen.');
        this.loading = false;
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
    
    return (lastInitial + firstInitial).toUpperCase() || this.user.username.charAt(0).toUpperCase();
  }

  getMemberSince(): string {
    if (!this.user) return '';
    
    const date = new Date(this.user.date_joined);
    return date.toLocaleDateString('hu-HU', { 
      year: 'numeric', 
      month: 'long' 
    });
  }

  toggleCreatedEvents(): void {
    if (!this.isOwnProfile) return;
    this.showCreated = !this.showCreated;
    this.showParticipated = false; 

    if (this.showCreated && this.createdEvents.length === 0) {
      this.loadingEvents = true;
      this.eventService.getMyEvents().subscribe({
        next: (res) => {
          this.createdEvents = res.results;
          this.loadingEvents = false;
        },
        error: () => this.loadingEvents = false
      });
    }
  }

  toggleParticipatedEvents(): void {
    if (!this.isOwnProfile) return;
    this.showParticipated = !this.showParticipated;
    this.showCreated = false; 

    if (this.showParticipated && this.participatedEvents.length === 0) {
      this.loadingEvents = true;
      this.eventService.getMyParticipations().subscribe({
        next: (res) => {
          this.participatedEvents = res.results;
          this.loadingEvents = false;
        },
        error: () => this.loadingEvents = false
      });
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

  getFavoriteSportName(): string | null {
    if (!this.sportPreferences || this.sportPreferences.length === 0) {
      return null;
    }
    
    const sortedPrefs = [...this.sportPreferences].sort((a, b) => b.interest_level - a.interest_level);
    const topSportId = sortedPrefs[0].sport_type;
    
    return this.getSportName(topSportId);
  }

  getBannerBackground(): string {
    const sportName = this.getFavoriteSportName();
    
    const defaultGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    
    if (!sportName) {
      return defaultGradient;
    }

    const sportBackgrounds: { [key: string]: string } = {
      'Foci': 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55',
      'Futás': 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8',
      'Kosárlabda': 'https://images.unsplash.com/photo-1546519638-68e109498ffc',
      'Tenisz': 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0',
      'Úszás': 'https://images.unsplash.com/photo-1530549387789-4c1017266635',
      'Kerékpározás': 'https://images.unsplash.com/photo-1517649763962-0c623066013b',
      'Röplabda': 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1',
      'Tollaslabda': 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea',
      'Asztalitenisz': 'https://images.unsplash.com/photo-1676827613262-5fba25cee5fd',
      'Jóga': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b',
      'Fitnesz': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48',
      'Túrázás': 'https://images.unsplash.com/photo-1551632811-561732d1e306',
      'Evezés': 'https://images.unsplash.com/photo-1642933196504-62107dac9258',
      'Golf': 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa',
      'Síelés': 'https://images.unsplash.com/photo-1551524559-8af4e6624178',
      'Görkorcsolya': 'https://images.unsplash.com/photo-1661977597199-2a1b25e5d5b2',
      'Harcművészet': 'https://images.unsplash.com/photo-1555597673-b21d5c935865',
      'Crossfit': 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3',
      'Kézilabda': 'https://images.unsplash.com/photo-1587384474964-3a06ce1ce699',
      'Vízilabda': 'https://images.unsplash.com/photo-1675064276064-a6c5f50c4cb7',
      'Atlétika': 'https://images.unsplash.com/photo-1538146888063-3ecf5e002d7c',
      'Cselgáncs': 'https://images.unsplash.com/photo-1515025617920-e1e674b5033c',
      'Baseball': 'https://images.unsplash.com/photo-1529768167801-9173d94c2a42',
      'Amerikaifoci': 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390',
      'Rögbi': 'https://images.unsplash.com/photo-1558151507-c1aa3d917dbb',
      'Bowling': 'https://plus.unsplash.com/premium_photo-1679321795564-f73ec1c21fcd',
      'Dart': 'https://images.unsplash.com/photo-1579019163248-e7761241d85a',
      'Sakk': 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b',
      'Pilates': 'https://images.unsplash.com/photo-1518611012118-696072aa579a',
      'Kajak-kenu': 'https://plus.unsplash.com/premium_photo-1661893427047-16f6ddc173f6',
    };

    let imageUrl = sportBackgrounds[sportName] || 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211';
    
    imageUrl = `${imageUrl}?auto=format&fit=crop&w=1920&q=80`;

    return `linear-gradient(to bottom, rgba(30, 41, 59, 0.3) 0%, rgba(255, 255, 255, 0) 40%, rgba(255, 255, 255, 0.9) 85%, rgba(255, 255, 255, 1) 100%), url('${imageUrl}?auto=format&fit=crop&w=1920&q=80')`;
  }
}
