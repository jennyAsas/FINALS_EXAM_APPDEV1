import { Component, inject, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterModule } from '@angular/router';
import { CommonModule, AsyncPipe } from '@angular/common';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { AnimationService } from './animation.service';
import { ToastComponent } from './toast/toast.component';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterModule, AsyncPipe, ToastComponent],
  template: `
    <app-toast></app-toast>
    <header class="app-header">
      <!-- Left Side: Hamburger + Logo + Title (grouped together) -->
      <div class="header-brand-group">
        <button
          class="nav-hamburger-btn"
          (click)="toggleNavMenu()"
          [class.active]="navMenuOpen"
          aria-label="Navigation menu"
        >
          <span class="nav-hamburger-line"></span>
          <span class="nav-hamburger-line"></span>
          <span class="nav-hamburger-line"></span>
        </button>
        <div class="logo-area">
          <div class="logo-badge">BCPO</div>
        </div>
        <h1 class="app-title">BAGUIO FINEST</h1>
      </div>

      <!-- Navigation Slide-out Menu -->
      <div
        class="nav-slide-menu"
        [class.open]="navMenuOpen"
        [class.admin-menu]="authService.isAdmin$ | async"
      >
        <div class="nav-slide-header">
          <span>{{ (authService.isAdmin$ | async) ? 'Admin Panel' : 'Navigation' }}</span>
          <button class="nav-close-btn" (click)="closeNavMenu()">&times;</button>
        </div>

        <!-- ADMIN Navigation -->
        <ng-container *ngIf="authService.isAdmin$ | async">
          <a
            routerLink="/"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            (click)="closeNavMenu()"
            class="nav-slide-item"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            Home
          </a>
          <a
            routerLink="/admin-dashboard"
            routerLinkActive="active"
            (click)="closeNavMenu()"
            class="nav-slide-item admin-item"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
            </svg>
            Admin Dashboard
          </a>
          <a
            routerLink="/admin-report"
            routerLinkActive="active"
            (click)="closeNavMenu()"
            class="nav-slide-item admin-item"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              />
            </svg>
            Issue Alert
          </a>
          <a
            routerLink="/notification"
            routerLinkActive="active"
            (click)="closeNavMenu()"
            class="nav-slide-item admin-item sos-item"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
              />
            </svg>
            SOS Notifications
            <span
              *ngIf="sosCount$ | async as count"
              class="nav-badge sos-badge"
              [class.hidden]="count === 0"
              >{{ count }}</span
            >
          </a>
          <a
            routerLink="/map"
            routerLinkActive="active"
            (click)="closeNavMenu()"
            class="nav-slide-item admin-item"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"
              />
            </svg>
            Incident Map
          </a>
        </ng-container>

        <!-- CITIZEN Navigation -->
        <ng-container *ngIf="!(authService.isAdmin$ | async)">
          <a
            routerLink="/"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            (click)="closeNavMenu()"
            class="nav-slide-item"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            Home
          </a>
          <a
            routerLink="/safety-feed"
            routerLinkActive="active"
            (click)="closeNavMenu()"
            class="nav-slide-item police-alerts-item"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
            Police Alerts
          </a>
          <a
            routerLink="/notification"
            routerLinkActive="active"
            (click)="closeNavMenu()"
            class="nav-slide-item"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"
              />
            </svg>
            Notifications
            <span
              *ngIf="unreadCount$ | async as count"
              class="nav-badge"
              [class.hidden]="count === 0"
              >{{ count }}</span
            >
          </a>
          <a
            routerLink="/report"
            routerLinkActive="active"
            (click)="handleNavReportClick($event)"
            class="nav-slide-item"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"
              />
            </svg>
            Submit Report
          </a>
        </ng-container>
      </div>
      <div class="nav-menu-overlay" [class.open]="navMenuOpen" (click)="closeNavMenu()"></div>

      <!-- Right Side: Role Badge + Navigation Buttons + Profile -->
      <div class="header-right">
        <!-- Profile Avatar with Dropdown -->
        <ng-container *ngIf="authService.currentUser$ | async as user; else loginBtn">
          <!-- Role Badge before Navigation Buttons -->
          <div class="user-role-indicator" [class.admin-indicator]="authService.isAdmin$ | async">
            <span class="role-text">{{
              (authService.isAdmin$ | async) ? 'ADMIN' : 'CITIZEN'
            }}</span>
          </div>

          <!-- Navigation Action Buttons (Citizen Only) -->
          <ng-container *ngIf="!(authService.isAdmin$ | async)">
            <div class="header-nav-buttons">
              <!-- Police Reports Button -->
              <button
                class="header-nav-btn"
                (click)="navigateToPoliceReports()"
                title="Police Reports"
                aria-label="View Police Reports"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                </svg>
                <span class="header-nav-label">Police Reports</span>
              </button>

              <!-- Incident Map Button -->
              <button
                class="header-nav-btn"
                (click)="navigateToMap()"
                title="Incident Map"
                aria-label="View Incident Map"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span class="header-nav-label">Map</span>
              </button>

              <!-- Emergency SOS Button -->
              <button
                class="header-nav-btn sos-btn-header"
                (click)="triggerEmergencySOS()"
                title="Emergency SOS"
                aria-label="Trigger Emergency SOS"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polygon
                    points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"
                  ></polygon>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span class="header-nav-label">SOS</span>
              </button>
            </div>
          </ng-container>

          <div class="profile-dropdown" (click)="toggleProfileMenu()">
            <div class="profile-avatar">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                />
              </svg>
            </div>
            <div class="profile-menu" [class.open]="profileMenuOpen">
              <a routerLink="/profile" class="profile-menu-item" (click)="closeProfileMenu()">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                  />
                </svg>
                My Profile
              </a>
              <button class="profile-menu-item logout-item" (click)="logout(); closeProfileMenu()">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </ng-container>

        <ng-template #loginBtn>
          <a routerLink="/login" routerLinkActive="active" class="login-link" (click)="closeMenu()">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
              />
            </svg>
            Login
          </a>
        </ng-template>
      </div>
    </header>

    <main class="app-main">
      <router-outlet></router-outlet>
    </main>

    <!-- Authentication Prompt Modal -->
    @if (showAuthPrompt) {
      <div class="modal-overlay" (click)="closeAuthPrompt()">
        <div class="auth-prompt-modal" (click)="$event.stopPropagation()">
          <button class="close-btn" (click)="closeAuthPrompt()" aria-label="Close">&times;</button>
          <div class="modal-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2>Authentication Required</h2>
          <p class="modal-message">
            You need to create an account or sign in before you can submit a safety alert.
          </p>
          <p class="modal-submessage">
            Creating an account helps us verify reports and keep the community safe.
          </p>
          <div class="modal-actions">
            <button class="modal-btn primary-btn" (click)="navigateToLogin()">
              Sign In / Sign Up
            </button>
            <button class="modal-btn secondary-btn" (click)="closeAuthPrompt()">Cancel</button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './app.css',
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  title = 'Mountain Sentinel';
  protected authService = inject(AuthService);
  protected notificationService = inject(NotificationService);
  private animationService = inject(AnimationService);
  private router = inject(Router);
  unreadCount$: Observable<number>;
  sosCount$: Observable<number>;
  showAuthPrompt = false;
  menuOpen = false;
  profileMenuOpen = false;
  navMenuOpen = false;

  constructor() {
    this.unreadCount$ = this.notificationService.getUnreadCount();
    this.sosCount$ = this.notificationService.getSOSCount();
  }

  ngOnInit(): void {
    // Initialize scroll reveal animations
    this.animationService.initScrollRevealObserver();

    // Initialize parallax effects
    this.animationService.initParallaxEffect();
  }

  ngAfterViewInit(): void {
    // Add ripple effects to all buttons
    const buttons = document.querySelectorAll('button:not(.hamburger-btn)');
    buttons.forEach((button) => {
      this.animationService.addRippleEffect(button as HTMLElement);
    });
  }

  ngOnDestroy(): void {
    // Clean up animations on component destroy
    this.animationService.destroyScrollObserver();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    this.profileMenuOpen = false;
    this.navMenuOpen = false;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  toggleNavMenu(): void {
    this.navMenuOpen = !this.navMenuOpen;
    this.menuOpen = false;
    this.profileMenuOpen = false;
  }

  closeNavMenu(): void {
    this.navMenuOpen = false;
  }

  handleNavReportClick(event: Event): void {
    this.closeNavMenu();
    this.handleReportClick(event);
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  closeProfileMenu(): void {
    this.profileMenuOpen = false;
  }

  handleReportClick(event: Event): void {
    // Check if user is logged in using take(1) for immediate value
    this.authService.currentUser$.pipe(take(1)).subscribe((user) => {
      if (!user) {
        // User is not logged in, prevent navigation and show modal
        event.preventDefault();
        this.showAuthPrompt = true;
      }
      // If user is logged in, allow normal navigation (do nothing)
    });
  }

  closeAuthPrompt(): void {
    this.showAuthPrompt = false;
  }

  navigateToLogin(): void {
    this.showAuthPrompt = false;
    this.router.navigate(['/login']);
  }

  logout(): void {
    this.authService.logout();
  }

  navigateToPoliceReports(): void {
    this.router.navigate(['/safety-feed']);
    this.closeProfileMenu();
  }

  navigateToMap(): void {
    this.router.navigate(['/map']);
    this.closeProfileMenu();
  }

  triggerEmergencySOS(): void {
    this.router.navigate(['/dashboard']);
    this.closeProfileMenu();
    // The SOS functionality is handled within the dashboard component
  }
}
