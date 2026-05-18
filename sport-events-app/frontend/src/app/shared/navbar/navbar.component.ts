import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { User } from '../../core/models/models';
import { environment } from '../../../environments/environment';

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
  unreadCount = 0;
  showNotifications = false;
  notifications: any[] = [];

  constructor(
    public authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.notificationService.startPolling();
      }
    });

    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
    });
  }

  /**
   * Megnyitja vagy bezárja az értesítési panelt, és ha megnyílik, betölti az értesítéseket.
   */
  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.isMenuOpen = false;
      this.isProfileMenuOpen = false;
      this.loadNotifications();
    }
  }

  /**
   * Lekéri a legújabb értesítéseket a szerverről a panel számára.
   */
  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe(notifs => {
      this.notifications = notifs.slice(0, 10);
    });
  }

  /**
   * Az összes értesítést olvasottnak jelöli a szerveren és frissíti a helyi listát.
   */
  markAllRead(): void {
    this.notificationService.markAllRead().subscribe(() => {
      this.notifications = this.notifications.map(n => ({ ...n, is_read: true }));
    });
  }

  /**
   * Kezeli az értesítésre történő kattintást: olvasottnak jelöli és átirányít az adott eseményre.
   */
  onNotifClick(notif: any): void {
    if (!notif.is_read) {
      this.notificationService.markRead(notif.id).subscribe(() => {
        notif.is_read = true;
      });
    }
    if (notif.related_event_id) {
      this.showNotifications = false;
      this.router.navigate(['/events', notif.related_event_id]);
    }
  }

  /**
   * Megnyitja vagy bezárja a mobil nézetű navigációs menüt.
   */
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) {
      this.isProfileMenuOpen = false;
    }
  }

  /**
   * Megnyitja vagy bezárja a lenyíló profilmenüt.
   */
  toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
    if (this.isProfileMenuOpen) {
      this.isMenuOpen = false;
    }
  }

  /**
   * Bezárja az összes aktív legördülő menüt és értesítési panelt.
   */
  closeMenus(): void {
    this.isMenuOpen = false;
    this.isProfileMenuOpen = false;
    this.showNotifications = false;
  }

  /**
   * Kijelentkezteti a felhasználót és bezárja a megnyitott menüket.
   */
  logout(): void {
    this.authService.logout();
    this.closeMenus();
  }

  /**
   * Visszaadja a felhasználó profilképének teljes URL-jét, kezelve a relatív útvonalakat.
   */
  getProfileImageUrl(): string {
    if (!this.currentUser || !this.currentUser.profile_picture) return '';
    
    const pic = this.currentUser.profile_picture;
    
    if (pic.startsWith('http')) {
      return pic;
    }
    
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${pic}`;
  }

  /**
   * Monogramot generál a felhasználó vezeték- és keresztnevéből (vagy felhasználónevéből) a profilkép helyett.
   */
  getUserInitials(): string {
    if (!this.currentUser) return '';
    const firstInitial = this.currentUser.first_name?.charAt(0) || '';
    const lastInitial = this.currentUser.last_name?.charAt(0) || '';
    const initials = (lastInitial + firstInitial).toUpperCase();
    
    if (initials) return initials;
    
    return this.currentUser.username?.charAt(0)?.toUpperCase() || '?';
  }
}