// src/app/emergency-call/emergency-call.ts

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { take, Subscription } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-emergency-call',
  templateUrl: './emergency-call.html',
  styleUrl: './emergency-call.css',
  imports: [CommonModule],
})
export class EmergencyCallComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Call state
  isCallActive = false;
  isMuted = false;
  isSpeakerOn = true;
  callDuration = 0;
  callDisplayTime = '0:00';
  callerImage = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop';
  callerName = '911 Emergency Services';
  callerStatus = 'Calling 911…';

  private callTimerSubscription: Subscription | null = null;
  private callTimer: any;

  ngOnInit(): void {
    // Check if user is signed in
    this.authService.currentUser$.pipe(take(1)).subscribe((user) => {
      if (!user) {
        // Redirect to login if not authenticated
        this.router.navigate(['/login']);
        return;
      }

      // Start the call interface
      this.initializeCall();
    });
  }

  ngOnDestroy(): void {
    this.endCall();
  }

  private initializeCall(): void {
    this.isCallActive = true;
    this.callDuration = 0;
    this.updateCallTime();

    // Start call timer
    this.callTimer = setInterval(() => {
      this.callDuration++;
      this.updateCallTime();
    }, 1000);
  }

  private updateCallTime(): void {
    const minutes = Math.floor(this.callDuration / 60);
    const seconds = this.callDuration % 60;
    this.callDisplayTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
  }

  toggleSpeaker(): void {
    this.isSpeakerOn = !this.isSpeakerOn;
  }

  volumeUp(): void {
    // Visual feedback only - demo purposes
    console.log('Volume increased');
  }

  volumeDown(): void {
    // Visual feedback only - demo purposes
    console.log('Volume decreased');
  }

  addCall(): void {
    // Demo: Show add call action
    console.log('Add call action');
  }

  holdCall(): void {
    // Demo: Toggle hold state
    console.log('Hold call toggled');
  }

  viewContacts(): void {
    // Demo: View contacts
    console.log('View contacts');
  }

  endCall(): void {
    if (this.callTimer) {
      clearInterval(this.callTimer);
    }
    this.isCallActive = false;
    this.callDuration = 0;
    this.isMuted = false;
    this.isSpeakerOn = true;
    this.callDisplayTime = '0:00';

    // Navigate back to dashboard
    this.router.navigate(['/dashboard']);
  }
}
