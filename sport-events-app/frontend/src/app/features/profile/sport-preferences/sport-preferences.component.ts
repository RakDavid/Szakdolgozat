import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface SportType {
  id: number;
  name: string;
  icon: string;
}

interface SportPreference {
  id?: number;
  sport_type: number;
  sport_type_name?: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  interest_level: number;
}

@Component({
  selector: 'app-sport-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sport-preferences.component.html',
  styleUrls: ['./sport-preferences.component.css']
})
export class SportPreferencesComponent implements OnInit {

  sports: SportType[] = [];
  preferences: SportPreference[] = [];
  selectedSports: Set<number> = new Set();
  saving = false;
  loading = true;
  saveSuccess = false;

  // AI-alapú beállítás
  aiDescription = '';
  aiLoading = false;
  aiSuggestions: SportPreference[] = [];
  showAiPanel = false;

  skillLevels = [
    { value: 'beginner', label: 'Kezdő', icon: '🌱' },
    { value: 'intermediate', label: 'Haladó', icon: '⚡' },
    { value: 'advanced', label: 'Profi', icon: '🏆' }
  ];

  // Sport ikonok map
  sportIcons: { [key: string]: string } = {
    'Futás': '🏃',
    'Kerékpározás': '🚴',
    'Úszás': '🏊',
    'Foci': '⚽',
    'Kosárlabda': '🏀',
    'Tenisz': '🎾',
    'Röplabda': '🏐',
    'Tollaslabda': '🏸',
    'Asztalitenisz': '🏓',
    'Jóga': '🧘',
    'Fitnesz': '💪',
    'Túrázás': '🥾',
    'Evezés': '🚣',
    'Golf': '⛳',
    'Síelés': '⛷️',
    'Görkorcsolya': '🛼',
    'Harcművészet': '🥋',
    'Crossfit': '🔥',
  };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadSports();
    this.loadPreferences();
  }

  loadSports() {
    this.http.get<any>('/api/sports/').subscribe({
      next: (res) => {
        const results = res.results || res;
        this.sports = results.map((s: any) => ({
          ...s,
          icon: this.sportIcons[s.name] || '🎯'
        }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadPreferences() {
    this.http.get<any>('/api/sport-preferences/').subscribe({
      next: (res) => {
        this.preferences = res.results || res;
        this.selectedSports = new Set(this.preferences.map((p: SportPreference) => p.sport_type));
      }
    });
  }

  toggleSport(sportId: number) {
    if (this.selectedSports.has(sportId)) {
      this.selectedSports.delete(sportId);
      this.preferences = this.preferences.filter(p => p.sport_type !== sportId);
    } else {
      this.selectedSports.add(sportId);
      this.preferences.push({
        sport_type: sportId,
        skill_level: 'beginner',
        interest_level: 7
      });
    }
  }

  getPreference(sportId: number): SportPreference | undefined {
    return this.preferences.find(p => p.sport_type === sportId);
  }

  setSkillLevel(sportId: number, level: 'beginner' | 'intermediate' | 'advanced') {
    const pref = this.getPreference(sportId);
    if (pref) pref.skill_level = level;
  }

  setInterestLevel(sportId: number, level: number) {
    const pref = this.getPreference(sportId);
    if (pref) pref.interest_level = level;
  }

  getInterestLabel(level: number): string {
    if (level <= 3) return 'Kis érdeklődés';
    if (level <= 6) return 'Közepes';
    if (level <= 8) return 'Nagyon érdekel';
    return 'Szenvedély ❤️';
  }

  savePreferences() {
    this.saving = true;
    this.http.post('/api/sport-preferences/bulk_update/', {
      preferences: this.preferences
    }).subscribe({
      next: () => {
        this.saving = false;
        this.saveSuccess = true;
        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: () => { this.saving = false; }
    });
  }

  // AI segítség
  toggleAiPanel() {
    this.showAiPanel = !this.showAiPanel;
  }

  generateWithAi() {
    if (!this.aiDescription.trim()) return;
    this.aiLoading = true;
    this.aiSuggestions = [];

    this.http.post<any>('/api/sport-preferences/ai_suggest/', {
      description: this.aiDescription
    }).subscribe({
      next: (res) => {
        this.aiSuggestions = res.suggestions || [];
        this.aiLoading = false;
      },
      error: () => { this.aiLoading = false; }
    });
  }

  applyAiSuggestions() {
    this.aiSuggestions.forEach(suggestion => {
      const existing = this.preferences.find(p => p.sport_type === suggestion.sport_type);
      if (existing) {
        existing.skill_level = suggestion.skill_level;
        existing.interest_level = suggestion.interest_level;
      } else {
        this.preferences.push(suggestion);
        this.selectedSports.add(suggestion.sport_type);
      }
    });
    this.showAiPanel = false;
    this.aiSuggestions = [];
    this.aiDescription = '';
  }

  getSportName(sportId: number): string {
    return this.sports.find(s => s.id === sportId)?.name || '';
  }

  getSportIcon(sportId: number): string {
    return this.sports.find(s => s.id === sportId)?.icon || '🎯';
  }
}