// src/app/admin-report/admin-report.ts

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgFor, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { ReportService } from '../report.service';
import { firstValueFrom } from 'rxjs';
import { Router, RouterModule } from '@angular/router';
import { ToastService } from '../toast/toast.service';
import { InteractiveLocationPickerComponent } from '../interactive-location-picker/interactive-location-picker';

@Component({
  standalone: true,
  selector: 'app-admin-report',
  templateUrl: './admin-report.html',
  styleUrl: './admin-report.css',
  imports: [
    CommonModule,
    NgIf,
    NgFor,
    AsyncPipe,
    FormsModule,
    RouterModule,
    InteractiveLocationPickerComponent,
  ],
})
export class AdminReport implements OnInit {
  private reportService = inject(ReportService);
  public authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  // Report form fields - Simplified for admin
  description = '';
  street = '';
  barangay = '';
  landmark = '';
  city = 'Baguio City';
  priority: 'low' | 'medium' | 'high' = 'high';
  location: { lat: number; lng: number } | null = null;
  locationAccuracy: number | null = null;
  isGettingLocation: boolean = false;
  locationError: string | null = null;

  // Photo upload
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  imageUrl: string | null = null;
  isUploadingImage: boolean = false;

  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading: boolean = false;
  validationErrors: { [key: string]: string } = {};

  // Baguio City barangays (same list as user form)
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
  // Recent reports for selecting an existing reported location
  recentReports: any[] = [];

  ngOnInit(): void {
    // Load recent reports so admin can choose an existing reported location
    this.reportService.getAllReports().subscribe((reports) => {
      // keep most recent first and limit to 30
      this.recentReports = (reports || []).slice(-30).reverse();
    });
  }

  /**
   * Handle selection from the combined location select (barangay or recent report)
   * Value format: 'brgy:...'(barangay name) or 'rpt:<reportId>'
   */
  onSelectLocation(value: string): void {
    if (!value) return;
    if (value.startsWith('brgy:')) {
      const brgy = value.replace('brgy:', '');
      this.barangay = brgy;
      // try to find a recent report in this barangay to obtain coordinates
      const found = this.recentReports.find(
        (r) => (r.barangay || '').toLowerCase() === brgy.toLowerCase(),
      );
      if (found && found.location) {
        this.location = found.location;
        this.street = this.street || found.street || '';
        this.locationAccuracy = found.locationAccuracy || null;
        this.locationError = null;
      } else {
        this.location = null;
        this.locationAccuracy = null;
        this.locationError =
          'No coordinates found for selected barangay from recent reports. You may use Get Current Location.';
      }
    } else if (value.startsWith('rpt:')) {
      const id = value.replace('rpt:', '');
      const rpt = this.recentReports.find((r) => r.id === id);
      if (rpt) {
        this.location = rpt.location || null;
        this.locationAccuracy = rpt.locationAccuracy || null;
        this.barangay = rpt.barangay || this.barangay;
        this.street = rpt.street || this.street;
        this.locationError = null;
      }
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
  }

  async getAddressFromCoordinates(lat: number, lng: number): Promise<void> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      );
      const data = await response.json();

