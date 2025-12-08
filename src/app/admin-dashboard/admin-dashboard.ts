import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService, Report } from '../report.service';
import { Observable } from 'rxjs';
import { ToastService } from '../toast/toast.service';

@Component({
  standalone: true,
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css'],
  imports: [CommonModule, FormsModule],
})
export class AdminDashboard implements OnInit {
  private reportService = inject(ReportService);
  private toastService = inject(ToastService);

  // Active view: 'pending' or 'approved'
  activeView: 'pending' | 'approved' = 'pending';

  // Observable for pending reports
  pendingReports$: Observable<Report[]> = this.reportService.getPendingReports();

  // Observable for approved reports
  approvedReports$: Observable<Report[]> = this.reportService.getApprovedReports();

  // Filtering for approved reports
  approvedFilterPriority: 'all' | 'high' | 'medium' | 'low' = 'all';
  approvedFilterSearch: string = '';

  ngOnInit(): void {
    // Component initialization
  }

  // Switch between views
  switchView(view: 'pending' | 'approved'): void {
    this.activeView = view;
  }

  // Filter approved reports by priority
  filterByPriority(reports: Report[]): Report[] {
    if (this.approvedFilterPriority === 'all') {
      return reports;
    }
    return reports.filter((r) => r.priority === this.approvedFilterPriority);
  }

  // Filter approved reports by search term
  filterBySearch(reports: Report[]): Report[] {
    if (!this.approvedFilterSearch.trim()) {
      return reports;
    }
    const search = this.approvedFilterSearch.toLowerCase();
    return reports.filter(
      (r) =>
        r.description?.toLowerCase().includes(search) ||
        r.barangay?.toLowerCase().includes(search) ||
        r.street?.toLowerCase().includes(search) ||
        r.reporterName?.toLowerCase().includes(search),
    );
  }

  // Apply all filters to approved reports
  getFilteredApprovedReports(reports: Report[]): Report[] {
    let filtered = this.filterByPriority(reports);
    filtered = this.filterBySearch(filtered);
    return filtered;
  }

  // Reset filters
  resetFilters(): void {
    this.approvedFilterPriority = 'all';
    this.approvedFilterSearch = '';
  }

  // Approve a report
  approveReport(reportId: string): void {
    if (confirm('Are you sure you want to accept this report for publication?')) {
      this.reportService.approveReport(reportId);
      this.toastService.success('Report accepted and published to user dashboard');
    }
  }

  // Delete a report
  deleteReport(reportId: string): void {
    if (confirm('Are you sure you want to delete this report permanently?')) {
      this.reportService.deleteReport(reportId);
      this.toastService.success('Report deleted successfully');
    }
  }

  // Delete approved report (removes from user dashboard)
  deleteApprovedReport(reportId: string): void {
    if (
      confirm(
        'This will permanently delete this approved report and remove it from the user dashboard and map. Continue?',
      )
    ) {
      this.reportService.deleteReport(reportId);
      this.toastService.success('Approved report deleted successfully');
    }
  }

  // trackBy helper for ngFor
  trackById(index: number, item: Report): string {
    return item?.id ?? index.toString();
  }
}
