import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReportService, Report } from '../report.service';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-police-issuance-reports',
  templateUrl: './police-issuance-reports.html',
  styleUrl: './police-issuance-reports.css',
  imports: [CommonModule, AsyncPipe, FormsModule, RouterModule],
})
export class PoliceIssuanceReports implements OnInit {
  private reportService = inject(ReportService);

  searchQuery = new BehaviorSubject<string>('');
  selectedPriority = new BehaviorSubject<string>('all');

  // Get only admin-issued (police) reports that are approved
  private allPoliceReports$ = this.reportService
    .getAllReports()
    .pipe(map((reports) => reports.filter((r) => r.isAdminReport && r.status === 'approved')));

  // Combine filters with reports for real-time filtering
  filteredReports$: Observable<Report[]> = combineLatest([
    this.allPoliceReports$,
    this.searchQuery.pipe(startWith('')),
    this.selectedPriority.pipe(startWith('all')),
  ]).pipe(
    map(([reports, query, priority]) => {
      let filtered = reports;

      // Filter by priority
      if (priority !== 'all') {
        filtered = filtered.filter((r) => r.priority === priority);
      }

      // Filter by search query
      if (query.trim()) {
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter((report) => {
          const description = (report.description || '').toLowerCase();
          const street = (report.street || '').toLowerCase();
          const barangay = (report.barangay || '').toLowerCase();
          const landmark = (report.landmark || '').toLowerCase();

          return (
            description.includes(lowerQuery) ||
            street.includes(lowerQuery) ||
            barangay.includes(lowerQuery) ||
            landmark.includes(lowerQuery)
          );
        });
      }

      // Sort by date (newest first)
      return filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }),
  );

  ngOnInit(): void {
    // Initialize component
  }

  onSearchChange(query: string): void {
    this.searchQuery.next(query);
  }

  clearSearch(): void {
    this.searchQuery.next('');
  }

  onPriorityChange(priority: string): void {
    this.selectedPriority.next(priority);
  }

  getPriorityClass(priority: string | undefined): string {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return 'priority-medium';
    }
  }

  getPriorityLabel(priority: string | undefined): string {
    switch (priority) {
      case 'high':
        return 'Urgent';
      case 'medium':
        return 'Important';
      case 'low':
        return 'Advisory';
      default:
        return 'Alert';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}