      if (data && data.address) {
        const address = data.address;
        const street = address.road || address.street || address.neighbourhood || '';

        if (street && !this.street) {
          this.street = street;
        }

        // For barangay: ALWAYS use coordinate-based matching for pinpointed locations
        // This is more accurate than Nominatim string matching which can be incorrect
        const nearestBarangay = this.findNearestBarangay(lat, lng);
        if (nearestBarangay && !this.barangay) {
          this.barangay = nearestBarangay;
        }
      }
    } catch (error) {
      console.warn('Could not fetch address details:', error);
      // Still try to fill barangay by coordinates even if Nominatim fails
      const nearestBarangay = this.findNearestBarangay(lat, lng);
      if (nearestBarangay && !this.barangay) {
        this.barangay = nearestBarangay;
      }
    }
  }

  getCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.locationError = 'Geolocation is not supported by your browser.';
      return;
    }

    this.isGettingLocation = true;
    this.locationError = null;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (lat >= 16.35 && lat <= 16.48 && lng >= 120.52 && lng <= 120.66) {
          this.location = { lat, lng };
          this.locationAccuracy = position.coords.accuracy;
          this.locationError = null;

          await this.getAddressFromCoordinates(lat, lng);
        } else {
          this.locationError =
            'Your location is outside Baguio City. Please ensure you are within Baguio City to report an incident.';
          this.location = null;
        }
        this.isGettingLocation = false;
      },
      (error) => {
        this.isGettingLocation = false;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.locationError =
              'Location access denied. Please enable location access to submit a report.';
            break;
          case error.POSITION_UNAVAILABLE:
            this.locationError =
              'Location information unavailable. Please check your GPS settings.';
            break;
          case error.TIMEOUT:
            this.locationError = 'Location request timed out. Please try again.';
            break;
          default:
            this.locationError = 'Unable to get your location. Please try again.';
        }
        this.location = null;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  validateForm(): boolean {
    this.validationErrors = {};
    const missingFields: string[] = [];

    if (!this.description.trim()) {
      this.validationErrors['description'] = 'Description is required.';
      missingFields.push('Description');
    }
    if (!this.location) {
      this.validationErrors['location'] = 'Please select a location on the map.';
      missingFields.push('Location');
    }
    if (!this.barangay.trim()) {
      this.validationErrors['barangay'] = 'Barangay is required.';
      missingFields.push('Barangay');
    }
    if (!this.street.trim()) {
      this.validationErrors['street'] = 'Street is required.';
      missingFields.push('Street');
    }

    // Show toast notification for missing fields
    if (missingFields.length > 0) {
      this.toastService.warning(`Please fill in: ${missingFields.join(', ')}`);
    }

    return Object.keys(this.validationErrors).length === 0;
  }

  async onSubmit(): Promise<void> {
    this.errorMessage = null;
    this.successMessage = null;

    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;

    try {
      const user = await firstValueFrom(this.authService.currentUser$);
      if (!user) {
        this.toastService.error('You must be logged in as admin to create reports.');
        this.errorMessage = 'You must be logged in as admin to create reports.';
        setTimeout(() => this.router.navigate(['/login']), 900);
        this.isLoading = false;
        return;
      }

      if (!this.location) {
        this.toastService.warning(
          'Location is required. Please enable location access and try again.',
        );
        this.errorMessage = 'Location is required. Please enable location access and try again.';
        this.isLoading = false;
        return;
      }

      const reportPayload = {
        reporterId: 'ADMIN',
        reporterName: 'Police Admin',
        reporterEmail: user.email || 'admin@mountainsentinel.com',
        description: this.description.trim(),
        street: this.street.trim(),
        barangay: this.barangay.trim(),
        landmark: this.landmark.trim() || undefined,
        city: this.city,
        priority: this.priority,
        location: this.location,
        locationAccuracy: this.locationAccuracy ?? undefined,
        timestamp: new Date().toISOString(),
        isAdminReport: true,
        imageUrl: this.imageUrl || undefined,
      };

      await firstValueFrom(this.reportService.submitReport(reportPayload));

      // Automatically approve admin reports
      const allReports = await firstValueFrom(this.reportService.getAllReports());
      const justCreated = allReports[allReports.length - 1];
      if (justCreated) {
        this.reportService.approveReport(justCreated.id);
      }

      this.toastService.success('Safety alert issued and published successfully!');
      this.successMessage = 'Safety alert issued and published successfully!';

      this.clearForm();

      setTimeout(() => {
        this.router.navigate(['/admin-dashboard']);
      }, 1500);
    } catch (error: any) {
      console.error('Report creation failed:', error);
      this.toastService.error('Submission failed. Please try again.');
      this.errorMessage = 'Submission failed. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  private clearForm(): void {
    this.description = '';
    this.street = '';
    this.barangay = '';
    this.landmark = '';
    this.priority = 'high';
    this.location = null;
    this.locationAccuracy = null;
  }

  /**
   * Handle location selected from the interactive map picker
   * Auto-populates barangay and street fields from geocoded address
   */
  onMapLocationSelected(locationData: { lat: number; lng: number; address?: string }): void {
    this.location = { lat: locationData.lat, lng: locationData.lng };
    this.locationAccuracy = 10; // Map selection is fairly accurate
    this.locationError = null;

    // Clear validation error for location
    if (this.validationErrors['location']) {
      delete this.validationErrors['location'];
    }

    // Auto-populate fields from address if available
    if (locationData.address) {
      this.parseAddressToFields(locationData.address);
    } else {
      // Perform reverse geocode to get address details
      this.reverseGeocodeAndFill(locationData.lat, locationData.lng);
    }
  }

  /**
   * Parse address string and auto-fill barangay and street fields
   */
  private parseAddressToFields(address: string): void {
    const parts = address.split(',').map((p) => p.trim());

    // Try to find matching barangay from the address parts
    for (const part of parts) {
      const matchedBarangay = this.baguioBarangays.find(
        (b) =>
          b.toLowerCase().includes(part.toLowerCase()) ||
          part.toLowerCase().includes(b.toLowerCase().split('(')[0].trim().toLowerCase()),
      );

      if (matchedBarangay) {
        this.barangay = matchedBarangay;
        break;
      }
    }

    // First part is usually street or specific location
    if (parts.length > 0 && !this.street) {
      const firstPart = parts[0];
      // Don't use the barangay as street
      if (!this.baguioBarangays.some((b) => b.toLowerCase().includes(firstPart.toLowerCase()))) {
        this.street = firstPart;
      }
    }
  }

  /**
   * Reverse geocode coordinates and auto-fill form fields
   */
  private async reverseGeocodeAndFill(lat: number, lng: number): Promise<void> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      );
      const data = await response.json();

      if (data && data.address) {
        const addr = data.address;

        // Auto-fill street
        const street = addr.road || addr.street || addr.neighbourhood || addr.hamlet || '';
        if (street && !this.street) {
          this.street = street;
        }

        // Try to match barangay from suburb/neighbourhood
        const suburb = addr.suburb || addr.neighbourhood || addr.quarter || addr.village || '';
        if (suburb) {
          const matchedBarangay = this.baguioBarangays.find(
            (b) =>
              b.toLowerCase().includes(suburb.toLowerCase()) ||
              suburb.toLowerCase().includes(b.toLowerCase().split('(')[0].trim().toLowerCase()),
          );
          if (matchedBarangay && !this.barangay) {
            this.barangay = matchedBarangay;
          }
        }

        // If no barangay matched from address, use nearest barangay by coordinates
        if (!this.barangay) {
          const nearestBarangay = this.findNearestBarangay(lat, lng);
          if (nearestBarangay && !this.barangay) {
            this.barangay = nearestBarangay;
          }
        }
      }
    } catch (error) {
      console.warn('Could not reverse geocode for auto-fill:', error);
    }
  }

  // Find nearest barangay by coordinates - improved accuracy
  private findNearestBarangay(lat: number, lng: number): string | null {
    const BAGUIO_BARANGAY_COORDS: { [key: string]: [number, number] } = {
      'Asin (Pinsao East)': [16.4089, 120.5483],
      'Aurora Hill': [16.4119, 120.5556],
      'Bahpo': [16.388, 120.5397],
      'Beckel': [16.4139, 120.5447],
      'Bislig': [16.3928, 120.5517],
      'Bugnay': [16.4156, 120.5333],
      'Burnham': [16.4178, 120.5392],
      'Camp 1 (Kayang)': [16.4142, 120.5522],
      'Camp 2': [16.4067, 120.5556],
      'Camp 3 (Irisan)': [16.4247, 120.5333],
      'Cabangahan': [16.4153, 120.5228],
      'Calabatok': [16.4003, 120.5342],
      'Cambinan': [16.4214, 120.5267],
      'Capangan': [16.4261, 120.5361],
      'Chaguisian': [16.3978, 120.5583],
      'Cresencia': [16.4206, 120.5481],
      'Cutcut': [16.4089, 120.5178],
      'Dalindingan': [16.4114, 120.5289],
      'Dalupirip': [16.3853, 120.5383],
      'Demang': [16.4025, 120.5303],
      'Dikilili': [16.4136, 120.5114],
      'East Quirino Hill': [16.418, 120.5619],
      'Ekip': [16.4008, 120.5228],
      'Elias': [16.4167, 120.5403],
      'Guisad': [16.3939, 120.5442],
      'Hillside': [16.4189, 120.5586],
      'Honeymoon': [16.4047, 120.5464],
      'Imelda (formerly Pacdal)': [16.4314, 120.5392],
      'Irisan': [16.4247, 120.5333],
      'Kayang (Camp 1)': [16.4142, 120.5522],
      'Kias': [16.4036, 120.5136],
      'Kisad': [16.3997, 120.5361],
      'La Trinidad': [16.4217, 120.5153],
      'Longlong': [16.3953, 120.5253],
      'Loakan': [16.3778, 120.5531],
      'Lubas': [16.4094, 120.5392],
      'Lucban': [16.42, 120.5247],
      'Luntiang': [16.4214, 120.5506],
      'Madaymen': [16.4033, 120.5589],
      'Magsaysay': [16.3989, 120.5481],
      'Malugong': [16.3814, 120.5286],
      'Malolos': [16.4122, 120.5217],
      'Mandala': [16.4333, 120.5425],
      'Mangahas': [16.4281, 120.5225],
      'Marcoville': [16.4189, 120.5361],
      'Midtown': [16.4131, 120.5358],
      'Military Cutoff': [16.3889, 120.5364],
      'Mines View': [16.4081, 120.5522],
      'MinfrCut': [16.3842, 120.5356],
      'Modern Timber': [16.3964, 120.5086],
      'Mombong': [16.4178, 120.5136],
      'Moore': [16.4042, 120.5392],
      'New Lucban': [16.4042, 120.5517],
      'North Kabayan': [16.3867, 120.5175],
      'Outlook': [16.4164, 120.5575],
      'Pacdal': [16.4314, 120.5392],
      'Penalosa': [16.4286, 120.5286],
      'Pinsao East (Asin)': [16.4089, 120.5483],
      'Pinsao West': [16.4103, 120.5364],
      'Pilapil': [16.4158, 120.5261],
      'Puguis': [16.3797, 120.5425],
      'Quezon Hill': [16.4308, 120.5514],
      'Rock Quarry': [16.4267, 120.5447],
      'Rosario': [16.4175, 120.5225],
      'Sadjap': [16.4025, 120.5286],
      'Sago': [16.3903, 120.5236],
      'Salugan': [16.3942, 120.5392],
      'Salubetsu': [16.4183, 120.5303],
      'San Isidro': [16.4128, 120.5464],
      'San Luis': [16.4089, 120.5578],
      'San Roque': [16.3967, 120.5625],
      'Santa Cruz': [16.4172, 120.5325],
      'Santo Tomas': [16.4128, 120.5556],
      'Sapsap': [16.3889, 120.5233],
      'Shag': [16.3953, 120.5325],
      'Slaughter House': [16.3931, 120.5158],
      'Stonehill': [16.4006, 120.5614],
      'Suppang': [16.4019, 120.5303],
      'Taiwan': [16.3828, 120.5303],
      'Tandoc': [16.4122, 120.5122],
      'Taong Empleyado (TE)': [16.4289, 120.5556],
      'Teestahan': [16.4122, 120.5392],
      'The Pines': [16.3758, 120.5428],
      'Tikiwan': [16.3867, 120.5464],
      'Upper Tutubi': [16.3956, 120.5622],
      'Virac': [16.3906, 120.5158],
      'Vista Verde': [16.4267, 120.5353],
      'Wangal': [16.3936, 120.5578],
      'West Modern Timber': [16.4003, 120.5086],
      'West Quirino Hill': [16.4206, 120.5619],
      'Zamora Hill': [16.4219, 120.5625],
    };

    let nearestBarangay: string | null = null;
    let minDistance = Infinity;

    for (const [barangay, [bLat, bLng]] of Object.entries(BAGUIO_BARANGAY_COORDS)) {
      // Use haversine formula for more accurate distance calculation
      const distance = this.haversineDistance(lat, lng, bLat, bLng);

      if (distance < minDistance) {
        minDistance = distance;
        nearestBarangay = barangay;
      }
    }

    return nearestBarangay;
  }

  // Haversine formula for accurate geographic distance
  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  saveFormProgress(): void {
    // Optional: Save to sessionStorage if needed
  }
  /**
   * Handle file selection for photo upload
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.toastService.error('Please select an image file.');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.toastService.error('Image size must be less than 5MB.');
        return;
      }
      this.selectedFile = file;
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
        // Use data URL as imageUrl for now
        this.imageUrl = this.imagePreview;
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Remove selected photo
   */
  removePhoto(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.imageUrl = null;
  }
}
