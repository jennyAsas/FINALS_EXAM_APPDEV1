// src/app/auth.service.ts (CORRECTED)

import { Injectable, inject } from '@angular/core';
import {
  Auth as FirebaseAuth,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  createUserWithEmailAndPassword,
  updateProfile,
  user,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Data } from './data';
import { Observable, of, from } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { Functions, httpsCallable } from '@angular/fire/functions';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Inject the aliased type
  private auth = inject(FirebaseAuth);
  private router = inject(Router);
  private data = inject(Data);
  private functions = inject(Functions);

  // Observable to track the current Firebase user state (null if logged out)
  currentUser$ = user(this.auth);

  // Observable that emits true when the user has an `admin` custom claim
  isAdmin$ = this.currentUser$.pipe(
    switchMap((u: any) => {
      if (!u) return of(false);
      // getIdTokenResult returns a promise
      return from(u.getIdTokenResult()).pipe(map((t: any) => !!t.claims?.admin));
    }),
  );

  async login(email: string, password: string): Promise<void> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('Login successful for:', userCredential.user.email);

      // Verify admin status for primary admin (jennyasas14@gmail.com)
      try {
        const verifyAdmin = httpsCallable(this.functions, 'verifyAdminOnSignIn');
        await verifyAdmin({});
        console.log('Admin verification completed');
      } catch (verifyError) {
        console.warn('Admin verification skipped:', verifyError);
      }

      // Force token refresh to get updated claims
      await userCredential.user.getIdToken(true);

      // redirect based on admin claim
      try {
        const u: any = this.auth.currentUser;
        if (u) {
          const tokenResult = await u.getIdTokenResult(true); // Force refresh
          const isAdmin = !!tokenResult.claims?.admin;
          console.log('User admin status:', isAdmin);
          this.router.navigate([isAdmin ? '/admin-dashboard' : '/dashboard']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      } catch (e) {
        console.error('Token check error:', e);
        // fallback to dashboard
        this.router.navigate(['/dashboard']);
      }
    } catch (error: any) {
      console.error('Login failed:', error.code, error.message);

      // Provide more specific error messages
      let errorMsg = 'Login failed: ';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMsg += 'No account found with this email. Please sign up first.';
          break;
        case 'auth/wrong-password':
          errorMsg += 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMsg += 'Invalid email address format.';
          break;
        case 'auth/user-disabled':
          errorMsg += 'This account has been disabled.';
          break;
        case 'auth/invalid-credential':
          errorMsg += 'Invalid credentials. Please check your email and password.';
          break;
        default:
          errorMsg += error.message || 'An error occurred. Please try again.';
      }

      throw new Error(errorMsg);
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.router.navigate(['/']);
  }

  async loginWithGoogle(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;

      console.log('Google login successful:', user.email);

      // Create or update user profile in Firestore
      try {
        if (user) {
          await this.data.createUserProfile(user.uid, {
            email: user.email || '',
            displayName: user.displayName || 'Google User',
            phoneNumber: user.phoneNumber || '',
          });
        }
      } catch (err) {
        console.warn('Failed to create/update user profile:', err);
      }

      // Redirect based on admin claim
      try {
        const tokenResult = await user.getIdTokenResult();
        const isAdmin = !!tokenResult.claims?.['admin'];
        this.router.navigate([isAdmin ? '/admin-dashboard' : '/dashboard']);
      } catch (e) {
        console.error('Token check error:', e);
        this.router.navigate(['/dashboard']);
      }
    } catch (error: any) {
      console.error('Google login failed:', error);
      let errorMsg = 'Google login failed: ';
      switch (error.code) {
        case 'auth/account-exists-with-different-credential':
          errorMsg +=
            'An account already exists with the same email. Try signing in with a different method.';
          break;
        case 'auth/popup-blocked':
          errorMsg += 'Popup was blocked. Please allow popups for this site.';
          break;
        case 'auth/popup-closed-by-user':
          errorMsg += 'Login popup was closed. Please try again.';
          break;
        case 'auth/cancelled-popup-request':
          errorMsg += 'Login was cancelled. Please try again.';
          break;
        case 'auth/network-request-failed':
          errorMsg += 'Network error. Please check your connection.';
          break;
        default:
          errorMsg += error.message || 'An error occurred. Please try again.';
      }
      throw new Error(errorMsg);
    }
  }

  async loginWithFacebook(): Promise<void> {
    try {
      const provider = new FacebookAuthProvider();
      provider.addScope('email');
      provider.addScope('public_profile');

      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;

      console.log('Facebook login successful:', user.email);

      // Create or update user profile in Firestore
      try {
        if (user) {
          await this.data.createUserProfile(user.uid, {
            email: user.email || '',
            displayName: user.displayName || 'Facebook User',
            phoneNumber: user.phoneNumber || '',
          });
        }
      } catch (err) {
        console.warn('Failed to create/update user profile:', err);
      }

      // Redirect based on admin claim
      try {
        const tokenResult = await user.getIdTokenResult();
        const isAdmin = !!tokenResult.claims?.['admin'];
        this.router.navigate([isAdmin ? '/admin-dashboard' : '/dashboard']);
      } catch (e) {
        console.error('Token check error:', e);
        this.router.navigate(['/dashboard']);
      }
    } catch (error: any) {
      console.error('Facebook login failed:', error);
      let errorMsg = 'Facebook login failed: ';
      switch (error.code) {
        case 'auth/account-exists-with-different-credential':
          errorMsg +=
            'An account already exists with the same email. Try signing in with a different method.';
          break;
        case 'auth/popup-blocked':
          errorMsg += 'Popup was blocked. Please allow popups for this site.';
          break;
        case 'auth/popup-closed-by-user':
          errorMsg += 'Login popup was closed. Please try again.';
          break;
        case 'auth/cancelled-popup-request':
          errorMsg += 'Login was cancelled. Please try again.';
          break;
        case 'auth/network-request-failed':
          errorMsg += 'Network error. Please check your connection.';
          break;
        default:
          errorMsg += error.message || 'An error occurred. Please try again.';
      }
      throw new Error(errorMsg);
    }
  }

  async sendVerificationEmail(): Promise<void> {
    // If there's a current user, send a verification email. Return gracefully otherwise.
    const current = this.auth.currentUser as any;
    if (!current) throw new Error('No authenticated user to send verification to');

    try {
      await sendEmailVerification(current);
    } catch (err) {
      console.error('Failed to send verification email:', err);
      throw err;
    }
  }

  async register(email: string, password: string, displayName?: string): Promise<void> {
    try {
      const cred = await createUserWithEmailAndPassword(this.auth, email, password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      // create a profile doc in Firestore, the Data service will make the first registered user an admin
      try {
        if (cred.user) {
          await this.data.createUserProfile(cred.user.uid, {
            email: cred.user.email ?? '',
            displayName: cred.user.displayName ?? '',
            phoneNumber: (cred.user as any).phoneNumber ?? '',
          });
        }
      } catch (err) {
        console.warn('Failed to create user profile automatically:', err);
      }

      // the user is signed in after register; navigate to home
      this.router.navigate(['/']);
    } catch (err: any) {
      console.error('Registration failed:', err);
      throw new Error(err?.message || 'Registration failed');
    }
  }

  isLoggedIn(): Observable<boolean> {
    return new Observable((observer) => {
      this.currentUser$.subscribe((user) => {
        observer.next(!!user);
      });
    });
  }
}
