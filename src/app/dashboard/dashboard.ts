import { Component, OnInit, OnDestroy, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { ReportService, Report } from '../report.service';
import { NotificationService } from '../notification.service';
import { AnimationService } from '../animation.service';
import { Observable, Subscription, interval, BehaviorSubject, combineLatest } from 'rxjs';
import { map, take, debounceTime, startWith } from 'rxjs/operators';
import { ToastService } from '../toast/toast.service';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  imports: [CommonModule, RouterModule],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private authService = inject(AuthService);
  private reportService = inject(ReportService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private animationService = inject(AnimationService);
  private toastService = inject(ToastService);
  private sosSubscription?: Subscription;

  currentUser$ = this.authService.currentUser$;
  isAdmin$ = this.authService.isAdmin$;

  // Saved reports (stored in localStorage)
  savedReports: Set<string> = new Set();
  private readonly SAVED_REPORTS_KEY = 'mountain_sentinel_saved_reports';

  // Citizen reports (non-admin)
  citizenReports$: Observable<Report[]> = this.reportService
    .getAllReports()
    .pipe(
      map((reports) =>
        reports.filter(
          (r) => r.status === 'approved' && !r.isAdminReport && r.reporterId !== 'ADMIN',
        ),
      ),
    );

  // UI state for filtering/searching reports
  private filter$ = new BehaviorSubject<string>('all');
  private search$ = new BehaviorSubject<string>('');
  currentFilter: string = 'all';
  filteredReports$: Observable<Report[]> = combineLatest([
    this.citizenReports$,
    this.filter$.pipe(startWith('all')),
    this.search$.pipe(debounceTime(150), startWith('')),
  ]).pipe(
    map(([reports, filter, search]) => {
      const term = (search || '').trim().toLowerCase();
      return reports.filter((r) => {
        // filter by priority
        if (filter && filter !== 'all') {
          if ((r.priority || 'low') !== filter) return false;
        }
        // search match against description, reporterName, street, barangay
        if (!term) return true;
        const hay = (
          (r.description || '') +
          ' ' +
          (r.reporterName || '') +
          ' ' +
          (r.street || '') +
          ' ' +
          (r.barangay || '')
        ).toLowerCase();
        return hay.indexOf(term) !== -1;
      });
    }),
  );

  // Admin alerts/announcements
  adminAlerts$: Observable<Report[]> = this.reportService
    .getAllReports()
    .pipe(
      map((reports) =>
        reports.filter(
          (r) => r.status === 'approved' && (r.isAdminReport || r.reporterId === 'ADMIN'),
        ),
      ),
    );

  // Legacy - keep for compatibility
  approvedReports$: Observable<Report[]> = this.reportService
    .getAllReports()
    .pipe(map((reports) => reports.filter((r) => r.status === 'approved')));

  // SOS Animation state
  sosActive = false;
  sosSuccess = false;
  sosProgress = 0;
  sosCountdown = 5;
  private sosDuration = 5; // 5 seconds animation
  userLocation: { lat: number; lng: number } | null = null;
  locationError: string | null = null;

  ngOnInit(): void {
    // Load saved reports from localStorage
    this.loadSavedReports();
  }

  private loadSavedReports(): void {
    try {
      const saved = localStorage.getItem(this.SAVED_REPORTS_KEY);
      if (saved) {
        this.savedReports = new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load saved reports:', e);
    }
  }

  private persistSavedReports(): void {
    try {
      localStorage.setItem(this.SAVED_REPORTS_KEY, JSON.stringify([...this.savedReports]));
    } catch (e) {
      console.warn('Failed to save reports:', e);
    }
  }

  isReportSaved(reportId: string): boolean {
    return this.savedReports.has(reportId);
  }

  toggleSaveReport(event: Event, reportId: string): void {
    event.stopPropagation();

    if (this.savedReports.has(reportId)) {
      this.savedReports.delete(reportId);
      this.toastService.info('Report removed from saved items');
    } else {
      this.savedReports.add(reportId);
      this.toastService.success('Report saved successfully!');
    }
    this.persistSavedReports();
  }

  async shareReport(event: Event, report: Report): Promise<void> {
    event.stopPropagation();

    const shareData = {
      title: 'Safety Alert - Mountain Sentinel',
      text: `${report.description}\n📍 ${report.street}, ${report.barangay}`,
      url: `${window.location.origin}/report-detail/${report.id}`,
    };

    try {
      // Check if Web Share API is supported
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        this.toastService.success('Shared successfully!');
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(shareData.url);
        this.toastService.success('Link copied to clipboard!');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // User didn't cancel, try clipboard fallback
        try {
          await navigator.clipboard.writeText(shareData.url);
          this.toastService.success('Link copied to clipboard!');
        } catch {
          this.toastService.error('Unable to share. Please copy the link manually.');
        }
      }
    }
  }

  ngOnDestroy(): void {
    // Clean up observers to prevent memory leaks
    this.animationService.destroyScrollObserver();
    if (this.sosSubscription) {
      this.sosSubscription.unsubscribe();
    }
  }

  navigateToReport(): void {
    this.router.navigate(['/report']);
  }

  viewFullMap(): void {
    this.router.navigate(['/map']);
  }

  triggerSOS(): void {
    // Check if user is logged in first
    this.authService.currentUser$.pipe(take(1)).subscribe((user) => {
      if (!user) {
        this.toastService.warning('Please log in to send an emergency SOS alert.');
        this.router.navigate(['/login']);
        return;
      }

      // Navigate to emergency call interface for demonstration
      this.router.navigate(['/emergency-call']);
    });
  }

  private getLocationAsync(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          console.log('Location obtained:', this.userLocation);
        },
        (error) => {
          console.warn('Location error:', error.message);
          this.locationError = error.message;
          // Try with lower accuracy as fallback
          navigator.geolocation.getCurrentPosition(
            (position) => {
              this.userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              console.log('Location obtained (low accuracy):', this.userLocation);
            },
            (err) => {
              console.error('Location failed completely:', err.message);
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
          );
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      );
    }
  }

  private completeSOS(user: any): void {
    // Use the location that was obtained during animation, or try one more time
    if (this.userLocation) {
      this.sendSOSToAdmin(user, this.userLocation);
    } else if (navigator.geolocation) {
      // Final attempt to get location
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          this.sendSOSToAdmin(user, location);
        },
        () => {
          // Location not available, send without it
          console.warn('Could not obtain location for SOS');
          this.sendSOSToAdmin(user);
        },
        { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 },
      );
    } else {
      this.sendSOSToAdmin(user);
    }
  }

  private sendSOSToAdmin(user: any, location?: { lat: number; lng: number }): void {
    // Send emergency SOS alert to admin
    this.reportService.sendEmergencySOS(
      user.email || 'emergency-user@sos.alert',
      user.displayName || 'Unknown User',
      location,
    );

    // Show success state
    this.sosSuccess = true;

    // Play success sound/vibration if available
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  }

  closeSosOverlay(): void {
    this.sosActive = false;
    this.sosSuccess = false;
    this.sosProgress = 0;
    this.sosCountdown = this.sosDuration;

    // Navigate to notifications to see the SOS confirmation
    this.router.navigate(['/notification'], { queryParams: { sos: 'sent' } });
  }

  viewReportDetail(reportId: string): void {
    this.router.navigate(['/report-detail', reportId]);
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

  // Called from template to update filter/search
  setFilter(value: string): void {
    this.currentFilter = value;
    this.filter$.next(value);
  }

  onSearch(term: string): void {
    this.search$.next(term || '');
  }
}
