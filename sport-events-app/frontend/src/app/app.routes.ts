import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

// Lazy loading komponensek
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { HomeComponent } from './features/home/home.component';
import { EventListComponent } from './features/events/event-list/event-list.component';
import { EventDetailComponent } from './features/events/event-detail/event-detail.component';
import { EventCreateComponent } from './features/events/event-create/event-create.component';
import { MyEventsComponent } from './features/events/my-events/my-events.component';
import { ProfileViewComponent } from './features/profile/profile-view/profile-view.component';
import { ProfileEditComponent } from './features/profile/profile-edit/profile-edit.component';

export const routes: Routes = [
  // Public routes
  {
    path: '',
    component: HomeComponent,
    title: 'SportEvents - Főoldal'
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Bejelentkezés - SportEvents'
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Regisztráció - SportEvents'
  },

  // Protected routes (authentication required)
  {
    path: 'events',
    component: EventListComponent,
    canActivate: [AuthGuard],
    title: 'Események - SportEvents'
  },
  {
    path: 'events/:id',
    component: EventDetailComponent,
    canActivate: [AuthGuard],
    title: 'Esemény részletei - SportEvents'
  },
  {
    path: 'create-event',
    component: EventCreateComponent,
    canActivate: [AuthGuard],
    title: 'Új esemény - SportEvents'
  },
  {
    path: 'events/:id/edit',
    component: EventCreateComponent,
    canActivate: [AuthGuard],
    title: 'Esemény szerkesztése - SportEvents'
  },
  {
    path: 'my-events',
    component: MyEventsComponent,
    canActivate: [AuthGuard],
    title: 'Saját események - SportEvents'
  },
  {
    path: 'profile',
    component: ProfileViewComponent,
    canActivate: [AuthGuard],
    title: 'Profilom - SportEvents'
  },
  {
    path: 'users/:id',
    component: ProfileViewComponent,
    canActivate: [AuthGuard],
    title: 'Felhasználói profil - SportEvents'
  },
  {
    path: 'profile/edit',
    component: ProfileEditComponent,
    canActivate: [AuthGuard],
    title: 'Profil szerkesztése - SportEvents'
  },

  // Wildcard route - 404
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
