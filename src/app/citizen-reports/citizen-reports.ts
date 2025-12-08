import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService, Report } from '../report.service';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-citizen-reports',
  templateUrl: './citizen-reports.html',
  styleUrls: ['./citizen-reports.css'],
  imports: [CommonModule, FormsModule],
})
export class CitizenReports implements OnInit {
  private reportService = inject(ReportService);

  searchQuery = new BehaviorSubject<string>('');

  private allApprovedReports$ = this.reportService.getAllReports().pipe(
    map((reports) => reports.filter((r) => r.status === 'approved')),
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

  // trackBy helper for *ngFor
  trackById(index: number, item: any): string | number {
    return item?.id ?? index;
  }

  onSearchChange(query: string): void {
    this.searchQuery.next(query);
  }

  clearSearch(): void {
    this.searchQuery.next('');
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
