// src/app/sos-button/sos-button.ts

import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { ToastService } from '../toast/toast.service';
import { firstValueFrom, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-sos-button',
  templateUrl: './sos-button.html',
  styleUrl: './sos-button.css',
  imports: [CommonModule],
})
export class SosButton {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  showDialer = signal(false);
  dialedNumber = signal('');
  isDialing = signal(false);
  showFakeCall = signal(false);
  callTimer = signal('00:00');
  private callStartTime: number = 0;
  private timerInterval: any = null;

  // Observable to check if user is logged in
  isLoggedIn$: Observable<boolean> = new Observable((observer) => {
    this.auth.currentUser$.subscribe((user) => {
      observer.next(!!user);
    });
  });

  // Simulate 911 dial interface
  dialerPad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#'],
  ];

  triggerSos(): void {
    // Check if user is logged in
    firstValueFrom(this.auth.currentUser$).then((user) => {
      if (!user) {
        this.toastService.warning('You must be logged in to use SOS. Redirecting to login...');
        this.router.navigate(['/login']);
        return;
      }

      // Show the 911 simulator dial
      this.showDialer.set(true);
    });
  }

  dialNumber(num: string): void {
    if (this.dialedNumber().length < 3) {
      // Limit to 911 dialing
      this.dialedNumber.update((val) => val + num);
    }
  }

  clearDial(): void {
    this.dialedNumber.set('');
  }

  backspace(): void {
    this.dialedNumber.update((val) => val.slice(0, -1));
  }

  async call(): Promise<void> {
    const number = this.dialedNumber();
    if (number === '911') {
      this.isDialing.set(true);
      this.toastService.info('Connecting to emergency services...');

      // Simulate dialing animation for 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Show fake call screen instead of alert
      this.showDialer.set(false);
      this.showFakeCall.set(true);
      this.callStartTime = Date.now();

      // Start timer
      this.startCallTimer();
    } else {
      this.toastService.warning('Only 911 can be dialed in this simulator');
    }
  }

  private startCallTimer(): void {
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      this.callTimer.set(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      );
    }, 1000);
  }

  hangUp(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.showFakeCall.set(false);
    this.isDialing.set(false);
    this.callTimer.set('00:00');
    this.clearDial();
    this.toastService.info('Emergency call ended.');
  }

  closeDialer(): void {
    this.showDialer.set(false);
    this.clearDial();
  }
}
