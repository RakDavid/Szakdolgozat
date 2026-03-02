// User models
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  bio?: string;
  profile_picture?: string;
  phone_number?: string;
  default_latitude?: number;
  default_longitude?: number;
  default_location_name?: string;
  default_search_radius: number;
  sport_preferences?: UserSportPreference[];
  created_events_count?: number;
  participated_events_count?: number;
  organizer_rating?: number;
  date_joined: string;
  created_at: string;
  updated_at: string;
}

export interface UserRegistration {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
}

export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  bio?: string;
  profile_picture?: File;
  phone_number?: string;
  default_latitude?: number;
  default_longitude?: number;
  default_location_name?: string;
  default_search_radius?: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
  message: string;
}

export interface ChangePassword {
  old_password: string;
  new_password: string;
  new_password2: string;
}

// Sport Type models
export interface SportType {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  is_active: boolean;
  created_at: string;
}

// User Sport Preference models
export interface UserSportPreference {
  id: number;
  sport_type: number;
  sport_type_detail?: SportType;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  interest_level: number;
  created_at: string;
  updated_at: string;
}

export interface CreateUserSportPreference {
  sport_type: number;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  interest_level: number;
}

// Event models
export interface SportEvent {
  id: number;
  title: string;
  description: string;
  sport_type: number;
  sport_type_detail?: SportType;
  creator: number;
  creator_detail?: User;
  start_date_time: string;
  end_date_time?: string;
  duration_minutes?: number;
  location_name: string;
  location_address?: string;
  latitude: number;
  longitude: number;
  max_participants: number;
  min_participants: number;
  difficulty: 'easy' | 'medium' | 'hard';
  is_public: boolean;
  requires_approval: boolean;
  is_free: boolean;
  price?: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  notes?: string;
  is_full: boolean;
  available_spots: number;
  is_past: boolean;
  participants?: EventParticipant[];
  images?: EventImage[];
  primary_image?: string;
  participants_count?: number;
  distance?: number;
  recommendation_score?: number;
  average_rating?: number;
  user_participation_status?: {
    status: string;
    joined_at: string;
    can_cancel: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateSportEvent {
  title: string;
  description: string;
  sport_type: number;
  start_date_time: string;
  end_date_time?: string;
  duration_minutes?: number;
  location_name: string;
  location_address?: string;
  latitude: number;
  longitude: number;
  max_participants: number;
  min_participants: number;
  difficulty: 'easy' | 'medium' | 'hard';
  is_public: boolean;
  requires_approval: boolean;
  is_free: boolean;
  price?: number;
  notes?: string;
}

// Event Participant models
export interface EventParticipant {
  id: number;
  user: number;
  user_detail?: User;
  status: 'pending' | 'confirmed' | 'cancelled' | 'rejected';
  joined_at: string;
  confirmed_at?: string;
  notes?: string;
  rating?: number;
  feedback?: string;
}

export interface JoinEvent {
  notes?: string;
}

export interface UpdateParticipantStatus {
  status: 'confirmed' | 'rejected' | 'cancelled';
}

export interface RateEvent {
  rating: number;
  feedback?: string;
}

// Event Image models
export interface EventImage {
  id: number;
  image: string;
  caption?: string;
  is_primary: boolean;
  uploaded_at: string;
}

// API Response wrappers
export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface ApiError {
  error?: string;
  detail?: string;
  [key: string]: any;
}

// Query params for filtering
export interface EventFilterParams {
  sport_type?: number;
  status?: string;
  difficulty?: string;
  is_free?: boolean;
  creator?: number;
  search?: string;
  user_lat?: number;
  user_lng?: number;
  radius?: number;
  start_date_from?: string;
  start_date_to?: string;
  ordering?: string;
  page?: number;
}

// Location helper
export interface Location {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}
