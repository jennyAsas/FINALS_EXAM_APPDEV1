import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth.service';
import { Data } from '../data';
import { UserProfile } from '../models';
import { ToastService } from '../toast/toast.service';
import { BAGUIO_BARANGAY_CENTROIDS } from '../barangay-centroids';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import {
  Auth,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from '@angular/fire/auth';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
})
export class ProfileComponent implements OnInit {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  // State signals
  isLoading = signal(true);
  isSaving = signal(false);
  isOwnProfile = signal(true);
  isEditMode = signal(false);
  showPasswordModal = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // Profile data
  profile = signal<UserProfile | null>(null);
  profileId = signal<string | null>(null);

  // Form data for editing
  editForm = signal({
    displayName: '',
    phoneNumber: '',
    bio: '',
    barangay: '',
    street: '',
    city: '',
    showEmail: true,
    showPhone: false,
    showAddress: false,
  });

  // Password change form
  passwordForm = signal({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Barangay auto-suggestion
  baguioBarangays: string[] = Object.keys(BAGUIO_BARANGAY_CENTROIDS).sort();
  filteredBarangays: string[] = [];
  showBarangaySuggestions = signal(false);

  // Current user info
  currentUser$ = this.authService.currentUser$;
  isAdmin$ = this.authService.isAdmin$;

  // Computed values
  avatarInitials = computed(() => {
    const name = this.profile()?.displayName || 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  });

  ngOnInit() {
    // Check if viewing own profile or someone else's
    this.route.params.subscribe(async (params) => {
      const userId = params['id'];

      if (userId) {
        // Viewing another user's profile
        this.profileId.set(userId);
        await this.loadProfile(userId);

        // Check if it's own profile
        const currentUser = this.auth.currentUser;
        this.isOwnProfile.set(currentUser?.uid === userId);
      } else {
        // Viewing own profile
        const currentUser = this.auth.currentUser;
        if (currentUser) {
          this.profileId.set(currentUser.uid);
          this.isOwnProfile.set(true);
          await this.loadProfile(currentUser.uid);
        } else {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  async loadProfile(uid: string) {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      // Try loading from 'users' collection first (main user data)
      const userRef = doc(this.firestore, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        this.profile.set({ ...data, uid });
        this.populateEditForm(data);
      } else {
        // User document doesn't exist, create one from auth data
        const authUser = this.auth.currentUser;
        if (authUser && authUser.uid === uid) {
          const newProfile = await this.createDefaultProfile(authUser);
          this.profile.set(newProfile);
          this.populateEditForm(newProfile);
        } else {
          this.errorMessage.set('Profile not found');
        }
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      this.errorMessage.set('Failed to load profile');
    } finally {
      this.isLoading.set(false);
    }
  }

  async createDefaultProfile(authUser: any): Promise<UserProfile> {
    const tokenResult = await authUser.getIdTokenResult();
    const isAdmin = !!tokenResult.claims?.admin;

    const newProfile: UserProfile = {
      uid: authUser.uid,
      email: authUser.email || '',
      displayName: authUser.displayName || authUser.email?.split('@')[0] || 'User',
      photoURL: authUser.photoURL || '',
      phoneNumber: authUser.phoneNumber || '',
      bio: '',
      role: isAdmin ? 'admin' : 'user',
      isVerified: authUser.emailVerified,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      privacy: {
        showEmail: true,
        showPhone: false,
        showAddress: false,
      },
      stats: {
        reportsSubmitted: 0,
        alertsReceived: 0,
        sosTriggered: 0,
      },
    };

    // Save to Firestore users collection
    const userRef = doc(this.firestore, 'users', authUser.uid);
    await setDoc(userRef, newProfile, { merge: true });

    return newProfile;
  }

  populateEditForm(profile: UserProfile) {
    this.editForm.set({
      displayName: profile.displayName || '',
      phoneNumber: profile.phoneNumber || '',
      bio: profile.bio || '',
      barangay: profile.address?.barangay || '',
      street: profile.address?.street || '',
      city: profile.address?.city || 'Baguio City',
      showEmail: profile.privacy?.showEmail ?? true,
      showPhone: profile.privacy?.showPhone ?? false,
      showAddress: profile.privacy?.showAddress ?? false,
    });
  }

  toggleEditMode() {
    if (this.isEditMode()) {
      // Cancel editing, restore original values
      const currentProfile = this.profile();
      if (currentProfile) {
        this.populateEditForm(currentProfile);
      }
    }
    this.isEditMode.set(!this.isEditMode());
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  updateFormField(field: string, value: any) {
    this.editForm.update((form) => ({ ...form, [field]: value }));
  }

  // Barangay auto-suggestion methods
  filterBarangays(event: Event): void {
    const input = (event.target as HTMLInputElement).value.toLowerCase();
    this.updateFormField('barangay', (event.target as HTMLInputElement).value);
    this.showBarangaySuggestions.set(true);

    if (!input) {
      this.filteredBarangays = [...this.baguioBarangays];
      return;
    }
    this.filteredBarangays = this.baguioBarangays.filter((b) => b.toLowerCase().includes(input));
  }

  selectBarangay(barangay: string): void {
    this.updateFormField('barangay', barangay);
    this.showBarangaySuggestions.set(false);
    this.filteredBarangays = [...this.baguioBarangays];
  }

  hideBarangaySuggestions(): void {
    // Delay to allow click on suggestion to register
    setTimeout(() => {
      this.showBarangaySuggestions.set(false);
    }, 200);
  }

  async saveProfile() {
    if (!this.isOwnProfile()) return;

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');

      const form = this.editForm();

      // Update Firebase Auth profile
      await updateProfile(currentUser, {
        displayName: form.displayName,
      });

      // Update Firestore profile - use 'users' collection
      const userRef = doc(this.firestore, 'users', currentUser.uid);
      await updateDoc(userRef, {
        displayName: form.displayName,
        phoneNumber: form.phoneNumber,
        bio: form.bio,
        address: {
          barangay: form.barangay,
          street: form.street,
          city: form.city,
        },
        privacy: {
          showEmail: form.showEmail,
          showPhone: form.showPhone,
          showAddress: form.showAddress,
        },
        updatedAt: serverTimestamp(),
      });

      // Reload profile
      await this.loadProfile(currentUser.uid);

      this.successMessage.set('Profile updated successfully!');
      this.toastService.success('Profile updated successfully!');
      this.isEditMode.set(false);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      this.errorMessage.set(error.message || 'Failed to save profile');
      this.toastService.error(error.message || 'Failed to save profile');
    } finally {
      this.isSaving.set(false);
    }
  }

  async uploadPhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];

    // Validate file
    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Please select an image file');
      this.toastService.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage.set('Image must be less than 5MB');
      this.toastService.error('Image must be less than 5MB');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');

      // Upload to Firebase Storage
      const storageRef = ref(this.storage, `profile-photos/${currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);

      // Update Firebase Auth
      await updateProfile(currentUser, { photoURL });

      // Update Firestore - use 'users' collection
      const userRef = doc(this.firestore, 'users', currentUser.uid);
      await updateDoc(userRef, {
        photoURL,
        updatedAt: serverTimestamp(),
      });

      // Reload profile
      await this.loadProfile(currentUser.uid);
      this.successMessage.set('Photo updated successfully!');
      this.toastService.success('Profile photo updated successfully!');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      this.errorMessage.set(error.message || 'Failed to upload photo');
      this.toastService.error(error.message || 'Failed to upload photo');
    } finally {
      this.isSaving.set(false);
    }
  }

  openPasswordModal() {
    this.passwordForm.set({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    this.showPasswordModal.set(true);
    this.errorMessage.set('');
  }

  closePasswordModal() {
    this.showPasswordModal.set(false);
  }

  updatePasswordField(field: string, value: string) {
    this.passwordForm.update((form) => ({ ...form, [field]: value }));
  }

  async changePassword() {
    const form = this.passwordForm();

    if (form.newPassword !== form.confirmPassword) {
      this.errorMessage.set('Passwords do not match');
      this.toastService.error('Passwords do not match');
      return;
    }

    if (form.newPassword.length < 6) {
      this.errorMessage.set('Password must be at least 6 characters');
      this.toastService.error('Password must be at least 6 characters');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser || !currentUser.email) throw new Error('Not authenticated');

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(currentUser.email, form.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, form.newPassword);

      this.successMessage.set('Password changed successfully!');
      this.toastService.success('Password changed successfully!');
      this.closePasswordModal();
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        this.errorMessage.set('Current password is incorrect');
        this.toastService.error('Current password is incorrect');
      } else {
        this.errorMessage.set(error.message || 'Failed to change password');
        this.toastService.error(error.message || 'Failed to change password');
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
