import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { User, UserSportPreference } from '../../../core/models/models';

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
  loading = true;
  errorMessage = '';

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadSportPreferences();
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
        this.sportPreferences = preferences;
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
