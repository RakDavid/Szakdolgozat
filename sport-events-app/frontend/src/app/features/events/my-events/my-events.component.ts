import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { SportEvent, EventParticipant } from '../../../core/models/models';
import { MapComponent } from '../../../shared/map/map.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-my-events',
  standalone: true,
  imports: [CommonModule, RouterModule, MapComponent],
  templateUrl: './my-events.component.html',
  styleUrls: ['./my-events.component.css']
})
export class MyEventsComponent implements OnInit {
  createdEvents: SportEvent[] = [];
  participatingEvents: SportEvent[] = [];
  pendingRequests: Array<{ event: SportEvent; participant: EventParticipant }> = [];

  loading = true;
  pendingLoading = false;
  activeTab: 'created' | 'participating' | 'pending' = 'created';

  approvingId: number | null = null;
  rejectingId: number | null = null;
  successMessage = '';
  errorMessage = '';

  constructor(private eventService: EventService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;

    forkJoin({
      myEvents: this.eventService.getMyEvents(),
      participations: this.eventService.getMyParticipations()
    }).subscribe({
      next: ({ myEvents, participations }) => {
        this.createdEvents = myEvents.results.filter(e => this.isEventActive(e));
        this.participatingEvents = participations.results.filter(e => this.isEventActive(e));
        
        this.loading = false;
        this.loadPendingRequests();
      },
      error: (err) => {
        console.error('Error loading events', err);
        this.loading = false;
      }
    });
  }


  private isEventActive(event: SportEvent): boolean {
    const now = new Date();
    
    if (event.end_date_time) {
      return new Date(event.end_date_time) >= now;
    }
    
    const eventEnd = new Date(event.start_date_time);
    eventEnd.setMinutes(eventEnd.getMinutes() + (event.duration_minutes || 180));
    
    return eventEnd >= now;
  }

  loadPendingRequests(): void {
    this.pendingRequests = [];

    if (this.createdEvents.length === 0) {
      this.pendingLoading = false;
      return;
    }

    this.pendingLoading = true;

    const requests = this.createdEvents.map(event =>
      this.eventService.getEventParticipants(event.id).pipe(
        catchError(() => of({ results: [] as EventParticipant[], count: 0, next: null, previous: null }))
      )
    );

    forkJoin(requests).subscribe({
      next: (responses) => {
        this.pendingRequests = [];
        responses.forEach((response, index) => {
          const event = this.createdEvents[index];
          const pending = response.results.filter(p => p.status === 'pending');
          pending.forEach(participant => {
            this.pendingRequests.push({ event, participant });
          });
        });
        this.pendingLoading = false;
      },
      error: () => {
        this.pendingLoading = false;
      }
    });
  }

  switchTab(tab: 'created' | 'participating' | 'pending'): void {
    this.activeTab = tab;
    this.successMessage = '';
    this.errorMessage = '';
    if (tab === 'pending') {
      this.loadPendingRequests();
    }
  }

  approveParticipant(eventId: number, participantId: number): void {
    this.approvingId = participantId;
    this.eventService.manageParticipant(eventId, participantId, { status: 'confirmed' }).subscribe({
      next: () => {
        this.successMessage = 'Résztvevő jóváhagyva!';
        this.approvingId = null;
        this.removePendingRequest(participantId);
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => {
        this.errorMessage = 'Hiba a jóváhagyás során.';
        this.approvingId = null;
      }
    });
  }

  rejectParticipant(eventId: number, participantId: number): void {
    if (!confirm('Biztosan elutasítod ezt a kérést?')) return;
    this.rejectingId = participantId;
    this.eventService.manageParticipant(eventId, participantId, { status: 'rejected' }).subscribe({
      next: () => {
        this.successMessage = 'Kérés elutasítva.';
        this.rejectingId = null;
        this.removePendingRequest(participantId);
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => {
        this.errorMessage = 'Hiba az elutasítás során.';
        this.rejectingId = null;
      }
    });
  }

  private removePendingRequest(participantId: number): void {
    this.pendingRequests = this.pendingRequests.filter(r => r.participant.id !== participantId);
  }

  getEventDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
  }

  getEventTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
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

  getDifficultyLabel(difficulty: string): string {
    const labels: { [key: string]: string } = {
      'easy': 'Kezdő',
      'medium': 'Közepes',
      'hard': 'Haladó'
    };
    return labels[difficulty] || difficulty;
  }
}