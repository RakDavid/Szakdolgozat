import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../../core/services/event.service';
import { MapComponent } from '../../../shared/map/map.component';
import { AuthService } from '../../../core/services/auth.service';
import { SportEvent, EventParticipant } from '../../../core/models/models';
import { ToastService } from '../../../core/services/toast.service';

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
  joinNotes = '';
  showJoinForm = false;

  ratingValue: number = 0;
  feedbackText: string = '';
  isSubmittingRating: boolean = false;
  ratingSuccess: boolean = false;
  ratingError: string = '';
  selectedRating: number = 0;
  ratingFeedback: string = '';

  currentUserId: number | null = null;
  isCreator = false;

  hasFriends = false;
  friendsCount: number | null = null;

  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmIcon = '❓';
  confirmButtonText = 'Igen';
  confirmButtonClass = 'btn-danger';
  confirmAction: () => void = () => {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private authService: AuthService,
    private toastService: ToastService
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
        event.latitude = Number(event.latitude);
        event.longitude = Number(event.longitude);
        this.event = event;
        this.isCreator = event.creator === this.currentUserId;
        this.loading = false;
      },
      error: (error) => {
        this.toastService.showError('Az esemény betöltése sikertelen.');
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

    const extraGuests = this.hasFriends ? (this.friendsCount || 1) : 0;
    const totalJoining = 1 + extraGuests;

    if (totalJoining > this.event.available_spots) {
      this.toastService.showError(`Nincs elég hely! Csak ${this.event.available_spots} szabad hely maradt.`);
      return;
    }

    this.joining = true;

    const payload = { 
      notes: this.joinNotes,
      extra_guests: extraGuests
    };

    this.eventService.joinEvent(this.event.id, payload).subscribe({
      next: (response) => {
        this.toastService.showSuccess('Sikeresen jelentkeztél az eseményre!');
        this.showJoinForm = false;
        
        if (this.event) {
          const isPending = this.event.requires_approval;
          
          this.event.user_participation_status = {
            status: isPending ? 'pending' : 'confirmed',
            joined_at: new Date().toISOString(),
            can_cancel: true
          };

          if (!isPending) {
            this.event.participants_count = (this.event.participants_count || 0) + totalJoining;
            this.event.available_spots -= totalJoining;
            if (this.event.available_spots <= 0) {
              this.event.is_full = true;
            }
          }
        }

        this.joinNotes = '';
        this.hasFriends = false;
        this.friendsCount = null;
        
        this.loadEventDetails(this.event!.id);
        this.loadParticipants(this.event!.id);
        this.joining = false;
      },
      error: (error) => {
        console.error('Error joining event', error);
        this.toastService.showError(error.error?.error || error.error?.[0] || 'Sikertelen jelentkezés.');
        this.joining = false;
      }
    });
  }

  leaveEvent(): void {
    if (!this.event) return;

    this.openConfirmModal(
      'Részvétel lemondása',
      'Biztosan le szeretnéd mondani a részvételt ezen az eseményen?',
      '🚪',
      'Lemondás',
      'btn-outline-danger',
      () => {
        this.leaving = true;
        this.eventService.leaveEvent(this.event!.id).subscribe({
          next: () => {
            this.toastService.showSuccess('Sikeresen lemondtad a részvételt.');
            
            this.event!.user_participation_status = null;
            
            this.loadEventDetails(this.event!.id);
            this.loadParticipants(this.event!.id);
            this.leaving = false;
          },
          error: (error) => {
            console.error('Error leaving event', error);
            this.toastService.showError(error.error?.error || 'Sikertelen lemondás.');
            this.leaving = false;
          }
        });
      }
    );
  }

  editEvent(): void {
    if (this.event) {
      this.router.navigate(['/events', this.event.id, 'edit']);
    }
  }

 deleteEvent(): void {
    if (!this.event) return;

    this.openConfirmModal(
      'Esemény törlése',
      'Biztosan törölni szeretnéd az eseményt? Ez a művelet nem vonható vissza.',
      '🗑️',
      'Törlés',
      'btn-danger',
      () => {
        this.eventService.deleteEvent(this.event!.id).subscribe({
          next: () => {
            this.toastService.showSuccess('Az esemény sikeresen törölve lett.');
            this.event!.status = 'cancelled';

          },
          error: (error) => {
            console.error('Error deleting event', error);
            this.toastService.showError('Az esemény törlése sikertelen.');
          }
        });
      }
    );
  }

 canJoinEvent(): boolean {
    if (!this.event) return false;
    if (this.isCreator) return false;
    if (this.event.is_full || this.event.is_past || this.event.status !== 'upcoming') {
      return false;
    }
    if (this.event.user_participation_status) {
      const status = this.event.user_participation_status.status;
      if (status === 'cancelled' || status === 'rejected') {
        return true;
      }
      return false;
    }
    return true;
  }

  canRateEvent(): boolean {
    if (!this.event || this.isCreator) return false;

    const myParticipation = this.participants.find(p => {
      const participantUserId = typeof p.user === 'object' ? (p.user as any).id : p.user;
      return participantUserId === this.currentUserId;
    });

    const isConfirmed = myParticipation?.status === 'confirmed';
    
    return isConfirmed && this.isEventFinishedOrStarted && !this.hasRated();
  }

  canLeaveEvent(): boolean {
    return (this.event?.user_participation_status?.can_cancel && !this.event?.is_past) || false;
  }

    get pendingParticipants() {
    return this.participants.filter(p => p.status === 'pending');
  }

 approveParticipant(participantId: number): void {
    if (!this.event) return;
    const participantToApprove = this.participants.find(p => p.id === participantId);
    const extraGuests = participantToApprove?.extra_guests || 0;
    const totalApproved = 1 + extraGuests;

    this.eventService.manageParticipant(this.event.id, participantId, { status: 'confirmed' })
      .subscribe({
        next: () => {
          this.toastService.showSuccess('Résztvevő jóváhagyva!');
          if (this.event) {
            this.event.participants_count = (this.event.participants_count || 0) + totalApproved;
            this.event.available_spots = (this.event.available_spots || 0) - totalApproved;
            
            if (this.event.available_spots <= 0) {
              this.event.is_full = true;
            }
          }
          this.loadEventDetails(this.event!.id);
          this.loadParticipants(this.event!.id);
        },
        error: (err) => this.toastService.showError('Hiba a jóváhagyás során.')
      });
  }

 rejectParticipant(participantId: number): void {
    if (!this.event) return;
    
    this.openConfirmModal(
      'Kérés elutasítása',
      'Biztosan elutasítod ezt a jelentkezést?',
      '❌',
      'Elutasítás',
      'btn-danger',
      () => {
        this.eventService.manageParticipant(this.event!.id, participantId, { status: 'rejected' })
          .subscribe({
            next: () => {
              this.toastService.showSuccess('Kérés elutasítva.');
              this.loadParticipants(this.event!.id);
            },
            error: (err) => this.toastService.showError('Hiba az elutasítás során.')
          });
      }
    );
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

  formatShortAddress(address: string | undefined): string {
    if (!address) return '';
    
    const parts = address.split(',');
    
    if (parts.length > 2) {
      return parts.slice(0, 2).join(',').trim();
    }
    
    return address;
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

  getDynamicBackground(sportName: string | undefined): string {
    let imageUrl = 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211';

    if (sportName) {
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

      if (sportBackgrounds[sportName]) {
        imageUrl = sportBackgrounds[sportName];
      }
    }

    return `linear-gradient(rgba(26, 32, 44, 0.7), rgba(45, 55, 72, 0.8)), url('${imageUrl}?auto=format&fit=crop&w=1920&q=80')`;
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

  setRating(val: number): void {
    this.selectedRating = val;
  }

  get isEventFinishedOrStarted(): boolean {
    return this.event?.status === 'ongoing' || this.event?.status === 'completed' || !!this.event?.is_past;
  }

  hasRated(): boolean {
    if (!this.event || !this.currentUserId) return false;
    
    const myParticipant = this.participants.find(p => {
      const participantUserId = typeof p.user === 'object' ? (p.user as any).id : p.user;
      return participantUserId === this.currentUserId;
    });
    
    return !!(myParticipant && myParticipant.rating);
  }

 submitRating(): void {
    if (!this.event) return;
    if (this.selectedRating < 1 || this.selectedRating > 5) return;
    
    this.isSubmittingRating = true;
    
    this.eventService.rateEvent(this.event.id, this.selectedRating, this.ratingFeedback).subscribe({
      next: () => {
        this.isSubmittingRating = false;
        this.toastService.showSuccess('Köszönjük az értékelést!'); 
        
        this.loadEventDetails(this.event!.id);
        this.loadParticipants(this.event!.id);
        
        this.selectedRating = 0;
        this.ratingFeedback = '';
      },
      error: (err) => {
        this.isSubmittingRating = false;
        this.toastService.showError(err.error?.detail || err.error?.error || 'Hiba történt az értékelés során.'); 
      }
    });
  }

  openConfirmModal(title: string, message: string, icon: string, btnText: string, btnClass: string, action: () => void) {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmIcon = icon;
    this.confirmButtonText = btnText;
    this.confirmButtonClass = btnClass;
    this.confirmAction = action;
    this.showConfirmModal = true;
  }

  cancelConfirm() {
    this.showConfirmModal = false;
  }

  executeConfirm() {
    this.showConfirmModal = false;
    this.confirmAction();
  }
}
