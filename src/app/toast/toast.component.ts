// src/app/toast/toast.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class]="'toast-' + toast.type" (click)="dismiss(toast.id)">
          <div class="toast-icon">
            @switch (toast.type) {
              @case ('success') {
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              }
              @case ('error') {
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              }
              @case ('warning') {
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                  ></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              }
              @case ('info') {
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              }
            }
          </div>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" (click)="dismiss(toast.id); $event.stopPropagation()">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-container {
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 400px;
      }

      .toast {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        border-radius: 12px;
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.15),
          0 4px 12px rgba(0, 0, 0, 0.1);
        cursor: pointer;
        animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .toast-success {
        background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        color: white;
      }

      .toast-error {
        background: linear-gradient(135deg, #c41e3a 0%, #ef4444 100%);
        color: white;
      }

      .toast-warning {
        background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
        color: white;
      }

      .toast-info {
        background: linear-gradient(135deg, #1a2a5e 0%, #2563eb 100%);
        color: white;
      }

      .toast-icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .toast-message {
        flex: 1;
        font-size: 0.95rem;
        font-weight: 500;
        line-height: 1.4;
      }

      .toast-close {
        flex-shrink: 0;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        border-radius: 6px;
        padding: 4px;
        cursor: pointer;
        color: inherit;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .toast-close:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      @media (max-width: 480px) {
        .toast-container {
          left: 12px;
          right: 12px;
          max-width: none;
        }
      }
    `,
  ],
})
export class ToastComponent {
  toastService = inject(ToastService);

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}
