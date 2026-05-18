import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { SportEvent, EventParticipant } from '../../../core/models/models';
import { MapComponent } from '../../../shared/map/map.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '../../../core/services/toast.service';

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

  constructor(private eventService: EventService, private toastService: ToastService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  /**
   * Párhuzamosan lekéri a felhasználó által létrehozott eseményeket és a csatlakozásait.
   */
  loadAll(): void {
    this.loading = true;

    forkJoin({
      myEvents: this.eventService.getMyEvents(),
      participations: this.eventService.getMyParticipations()
    }).subscribe({
      next: ({ myEvents, participations }) => {
        const createdList = Array.isArray(myEvents) ? myEvents : (myEvents.results || []);
        const partList = Array.isArray(participations) ? participations : (participations.results || []);

        this.createdEvents = createdList.filter(e => e.status === 'upcoming' || e.status === 'ongoing');
        
        this.participatingEvents = partList.filter(e => e.status === 'upcoming' || e.status === 'ongoing');
        
        this.loading = false;
        this.loadPendingRequests();
      },
      error: (err) => {
        console.error('Hiba az események betöltése közben', err);
        this.loading = false;
      }
    });
  }

  /**
   * Megvizsgálja, hogy a megadott esemény még aktív-e (nem járt-e le).
   */
  private isEventActive(event: SportEvent): boolean {
    const now = new Date();
    
    if (event.end_date_time) {
      return new Date(event.end_date_time) >= now;
    }
    
    const eventEnd = new Date(event.start_date_time);
    eventEnd.setMinutes(eventEnd.getMinutes() + (event.duration_minutes || 180));
    
    return eventEnd >= now;
  }

  /**
   * Lekéri a saját eseményekhez tartozó, még jóváhagyásra váró jelentkezéseket.
   */
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

  /**
   * Vált a különböző nézetek (fülek) között és szükség esetén betölti az adatokat.
   */
  switchTab(tab: 'created' | 'participating' | 'pending'): void {
    this.activeTab = tab;
    this.successMessage = '';
    this.errorMessage = '';
    if (tab === 'pending') {
      this.loadPendingRequests();
    }
  }

  /**
   * Jóváhagy egy adott jelentkezést a saját eseményre.
   */
  approveParticipant(eventId: number, participantId: number): void {
    this.approvingId = participantId;
    
    this.eventService.manageParticipant(eventId, participantId, { status: 'confirmed' }).subscribe({
      next: () => {
        this.toastService.showSuccess('Résztvevő jóváhagyva!');
        
        this.approvingId = null;
        this.removePendingRequest(participantId);
      },
      error: () => {
        this.toastService.showError('Hiba a jóváhagyás során.');
        this.approvingId = null;
      }
    });
  }

  /**
   * Elutasít egy adott jelentkezést a saját eseményre egy megerősítést követően.
   */
  rejectParticipant(eventId: number, participantId: number): void {
    if (!confirm('Biztosan elutasítod ezt a kérést?')) return;
    
    this.rejectingId = participantId;
    
    this.eventService.manageParticipant(eventId, participantId, { status: 'rejected' }).subscribe({
      next: () => {
        this.toastService.showSuccess('Kérés elutasítva.');
        this.rejectingId = null;
        this.removePendingRequest(participantId);
      },
      error: () => {
        this.toastService.showError('Hiba az elutasítás során.');
        this.rejectingId = null;
      }
    });
  }

  /**
   * Eltávolít egy jóváhagyott vagy elutasított jelentkezést a várakozó listából.
   */
  private removePendingRequest(participantId: number): void {
    this.pendingRequests = this.pendingRequests.filter(r => r.participant.id !== participantId);
  }

  /**
   * Formázott magyar dátumot készít (hónap, nap) az ISO dátumsztringből.
   */
  getEventDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
  }

  /**
   * Formázott időpontot készít (óra, perc) az ISO dátumsztringből.
   */
  getEventTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Visszaadja az esemény státuszának olvasható, magyar megfelelőjét.
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'upcoming': 'Közelgő',
      'ongoing': 'Folyamatban',
      'completed': 'Befejezett',
      'cancelled': 'Törölve'
    };
    return labels[status] || status;
  }

  /**
   * Visszaadja a nehézségi szint olvasható, magyar megfelelőjét.
   */
  getDifficultyLabel(difficulty: string): string {
    const labels: { [key: string]: string } = {
      'easy': 'Kezdő',
      'medium': 'Közepes',
      'hard': 'Haladó'
    };
    return labels[difficulty] || difficulty;
  }
}