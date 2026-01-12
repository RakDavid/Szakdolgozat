import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/models';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  currentUser: User | null = null;
  isMenuOpen = false;
  isProfileMenuOpen = false;

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Felhasználó figyelése
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) {
      this.isProfileMenuOpen = false;
    }
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
    if (this.isProfileMenuOpen) {
      this.isMenuOpen = false;
    }
  }

  closeMenus(): void {
    this.isMenuOpen = false;
    this.isProfileMenuOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.closeMenus();
  }

  getUserInitials(): string {
    if (!this.currentUser) return '';
    
    const firstInitial = this.currentUser.first_name?.charAt(0) || '';
    const lastInitial = this.currentUser.last_name?.charAt(0) || '';
    
    return (firstInitial + lastInitial).toUpperCase() || this.currentUser.username.charAt(0).toUpperCase();
  }
}
