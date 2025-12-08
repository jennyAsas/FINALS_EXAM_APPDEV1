import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Animation Service - Handles scroll-triggered animations and dynamic effects
 * Provides utilities for:
 * - Scroll reveal animations
 * - Parallax effects
 * - Intersection observer setup
 * - Smooth scroll behavior
 */
@Injectable({
  providedIn: 'root'
})
export class AnimationService {
  private observer: IntersectionObserver | null = null;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * Initialize intersection observer for scroll animations
   * Reveals elements with 'scroll-reveal' class as they come into view
   */
  initScrollRevealObserver(): void {
    if (!this.isBrowser) return;

    const options: IntersectionObserverInit = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          this.observer?.unobserve(entry.target);
        }
      });
    }, options);

    // Observe all scroll-reveal elements
    const revealElements = document.querySelectorAll('.scroll-reveal');
    revealElements.forEach(el => this.observer?.observe(el));
  }

  /**
   * Clean up intersection observer
   */
  destroyScrollObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /**
   * Enable parallax effect on elements with data-parallax attribute
   * Usage: <div data-parallax="0.5"></div>
   */
  initParallaxEffect(): void {
    if (!this.isBrowser) return;

    const parallaxElements = document.querySelectorAll('[data-parallax]');
    if (parallaxElements.length === 0) return;

    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      
      parallaxElements.forEach((element: Element) => {
        const speed = parseFloat(
          (element as HTMLElement).dataset['parallax'] || '0.5'
        );
        const offset = scrollY * speed;
        (element as HTMLElement).style.transform = `translateY(${offset}px)`;
      });
    }, { passive: true });
  }

  /**
   * Add animation class to element after delay
   * Useful for sequential or staggered animations
   */
  addAnimationClass(
    element: HTMLElement,
    animationClass: string,
    delay: number = 0
  ): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        element.classList.add(animationClass);
        resolve();
      }, delay);
    });
  }

  /**
   * Trigger pulse animation on element
   */
  triggerPulse(element: HTMLElement): void {
    if (!element) return;
    element.style.animation = 'none';
    setTimeout(() => {
      element.style.animation = 'pulse 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    }, 10);
  }

  /**
   * Trigger scale bounce animation
   */
  triggerBounce(element: HTMLElement, intensity: number = 0.1): void {
    if (!element) return;
    
    const originalTransform = element.style.transform;
    element.style.transform = `scale(${1 - intensity})`;
    
    setTimeout(() => {
      element.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      element.style.transform = originalTransform || 'scale(1)';
    }, 50);
  }

  /**
   * Add shimmer effect to button/element
   */
  addShimmerEffect(element: HTMLElement): void {
    if (!element) return;
    
    const shimmer = document.createElement('div');
    shimmer.className = 'shimmer-effect';
    shimmer.style.cssText = `
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      animation: shimmerSlide 0.8s infinite;
    `;
    
    if (element.style.position === 'static') {
      element.style.position = 'relative';
    }
    
    element.appendChild(shimmer);
  }

  /**
   * Smooth scroll to element
   */
  smoothScrollToElement(element: HTMLElement | string, offset: number = 60): void {
    if (!this.isBrowser) return;

    const target = typeof element === 'string' 
      ? document.querySelector(element) as HTMLElement
      : element;

    if (!target) return;

    const targetPosition = target.getBoundingClientRect().top + window.scrollY - offset;
    
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  }

  /**
   * Stagger animation for multiple elements
   * Usage: staggerAnimation(document.querySelectorAll('.item'), 'slideInUp', 100)
   */
  staggerAnimation(
    elements: NodeListOf<Element> | Element[],
    animationClass: string,
    delayPerItem: number = 100
  ): void {
    Array.from(elements).forEach((element, index) => {
      setTimeout(() => {
        (element as HTMLElement).classList.add(animationClass);
      }, index * delayPerItem);
    });
  }

  /**
   * Create floating animation for element
   */
  createFloatingEffect(element: HTMLElement, range: number = 10): void {
    if (!element) return;

    element.style.animation = `float 3s ease-in-out infinite`;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-${range}px); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Monitor element visibility and trigger callback
   */
  onElementVisible(
    element: HTMLElement,
    callback: () => void,
    once: boolean = true
  ): void {
    if (!this.isBrowser) return;

    const options: IntersectionObserverInit = {
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback();
          if (once) observer.unobserve(entry.target);
        }
      });
    }, options);

    observer.observe(element);
  }

  /**
   * Add ripple effect on click
   */
  addRippleEffect(button: HTMLElement): void {
    if (!button) return;

    button.addEventListener('click', (event: MouseEvent) => {
      const ripple = document.createElement('span');
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const size = Math.max(rect.width, rect.height);

      ripple.style.cssText = `
        position: absolute;
        left: ${x - size / 2}px;
        top: ${y - size / 2}px;
        width: ${size}px;
        height: ${size}px;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        pointer-events: none;
        animation: rippleOut 0.6s ease-out;
      `;

      button.style.position = 'relative';
      button.style.overflow = 'hidden';
      button.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);
    });
  }

  /**
   * Trigger shake animation
   */
  triggerShake(element: HTMLElement): void {
    if (!element) return;
    element.style.animation = 'shake 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    setTimeout(() => {
      element.style.animation = '';
    }, 500);
  }

  /**
   * Create loading skeleton animation
   */
  addSkeletonEffect(element: HTMLElement): void {
    if (!element) return;

    element.style.cssText = `
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: skeleton 1.5s infinite;
    `;
  }
}

// Add CSS animations as a stylesheet injection for better performance
const animationStyles = `
  @keyframes shimmerSlide {
    0% { left: -100%; }
    100% { left: 100%; }
  }

  @keyframes rippleOut {
    0% {
      opacity: 1;
      transform: scale(0);
    }
    100% {
      opacity: 0;
      transform: scale(1);
    }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
  }

  @keyframes skeleton {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = animationStyles;
  document.head.appendChild(style);
}
