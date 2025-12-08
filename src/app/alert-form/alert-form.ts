// src/app/alert-form/alert-form.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Data } from '../data';
import { ToastService } from '../toast/toast.service';
import { Alert } from '../models'; //

@Component({
  standalone: true,
  selector: 'app-alert-form',
  templateUrl: './alert-form.html',
  styleUrl: './alert-form.css',
  imports: [CommonModule, FormsModule],
})
export class AlertForm {
  private data = inject(Data);
  private toastService = inject(ToastService);

  alertData: Partial<Alert> & { message: string; priority: 'low' | 'medium' | 'high' } = {
    message: '',
    priority: 'medium', // Default priority
    createdBy: 'Admin',
  };
  async submitAlert() {
    if (!this.alertData.message) {
      this.toastService.warning('Alert message cannot be empty.');
      return;
    }

    try {
      const alertId = await this.data.issueAlert(this.alertData);
      this.toastService.success(`Police alert issued successfully!`);
      // Clear form after success
      this.alertData.message = '';
      this.alertData.priority = 'medium';
    } catch (e) {
      console.error('Error issuing alert:', e);
      this.toastService.error('Failed to issue alert. Please try again.');
    }
  }
}
