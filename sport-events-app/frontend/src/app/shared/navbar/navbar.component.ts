import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
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

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.isMenuOpen = false;
      this.isProfileMenuOpen = false;
      this.loadNotifications();
    }
  }

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe(notifs => {
      this.notifications = notifs.slice(0, 10);
    });
  }

  markAllRead(): void {
    this.notificationService.markAllRead().subscribe(() => {
      this.notifications = this.notifications.map(n => ({ ...n, is_read: true }));
    });
  }

  onNotifClick(notif: any): void {
    // Ha még olvasatlan, jelöljük olvasottnak és csökkentsük a badge-et
    if (!notif.is_read) {
      this.notificationService.markRead(notif.id).subscribe(() => {
        notif.is_read = true;
      });
    }
    // Ha van kapcsolódó esemény, navigáljunk oda és zárjuk be a dropdownt
    if (notif.related_event_id) {
      this.showNotifications = false;
      this.router.navigate(['/events', notif.related_event_id]);
    }
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
    this.showNotifications = false;
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