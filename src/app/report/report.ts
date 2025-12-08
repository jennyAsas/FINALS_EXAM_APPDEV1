import { Component, inject, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { ReportService } from '../report.service';
import { AnimationService } from '../animation.service';
import { ToastService } from '../toast/toast.service';
import { InteractiveLocationPickerComponent } from '../interactive-location-picker/interactive-location-picker';
import { BAGUIO_BARANGAY_CENTROIDS } from '../barangay-centroids';
import { firstValueFrom } from 'rxjs';
import { Router, RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-report',
  templateUrl: './report.html',
  styleUrl: './report.css',
  imports: [CommonModule, FormsModule, RouterModule, InteractiveLocationPickerComponent],
})
export class Report implements OnInit, AfterViewInit, OnDestroy {
  private reportService = inject(ReportService);
  public authService = inject(AuthService);
  private router = inject(Router);
  private animationService = inject(AnimationService);
  private toastService = inject(ToastService);

  // Report form fields
  description = '';
  street = '';
  barangay = '';
  landmark = '';
  city = 'Baguio City';
  priority: 'low' | 'medium' | 'high' = 'medium';
  fullName = '';
  email = '';
  idImageUrl: string | null = null;
  idImageFile: File | null = null;
  idImageFileName: string | null = null;
  proofImageUrl: string | null = null;
  proofImageFile: File | null = null;
  proofImageFileName: string | null = null;
  location: { lat: number; lng: number } | null = null;
  showInteractiveMap: boolean = false;

  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading: boolean = false;
  validationErrors: { [key: string]: string } = {};

  // Baguio City barangays
  baguioBarangays: string[] = [
    'A. Bonifacio-Caguioa-Rimando (ABCR)',
    'Abanao-Zandueta-Kayong-Chugum-Otek (AZKCO)',
    'Alfonso Tabora',
    'Ambiong',
    'Andres Bonifacio (Lower Bokawkan)',
    'Apugan-Loakan',
    'Asin Road',
    'Atok Trail',
    'Aurora Hill Proper (Malvar-Sgt. Floresca)',
    'Aurora Hill, North Central',
    'Aurora Hill, South Central',
    'Bagong Lipunan (Market Area)',
    'Baguio Dairy Farm',
    'Bakakeng Central',
    'Bakakeng North',
    'Bal-Marcoville (Marcoville)',
    'Balsigan',
    'Bayan Park East',
    'Bayan Park Village',
    'Bayan Park West (Bayan Park)',
    'BGH Compound',
    'Brookside',
    'Brookspoint',
    "Cabinet Hill-Teacher's Camp",
    'Camdas Subdivision',
    'Camp 7',
    'Camp 8',
    'Camp Allen',
    'Campo Filipino',
    'City Camp Central',
    'City Camp Proper',
    'Country Club Village',
    'Cresencia Village',
    'Dagisitan',
    'Dagsian, Lower',
    'Dagsian, Upper',
    'Dizon Subdivision',
    'Dominican Hill-Mirador',
    'Dontogan',
    'DPS Area',
    "Engineers' Hill",
    'Fairview Village',
    'Ferdinand (Happy Homes-Campo Sioco)',
    'Fort del Pilar',
    'Gabriel Silang',
    'General Emilio F. Aguinaldo (Quirino-Magsaysay, Upper)',
    'General Luna, Lower',
    'General Luna, Upper',
    'Gibraltar',
    'Greenwater Village',
    'Guisad Central',
    'Guisad Sorong',
    'Happy Hollow',
    'Happy Homes (Happy Homes-Lucban)',
    'Harrison-Claudio Carantes',
    'Hillside',
    'Holy Ghost Extension',
    'Holy Ghost Proper',
    'Honeymoon (Honeymoon-Holy Ghost)',
    'Imelda R. Marcos (La Salle)',
    'Imelda Village',
    'Irisan',
    'Kabayanihan',
    'Kagitingan',
    'Kayang Extension',
    'Kayang-Hilltop',
    'Kias',
    'Legarda-Burnham-Kisad',
    'Liwanag-Loakan',
    'Loakan Proper',
    'Lopez Jaena',
    'Lourdes Subdivision Extension',
    'Lourdes Subdivision, Lower',
    'Lourdes Subdivision, Proper',
    'Lualhati',
    'Lucnab',
    'Magsaysay Private Road',
    'Magsaysay, Lower',
    'Magsaysay, Upper',
    'Malcolm Square-Perfecto (Jose Abad Santos)',
    'Manuel A. Roxas',
    'Market Subdivision, Upper',
    'Middle Quezon Hill Subdivision (Quezon Hill Middle)',
    'Military Cut-off',
    'Mines View Park',
    'Modern Site, East',
    'Modern Site, West',
    'MRR-Queen of Peace',
    'New Lucban',
    'Outlook Drive',
    'Pacdal',
    'Padre Burgos',
    'Padre Zamora',
    'Palma-Urbano (Cariño-Palma)',
    'Phil-Am',
    'Pinget',
    'Pinsao Pilot Project',
    'Pinsao Proper',
    'Poliwes',
    'Pucsusan',
    'Quezon Hill Proper',
    'Quezon Hill, Upper',
    'Quirino Hill, East',
    'Quirino Hill, Lower',
    'Quirino Hill, Middle',
    'Quirino Hill, West',
    'Quirino-Magsaysay, Lower (Quirino-Magsaysay, West)',
    'Rizal Monument Area',
    'Rock Quarry, Lower',
    'Rock Quarry, Middle',
    'Rock Quarry, Upper',
    'Salud Mitra',
    'San Antonio Village',
    'San Luis Village',
    'San Roque Village',
    'San Vicente',
    'Sanitary Camp, North',
    'Sanitary Camp, South',
    'Santa Escolastica',
    'Santo Rosario',
    'Santo Tomas Proper',
    'Santo Tomas School Area',
    'Scout Barrio',
    'Session Road Area',
    'Slaughter House Area (Santo Niño Slaughter)',
    'SLU-SVP Housing Village',
    'South Drive',
    'Teodora Alonzo',
    'Trancoville',
    'Upper General Luna',
    'Victoria Village',
    'Websters Subdivision',
  ];

