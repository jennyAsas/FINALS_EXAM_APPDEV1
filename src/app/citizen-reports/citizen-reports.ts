import { Component, inject, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReportService, Report } from '../report.service';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, startWith, tap } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-citizen-reports',
  templateUrl: './citizen-reports.html',
  styleUrls: ['./citizen-reports.css'],
  imports: [CommonModule, FormsModule, RouterModule],
})
export class CitizenReports implements OnInit, AfterViewInit {
  private reportService = inject(ReportService);
  private router = inject(Router);

  @ViewChild('reportsWrapper', { static: false }) reportsWrapper?: ElementRef;

  searchQuery = new BehaviorSubject<string>('');

  private allApprovedReports$ = this.reportService.getAllReports().pipe(
    map((reports) => reports.filter((r) => r.status === 'approved')),
    tap(() => this.scrollToTop()), // Scroll to top whenever reports update
  );

  // Combine search query with reports for real-time filtering
  filteredReports$: Observable<Report[]> = combineLatest([
    this.allApprovedReports$,
    this.searchQuery.pipe(startWith('')),
  ]).pipe(
    map(([reports, query]) => {
      if (!query.trim()) {
        return reports;
      }

      const lowerQuery = query.toLowerCase();
      return reports.filter((report) => {
        const description = (report.description || '').toLowerCase();
        const street = (report.street || '').toLowerCase();
        const barangay = (report.barangay || '').toLowerCase();
        const landmark = (report.landmark || '').toLowerCase();
        const reporterName = (report.reporterName || '').toLowerCase();
        const createdAt = (report.createdAt || '').toString().toLowerCase();

        return (
          description.includes(lowerQuery) ||
          street.includes(lowerQuery) ||
          barangay.includes(lowerQuery) ||
          landmark.includes(lowerQuery) ||
          reporterName.includes(lowerQuery) ||
          createdAt.includes(lowerQuery)
        );
      });
    }),
  );

  ngOnInit(): void {
    // Initialize component
  }

  ngAfterViewInit(): void {
    // Ensure scroll to top on initial load
    setTimeout(() => this.scrollToTop(), 100);
  }

  private scrollToTop(): void {
    // Scroll the reports wrapper to the top
    if (this.reportsWrapper) {
      this.reportsWrapper.nativeElement.scrollTop = 0;
    }
    
    // Also scroll the window/page to top
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  // trackBy helper for *ngFor
  trackById(index: number, item: any): string | number {
    return item?.id ?? index;
  }

  onSearchChange(query: string): void {
    this.searchQuery.next(query);
    // Scroll to top when search changes
    setTimeout(() => this.scrollToTop(), 50);
  }

  clearSearch(): void {
    this.searchQuery.next('');
    // Scroll to top when search is cleared
    setTimeout(() => this.scrollToTop(), 50);
  }

  viewMap(): void {
    // Navigate to map view
    this.router.navigate(['/map']);
  }

  triggerSOS(): void {
    // Trigger SOS action
    console.log('SOS triggered');
    // You can add the actual SOS logic here
  }

  getPriorityClass(priority?: string): string {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return 'priority-low';
    }
  }

  getPriorityLabel(priority?: string): string {
    return (priority || 'low').toUpperCase();
  }
}
