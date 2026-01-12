import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  errorMessage = '';
  errors: any = {};

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Ha már be van jelentkezve, átirányítjuk
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    }

    // Form inicializálása
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      phone_number: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password2: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  // Custom validator: jelszavak egyezésének ellenőrzése
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const password2 = control.get('password2');

    if (!password || !password2) {
      return null;
    }

    return password.value === password2.value ? null : { passwordMismatch: true };
  }

  get f() {
    return this.registerForm.controls;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      // Összes mező megérintése, hogy megjelenjenek a hibaüzenetek
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.errors = {};

    this.authService.register(this.registerForm.value).subscribe({
      next: (response) => {
        console.log('Registration successful', response);
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('Registration error', error);
        
        if (error.error) {
          // Backend specifikus hibák kezelése
          if (typeof error.error === 'string') {
            this.errorMessage = error.error;
          } else if (error.error.email) {
            this.errors.email = error.error.email;
          } else if (error.error.username) {
            this.errors.username = error.error.username;
          } else if (error.error.password) {
            this.errors.password = error.error.password;
          } else {
            this.errorMessage = 'A regisztráció sikertelen. Kérlek, próbáld újra.';
          }
        } else {
          this.errorMessage = 'A regisztráció sikertelen. Kérlek, próbáld újra.';
        }
        
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
