import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminDashboard } from './admin-dashboard';
import { ReportService } from '../report.service';

describe('AdminDashboard', () => {
  let component: AdminDashboard;
  let fixture: ComponentFixture<AdminDashboard>;

  beforeEach(async () => {
    const mockReportService = {
      getPendingReports: () => of([]),
      getApprovedReports: () => of([]),
      approveReport: (id: string) => {},
      deleteReport: (id: string) => {},
    };

    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [{ provide: ReportService, useValue: mockReportService }],
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
