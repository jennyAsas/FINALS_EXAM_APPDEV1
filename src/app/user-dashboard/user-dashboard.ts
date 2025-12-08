import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService, Report } from '../report.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe, DatePipe, FormsModule],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.css',
})
export class UserDashboard {
  private reportService = inject(ReportService);

  // Search and filter state
  searchTerm = '';
  filterPriority: 'all' | 'high' | 'medium' | 'low' = 'all';
  filterBarangay = '';
  uniqueBarangays: Set<string> = new Set();

  // Subscribe to all reports and filter for approved ones
  approvedReports$: Observable<Report[]> = this.reportService.getAllReports().pipe(
    map((reports) => {
      const approved = reports.filter((r) => r.status === 'approved');
      // Extract unique barangays for filter dropdown
      this.uniqueBarangays = new Set(approved.map((r) => r.barangay).filter((b) => b));
      return approved;
    }),
  );

  // Convert Set to array for template
  get barangayList(): string[] {
    return Array.from(this.uniqueBarangays);
  }

  // Get filtered reports
  getFilteredReports(reports: Report[]): Report[] {
    let filtered = reports;

    // Filter by search term
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.description.toLowerCase().includes(search) ||
          r.street?.toLowerCase().includes(search) ||
          r.barangay?.toLowerCase().includes(search) ||
          r.reporterName?.toLowerCase().includes(search),
      );
    }

    // Filter by priority
    if (this.filterPriority !== 'all') {
      filtered = filtered.filter((r) => r.priority === this.filterPriority);
    }

    // Filter by barangay
    if (this.filterBarangay) {
      filtered = filtered.filter((r) => r.barangay === this.filterBarangay);
    }

    return filtered;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filterPriority = 'all';
    this.filterBarangay = '';
  }
}