  filteredBarangays: string[] = [...this.baguioBarangays];
  showBarangaySuggestions: boolean = false;

  ngOnInit(): void {
    // Load user info from auth
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.email = user.email || '';
        this.fullName = user.displayName || '';
      }
    });

    // Load any existing form data from sessionStorage if available
    const savedData = sessionStorage.getItem('reportFormData');
    if (savedData) {
      const data = JSON.parse(savedData);
      this.description = data.description || '';
      this.street = data.street || '';
      this.barangay = data.barangay || '';
      this.landmark = data.landmark || '';
      this.priority = data.priority || 'medium';
    }
  }

  filterBarangays(event: Event): void {
    const input = (event.target as HTMLInputElement).value.toLowerCase();
    this.showBarangaySuggestions = true;
    if (!input) {
      this.filteredBarangays = [...this.baguioBarangays];
      return;
    }
    this.filteredBarangays = this.baguioBarangays.filter((b) => b.toLowerCase().includes(input));
  }

  selectBarangay(barangay: string): void {
    this.barangay = barangay;
    this.showBarangaySuggestions = false;
    this.filteredBarangays = [...this.baguioBarangays];
    this.saveFormProgress();
  }

  onStreetChange(): void {
    // Trigger real-time update to form progress
    this.saveFormProgress();
  }

  hideBarangaySuggestions(): void {
    // Use setTimeout to allow click events to process before hiding
    setTimeout(() => {
      this.showBarangaySuggestions = false;
      this.saveFormProgress();
    }, 150);
  }

  // Triggered when the barangay input loses focus (user typed and didn't click suggestion)
  async onBarangayBlur(): Promise<void> {
    const name = (this.barangay || '').trim();
    if (!name) {
      return;
    }

    // If the user already picked a precise map location, do not overwrite it
    if (this.location) {
      return;
    }

    try {
      const coords = await this.geocodeBarangay(name);
      if (coords) {
        this.location = coords;
        this.saveFormProgress();
      }
    } catch (err) {
      // silently ignore geocode failures
      console.warn('Failed to geocode barangay on blur: - report.ts', err);
    }
  }

  onMapLocationSelected(locationData: { lat: number; lng: number; address?: string }): void {
    this.location = { lat: locationData.lat, lng: locationData.lng };

    // Real-time update: Auto-fill address fields from map selection
    this.getAddressFromCoordinates(locationData.lat, locationData.lng);
    this.saveFormProgress();

    // Show a subtle confirmation
    console.log('Location updated from map:', this.location);
  }

  toggleInteractiveMap(): void {
    this.showInteractiveMap = !this.showInteractiveMap;
  }

  async getAddressFromCoordinates(lat: number, lng: number): Promise<void> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      );
      const data = await response.json();

      if (data && data.address) {
        // Extract street and neighborhood/suburb information
        const address = data.address;
        const street = address.road || address.street || address.neighbourhood || '';
        const suburb =
          address.suburb || address.neighbourhood || address.quarter || address.village || '';
        const district = address.city_district || address.district || '';

        // Auto-fill street - always update when selecting from map
        if (street) {
          this.street = street;
        }

        // Auto-fill landmark from nearby places
        if (address.amenity || address.building || address.shop) {
          this.landmark = address.amenity || address.building || address.shop;
        }

        // Try to match detected suburb/neighbourhood/district with our barangay list
        const searchTerms = [suburb, district, address.neighbourhood, address.quarter].filter(
          Boolean,
        );

        for (const term of searchTerms) {
          if (!term) continue;

          const termLower = term.toLowerCase();
          const matchedBarangay = this.baguioBarangays.find((b) => {
            const bLower = b.toLowerCase();
            const bBase = bLower.split('(')[0].trim();
            return (
              bLower.includes(termLower) ||
              termLower.includes(bBase) ||
              bBase.includes(termLower) ||
              termLower.split(' ').some((word: string) => word.length > 3 && bBase.includes(word))
            );
          });

          if (matchedBarangay) {
            this.barangay = matchedBarangay;
            break;
          }
        }

        // If no barangay matched, try to find nearest barangay by coordinates
        if (!this.barangay) {
          const nearestBarangay = this.findNearestBarangay(lat, lng);
          if (nearestBarangay) {
            this.barangay = nearestBarangay;
          }
        }
      }
    } catch (error) {
      console.warn('Could not fetch address details: - report.ts:279', error);
      // Don't show error to user - this is just a helpful suggestion
    }
  }

  // Find nearest barangay by coordinates
  findNearestBarangay(lat: number, lng: number): string | null {
    const BAGUIO_BARANGAY_COORDS: { [key: string]: [number, number] } = BAGUIO_BARANGAY_CENTROIDS;

    let nearestBarangay: string | null = null;
    let minDistance = Infinity;

    for (const [name, coords] of Object.entries(BAGUIO_BARANGAY_COORDS)) {
      const [bLat, bLng] = coords;
      // Calculate simple Euclidean distance (good enough for small areas)
      const distance = Math.sqrt(Math.pow(lat - bLat, 2) + Math.pow(lng - bLng, 2));

      if (distance < minDistance) {
        minDistance = distance;
        nearestBarangay = name;
      }
    }

    // Only return if within reasonable distance (roughly 1km)
    if (minDistance < 0.02) {
      // Find the matching name in our full barangay list
      const matchedFull = this.baguioBarangays.find(
        (b) =>
          b.toLowerCase().includes(nearestBarangay!.toLowerCase()) ||
          nearestBarangay!.toLowerCase().includes(b.toLowerCase().split('(')[0].trim()),
      );
      return matchedFull || nearestBarangay;
    }

    return null;
  }

  // Geocode barangay name to coordinates
  async geocodeBarangay(barangayName: string): Promise<{ lat: number; lng: number } | null> {
    const BAGUIO_BARANGAY_COORDS: { [key: string]: [number, number] } = BAGUIO_BARANGAY_CENTROIDS;

    const normalizedName = barangayName.trim();
    const coords = BAGUIO_BARANGAY_COORDS[normalizedName];

    if (coords) {
      return { lat: coords[0], lng: coords[1] };
    }

    // Try to find partial match
    const partialMatch = Object.entries(BAGUIO_BARANGAY_COORDS).find(
      ([name]) =>
        name.toLowerCase().includes(normalizedName.toLowerCase()) ||
        normalizedName.toLowerCase().includes(name.toLowerCase()),
    );

    if (partialMatch) {
      const coords = partialMatch[1] as [number, number];
      return { lat: coords[0], lng: coords[1] };
    }

    return null;
  }

  onProofImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'Proof image must be less than 5MB.';
        this.toastService.error('Proof image must be less than 5MB.');
        return;
      }
      this.proofImageFile = file;
      this.proofImageFileName = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.proofImageUrl = e.target?.result as string;
        this.successMessage = 'Proof image uploaded successfully!';
        this.toastService.success('Proof image uploaded successfully!');
        setTimeout(() => {
          if (this.successMessage === 'Proof image uploaded successfully!') {
            this.successMessage = null;
          }
        }, 3000);
      };
      reader.readAsDataURL(file);
    }
  }

  onIdImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'ID image must be less than 5MB.';
        this.toastService.error('ID image must be less than 5MB.');
        return;
      }
      this.idImageFile = file;
      this.idImageFileName = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.idImageUrl = e.target?.result as string;
        this.successMessage = 'ID image uploaded successfully!';
        this.toastService.success('ID image uploaded successfully!');
        setTimeout(() => {
          if (this.successMessage === 'ID image uploaded successfully!') {
            this.successMessage = null;
          }
        }, 3000);
      };
      reader.readAsDataURL(file);
    }
  }

  validateForm(): boolean {
    this.validationErrors = {};

    if (!this.description.trim()) {
      this.validationErrors['description'] = 'Incident description is required.';
    }
    if (!this.fullName.trim()) {
      this.validationErrors['fullName'] = 'Full name is required.';
    }
    if (!this.email.trim() || !this.isValidEmail(this.email)) {
      this.validationErrors['email'] = 'Valid email address is required.';
    }
    if (!this.street.trim()) {
      this.validationErrors['street'] = 'Street address is required.';
    }
    if (!this.barangay.trim()) {
      this.validationErrors['barangay'] = 'Barangay is required.';
    }
    // GPS is now optional - removed location requirement

    return Object.keys(this.validationErrors).length === 0;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async onSubmit(): Promise<void> {
    this.errorMessage = null;
    this.successMessage = null;

    if (!this.validateForm()) {
      this.toastService.warning('Please fill in all required fields.');
      return;
    }

    this.isLoading = true;

    try {
      // Ensure caller is logged in
      const user = await firstValueFrom(this.authService.currentUser$);
      if (!user) {
        this.errorMessage = 'You must be logged in to submit a report. Redirecting to login...';
        this.toastService.error('You must be logged in to submit a report.');
        setTimeout(() => this.router.navigate(['/login']), 900);
        this.isLoading = false;
        return;
      }

      // GPS location is now optional - no validation required

      // Submit the report using ReportService
      const reportPayload = {
        reporterId: user.uid || user.email || 'unknown',
        reporterName: this.fullName.trim(),
        reporterEmail: this.email.trim(),
        description: this.description.trim(),
        street: this.street.trim(),
        barangay: this.barangay.trim(),
        landmark: this.landmark.trim() || undefined,
        city: this.city,
        priority: this.priority,
        location: this.location || undefined, // Location is optional via map picker
        timestamp: new Date().toISOString(),
        imageUrl: this.proofImageUrl || undefined,
        idImageUrl: this.idImageUrl || undefined,
      };

      await firstValueFrom(this.reportService.submitReport(reportPayload));

      this.successMessage = 'Report submitted successfully and is awaiting admin approval.';
      this.toastService.success('Safety report submitted successfully! Awaiting admin approval.');

      // Scroll to top to show success message without clearing form
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Clear form after scroll completes
        setTimeout(() => {
          this.clearForm();
          sessionStorage.removeItem('reportFormData');
        }, 800);
      }, 100);
    } catch (error: any) {
      console.error('Report submission failed: - report.ts:616', error);
      this.errorMessage = 'Submission failed. Please try again.';
      this.toastService.error('Submission failed. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }
  private clearForm(): void {
    this.description = '';
    this.street = '';
    this.barangay = '';
    this.landmark = '';
    this.priority = 'medium';
    this.proofImageUrl = null;
    this.proofImageFile = null;
    this.proofImageFileName = null;
    this.idImageUrl = null;
    this.idImageFile = null;
    this.idImageFileName = null;
    this.location = null;
    // Don't clear fullName and email as they're from auth
  }

  saveFormProgress(): void {
    const formData = {
      description: this.description,
      street: this.street,
      barangay: this.barangay,
      landmark: this.landmark,
      priority: this.priority,
    };
    sessionStorage.setItem('reportFormData', JSON.stringify(formData));
  }

  ngAfterViewInit(): void {
    // Initialize scroll animations and parallax effects
    this.animationService.initScrollRevealObserver();
    this.animationService.initParallaxEffect();

    // Add ripple effects to all buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button) => {
      this.animationService.addRippleEffect(button);
    });
  }

  ngOnDestroy(): void {
    // Clean up observers to prevent memory leaks
    this.animationService.destroyScrollObserver();
  }
}
