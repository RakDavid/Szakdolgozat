import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../../core/services/event.service';
import { MapComponent } from '../../../shared/map/map.component';
import { AuthService } from '../../../core/services/auth.service';
import { SportEvent, EventParticipant } from '../../../core/models/models';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MapComponent],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.css']
})
export class EventDetailComponent implements OnInit {
  event: SportEvent | null = null;
  participants: EventParticipant[] = [];
  loading = true;
  joining = false;
  leaving = false;
  errorMessage = '';
  successMessage = '';
  
  // Join form
  joinNotes = '';
  showJoinForm = false;

  // Current user
  currentUserId: number | null = null;
  isCreator = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.currentUserValue;
    this.currentUserId = currentUser?.id || null;

    const eventId = this.route.snapshot.paramMap.get('id');
    if (eventId) {
      this.loadEventDetails(+eventId);
      this.loadParticipants(+eventId);
    }
  }

  loadEventDetails(eventId: number): void {
    this.loading = true;
    this.eventService.getEventById(eventId).subscribe({
      next: (event) => {
        // 🔥 FONTOS: konvertáljuk number-re
        event.latitude = Number(event.latitude);
        event.longitude = Number(event.longitude);
        console.log(this.participants);
        this.event = event;
        this.isCreator = event.creator === this.currentUserId;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading event', error);
        this.errorMessage = 'Az esemény betöltése sikertelen.';
        this.loading = false;
      }
    });
  }

  loadParticipants(eventId: number): void {
    this.eventService.getEventParticipants(eventId).subscribe({
      next: (participants) => {
        this.participants = participants.results;
      },
      error: (error) => {
        console.error('Error loading participants', error);
      }
    });
  }

  toggleJoinForm(): void {
    this.showJoinForm = !this.showJoinForm;
    this.errorMessage = '';
  }

  joinEvent(): void {
    if (!this.event) return;

    this.joining = true;
    this.errorMessage = '';

    this.eventService.joinEvent(this.event.id, { notes: this.joinNotes }).subscribe({
      next: (response) => {
        this.successMessage = 'Sikeresen jelentkeztél az eseményre!';
        this.showJoinForm = false;
        this.joinNotes = '';
        this.loadEventDetails(this.event!.id);
        this.loadParticipants(this.event!.id);
        this.joining = false;
        
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error joining event', error);
        this.errorMessage = error.error?.error || 'Sikertelen jelentkezés.';
        this.joining = false;
      }
    });
  }

  leaveEvent(): void {
    if (!this.event) return;

    if (!confirm('Biztosan le szeretnéd mondani a részvételt?')) {
      return;
    }

    this.leaving = true;
    this.errorMessage = '';

    this.eventService.leaveEvent(this.event.id).subscribe({
      next: () => {
        this.successMessage = 'Sikeresen lemondtad a részvételt.';
        this.loadEventDetails(this.event!.id);
        this.loadParticipants(this.event!.id);
        this.leaving = false;
        
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error leaving event', error);
        this.errorMessage = error.error?.error || 'Sikertelen lemondás.';
        this.leaving = false;
      }
    });
  }

  editEvent(): void {
    if (this.event) {
      this.router.navigate(['/events', this.event.id, 'edit']);
    }
  }

  deleteEvent(): void {
    if (!this.event) return;

    if (!confirm('Biztosan törölni szeretnéd az eseményt?')) {
      return;
    }

    this.eventService.deleteEvent(this.event.id).subscribe({
      next: () => {
        this.router.navigate(['/my-events']);
      },
      error: (error) => {
        console.error('Error deleting event', error);
        this.errorMessage = 'Az esemény törlése sikertelen.';
      }
    });
  }

  canJoinEvent(): boolean {
    if (!this.event || !this.event.user_participation_status) {
      return !this.event?.is_full && !this.event?.is_past && !this.isCreator;
    }
    return false;
  }

  canLeaveEvent(): boolean {
    return this.event?.user_participation_status?.can_cancel || false;
  }

  getEventDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });
  }

  getEventTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('hu-HU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getDifficultyLabel(difficulty: string): string {
    const labels: { [key: string]: string } = {
      'easy': 'Kezdő',
      'medium': 'Közepes',
      'hard': 'Haladó'
    };
    return labels[difficulty] || difficulty;
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

  getParticipantStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'Függőben',
      'confirmed': 'Megerősítve',
      'cancelled': 'Lemondva',
      'rejected': 'Elutasítva'
    };
    return labels[status] || status;
  }

  getMapUrl(): string {
    if (!this.event) return '';
    return `https://www.google.com/maps/search/?api=1&query=${this.event.latitude},${this.event.longitude}`;
  }
}
