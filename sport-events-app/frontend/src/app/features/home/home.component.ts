import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { EventService } from '../../core/services/event.service';
import { SportEvent } from '../../core/models/models';
import { MapComponent } from '../../shared/map/map.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MapComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  isAuthenticated = false;
  upcomingEvents: SportEvent[] = [];
  recommendedEvents: SportEvent[] = [];
  loading = false;

  features = [
    {
      icon: '🗺️',
      title: 'Térképes keresés',
      description: 'Találd meg a közeli sportpályákat és eseményeket egyszerűen'
    },
    {
      icon: '🎯',
      title: 'Személyre szabott ajánlatok',
      description: 'Kapj értesítéseket a kedvenc sportágaidról'
    },
    {
      icon: '👥',
      title: 'Közösségi szervezés',
      description: 'Csatlakozz vagy szervezz sportrendezvényeket'
    },
    {
      icon: '⚡',
      title: 'Gyors jelentkezés',
      description: 'Egyetlen kattintással jelentkezz eseményekre'
    }
  ];

  constructor(
    public authService: AuthService,
    private eventService: EventService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isAuthenticated();

    if (this.isAuthenticated) {
      this.loadRecommendedEvents();
    } else {
      this.loadUpcomingEvents();
    }
  }

  loadUpcomingEvents(): void {
    this.loading = true;
    this.eventService.getEvents({ 
      status: 'upcoming',
      ordering: 'start_date_time'
    }).subscribe({
      next: (response) => {
        this.upcomingEvents = response.results.slice(0, 6);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading events', error);
        this.loading = false;
      }
    });
  }

  loadRecommendedEvents(): void {
    this.loading = true;
    this.eventService.getRecommendedEvents().subscribe({
      next: (events) => {
        this.recommendedEvents = events.slice(0, 6);
        this.loading = false;
        
        // Ha nincs elég ajánlott esemény, töltsük fel közelgőkkel
        if (this.recommendedEvents.length === 0) {
          this.loadUpcomingEvents();
        }
      },
      error: (error) => {
        console.error('Error loading recommended events', error);
        // Hiba esetén fallback: közelgő események
        this.loadUpcomingEvents();
      }
    });
  }

  navigateToEvents(): void {
    this.router.navigate(['/events']);
  }

  navigateToCreateEvent(): void {
    this.router.navigate(['/create-event']);
  }

  getEventDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getEventTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('hu-HU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}
