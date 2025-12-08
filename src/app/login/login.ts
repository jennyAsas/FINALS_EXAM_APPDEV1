import { Component, inject, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { AnimationService } from '../animation.service';
import { ToastService } from '../toast/toast.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
  imports: [CommonModule, FormsModule],
})
export class Login implements OnInit, AfterViewInit, OnDestroy {
  private authService = inject(AuthService);
  private animationService = inject(AnimationService);
  private toastService = inject(ToastService);
  tab: 'unified' | 'signup' = 'unified';

  // Unified login form fields
  email = '';
  password = '';
  displayName = '';
  confirmPassword = '';
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading = false;

  // Password visibility states
  showLoginPassword = false;
  showSignupPassword = false;
  showConfirmPassword = false;

  ngOnInit(): void {
    // Default to unified login tab
    this.tab = 'unified';
  }

  setTab(tab: 'unified' | 'signup') {
    this.tab = tab;
    // Clear errors and fields when switching tabs
    this.errorMessage = null;
    this.successMessage = null;
  }

  async onSubmitLogin(): Promise<void> {
    this.errorMessage = null;
    this.isLoading = true;
    try {
      // Unified login - works for both admin and regular users
      // AuthService automatically detects role and redirects accordingly
      await this.authService.login(this.email, this.password);
      this.toastService.success('Login successful! Welcome back.');
    } catch (error: any) {
      this.errorMessage = error.message || 'Login failed. Please check your credentials.';
      this.toastService.error(this.errorMessage || 'Login failed');
    } finally {
      this.isLoading = false;
    }
  }

  async onSubmitSignup(): Promise<void> {
    this.errorMessage = null;
    this.successMessage = null;
    this.isLoading = true;
    try {
      if (this.password !== this.confirmPassword) {
        this.errorMessage = 'Passwords do not match.';
        this.toastService.error('Passwords do not match.');
        this.isLoading = false;
        return;
      }
      if (this.password.length < 6) {
        this.errorMessage = 'Password must be at least 6 characters.';
        this.toastService.error('Password must be at least 6 characters.');
        this.isLoading = false;
        return;
      }
      await this.authService.register(this.email, this.password, this.displayName || undefined);
      this.successMessage = 'Account created successfully! Redirecting...';
      this.toastService.success('Account created successfully! Welcome to Baguio Finest.');
      this.clearForm();
    } catch (error: any) {
      this.errorMessage = error.message || 'Signup failed.';
      this.toastService.error(this.errorMessage || 'Signup failed');
    } finally {
      this.isLoading = false;
    }
  }

  private clearForm(): void {
    this.email = '';
    this.password = '';
    this.displayName = '';
    this.confirmPassword = '';
  }

  // Social login methods
  async loginWithGoogle(): Promise<void> {
    this.errorMessage = null;
    this.isLoading = true;
    try {
      await this.authService.loginWithGoogle();
      this.toastService.success('Google login successful! Welcome.');
    } catch (error: any) {
      this.errorMessage = error.message || 'Google login failed. Please try again.';
      this.toastService.error(this.errorMessage || 'Google login failed');
    } finally {
      this.isLoading = false;
    }
  }

  async loginWithFacebook(): Promise<void> {
    this.errorMessage = null;
    this.isLoading = true;
    try {
      await this.authService.loginWithFacebook();
      this.toastService.success('Facebook login successful! Welcome.');
    } catch (error: any) {
      this.errorMessage = error.message || 'Facebook login failed. Please try again.';
      this.toastService.error(this.errorMessage || 'Facebook login failed');
    } finally {
      this.isLoading = false;
    }
  }

  ngAfterViewInit(): void {
    // Initialize scroll animations and parallax effects
    this.animationService.initScrollRevealObserver();
    this.animationService.initParallaxEffect();

    // Add ripple effects to all buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button) => {
      this.animationService.addRippleEffect(button);
    });
  }

  togglePasswordVisibility(field: 'login' | 'signup' | 'confirm'): void {
    if (field === 'login') {
      this.showLoginPassword = !this.showLoginPassword;
    } else if (field === 'signup') {
      this.showSignupPassword = !this.showSignupPassword;
    } else if (field === 'confirm') {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  ngOnDestroy(): void {
    // Clean up observers to prevent memory leaks
    this.animationService.destroyScrollObserver();
  }
}
