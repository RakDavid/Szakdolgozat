import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EventService } from '../../../core/services/event.service';
import { SportEvent } from '../../../core/models/models';
import { MapComponent } from '../../../shared/map/map.component';

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
  loading = true;
  activeTab: 'created' | 'participating' = 'created';

  constructor(private eventService: EventService) {}

  ngOnInit(): void {
    this.loadMyEvents();
    this.loadParticipatingEvents();
  }

  loadMyEvents(): void {
    this.eventService.getMyEvents().subscribe({
      next: (response) => {
        console.log('API response:', response);
        this.createdEvents = response.results; // ← itt a lényeg
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading my events', error);
        this.loading = false;
      }
    });
  }

  loadParticipatingEvents(): void {
    this.eventService.getMyParticipations().subscribe({
      next: (response) => {
        this.participatingEvents = response.results; // ← szintén itt
      },
      error: (error) => {
        console.error('Error loading participating events', error);
      }
    });
  }

  switchTab(tab: 'created' | 'participating'): void {
    this.activeTab = tab;
  }

  getEventDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', { 
      month: 'short', 
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
