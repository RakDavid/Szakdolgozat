import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  errorMessage = '';
  returnUrl = '/';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Ha már be van jelentkezve, átirányítjuk
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    }

    // Return URL lekérése (ahova vissza kell térni sikeres login után)
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';

    // Form inicializálása
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        console.log('Login successful', response);
        this.router.navigate([this.returnUrl]);
      },
      error: (error) => {
        console.error('Login error', error);
        this.errorMessage = error.error?.error || 'Hibás felhasználónév vagy jelszó.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
