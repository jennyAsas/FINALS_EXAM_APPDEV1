import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
  Input,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { BAGUIO_BARANGAY_CENTROIDS } from '../barangay-centroids';

interface LocationData {
  lat: number;
  lng: number;
  address?: string;
}

@Component({
  selector: 'app-interactive-location-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: `./interactive-location-picker.html`,
  styleUrl: `./interactive-location-picker.css`,
})
export class InteractiveLocationPickerComponent implements OnInit, OnDestroy {
  @Output() locationSelected = new EventEmitter<LocationData>();
  @Input() defaultLocation: LocationData = { lat: 16.4023, lng: 120.5961 }; // Baguio City center

  // Inputs for bidirectional sync from form fields
  @Input() set barangayInput(value: string) {
    if (value && value !== this._lastBarangay) {
      this._lastBarangay = value;
      this.geocodeBarangayToMap(value);
    }
  }
  @Input() set streetInput(value: string) {
    if (value) {
      this._lastStreet = value;
    }
  }

  private _lastBarangay = '';
  private _lastStreet = '';

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  // State
  currentLocation: LocationData = { ...this.defaultLocation };
  searchQuery = '';
  searchSuggestions: Array<{ name: string; address: string; lat: number; lng: number }> = [];
  showSuggestions = false;
  isLoading = false;
  outsideBaguioWarning = false; // Notification for clicking outside Baguio
  locationConfirmed = false; // Shows when location has been saved to form

  private map!: L.Map;
  private marker!: L.Marker;
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  // Baguio City bounds (restrict map to this area)
  private baguioBounds = L.latLngBounds(
    L.latLng(16.35, 120.52), // Southwest corner
    L.latLng(16.48, 120.66), // Northeast corner
  );

  // Custom marker icon to ensure visibility
  private markerIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  // Nominatim API base URL
  private nominatimUrl = 'https://nominatim.openstreetmap.org';

  ngOnInit(): void {
    this.initializeMap();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) {
      this.map.remove();
    }
  }

  private initializeMap(): void {
    // Initialize Leaflet map centered on Baguio City with bounds restriction
    this.map = L.map(this.mapContainer.nativeElement, {
      maxBounds: this.baguioBounds,
      maxBoundsViscosity: 1.0,
      minZoom: 12,
      maxZoom: 19,
    }).setView([this.currentLocation.lat, this.currentLocation.lng], 14);

    // Add OSM tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    // Add marker with custom icon for visibility
    this.marker = L.marker([this.currentLocation.lat, this.currentLocation.lng], {
      draggable: true,
      icon: this.markerIcon,
    }).addTo(this.map);

    // Add popup to marker
    this.marker.bindPopup('Drag me or click on the map').openPopup();

    // Map click handler - drop pin (only within Baguio bounds)
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.baguioBounds.contains(e.latlng)) {
        this.outsideBaguioWarning = false;
        this.updateMarkerPosition(e.latlng.lat, e.latlng.lng);
      } else {
        // Show warning notification for clicking outside Baguio
        this.outsideBaguioWarning = true;
        setTimeout(() => {
          this.outsideBaguioWarning = false;
        }, 4000);
      }
    });

    // Marker drag handler
    this.marker.on('dragend', () => {
      const latlng = this.marker.getLatLng();
      if (this.baguioBounds.contains(latlng)) {
        this.outsideBaguioWarning = false;
        this.updateMarkerPosition(latlng.lat, latlng.lng);
      } else {
        // Reset if dragged outside Baguio and show warning
        this.marker.setLatLng([this.currentLocation.lat, this.currentLocation.lng]);
        this.outsideBaguioWarning = true;
        setTimeout(() => {
          this.outsideBaguioWarning = false;
        }, 4000);
      }
    });
  }

  private updateMarkerPosition(lat: number, lng: number): void {
    this.currentLocation.lat = lat;
    this.currentLocation.lng = lng;
    this.marker.setLatLng([lat, lng]);
    this.marker.setPopupContent('Location selected');
    this.reverseGeocode(lat, lng);
    // Emit location immediately for real-time sync
    this.locationSelected.emit({ ...this.currentLocation });
  }

  private setupSearch(): void {
    this.searchSubject$
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        if (query.length > 2) {
          this.performSearch(query);
        } else {
          this.searchSuggestions = [];
        }
      });
  }

  onSearchInput(): void {
    this.searchSubject$.next(this.searchQuery);
    if (this.searchQuery.length > 0) {
      this.showSuggestions = true;
    } else {
      this.showSuggestions = false;
      this.searchSuggestions = [];
    }
  }

  onSearchFocus(): void {
    if (this.searchSuggestions.length > 0) {
      this.showSuggestions = true;
    }
  }

  closeSuggestions(): void {
    this.showSuggestions = false;
  }

  private performSearch(query: string): void {
    this.isLoading = true;
    const lowerQuery = query.toLowerCase().trim();

    // Use shared barangay centroid list (typed)
    const BAGUIO_BARANGAYS: { [key: string]: [number, number] } = BAGUIO_BARANGAY_CENTROIDS;

    // Check for exact barangay matches first (highest priority)
    const exactMatches = Object.entries(BAGUIO_BARANGAYS)
      .filter(([name]) => name.toLowerCase().includes(lowerQuery))
      .slice(0, 5)
      .map(([name, coords]) => ({
        name,
        address: `${name}, Baguio City, Benguet, Philippines`,
        lat: coords[0],
        lng: coords[1],
      }));

    if (exactMatches.length > 0) {
      this.searchSuggestions = exactMatches;
      this.showSuggestions = true;
      this.isLoading = false;
      return;
    }

    // Fall back to Nominatim API with Baguio City geobounding
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Baguio City')}&limit=5&viewbox=120.52,16.48,120.66,16.35&bounded=1`;

    fetch(nominatimUrl)
      .then((response) => response.json())
      .then((results) => {
        // If bounded search returns results, use them
        if (results && results.length > 0) {
          this.searchSuggestions = results.map((result: any) => ({
            name: result.display_name.split(',')[0],
            address: result.display_name,
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
          }));
          this.showSuggestions = true;
          this.isLoading = false;
        } else {
          // No results in Baguio - try fallback global search
          this.performGlobalSearch(query);
        }
      })
      .catch(() => {
        this.isLoading = false;
        this.searchSuggestions = [];
      });
  }

  private performGlobalSearch(query: string): void {
    const url = `${this.nominatimUrl}/search?format=json&q=${encodeURIComponent(query)}&limit=3&addressdetails=1`;

    fetch(url)
      .then((response) => response.json())
      .then((results) => {
        this.searchSuggestions = results.slice(0, 3).map((result: any) => ({
          name: result.display_name.split(',')[0],
          address: result.display_name,
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        }));
        this.showSuggestions = true;
        this.isLoading = false;
      })
      .catch(() => {
        this.isLoading = false;
        this.searchSuggestions = [];
      });
  }

  searchLocation(): void {
    if (this.searchQuery.length > 0) {
      this.performSearch(this.searchQuery);
    }
  }

  selectSuggestion(suggestion: { name: string; address: string; lat: number; lng: number }): void {
    // Check if selected location is within Baguio City bounds
    const selectedLatLng = L.latLng(suggestion.lat, suggestion.lng);

    if (!this.baguioBounds.contains(selectedLatLng)) {
      // Show warning for locations outside Baguio City
      this.outsideBaguioWarning = true;
      this.showSuggestions = false;
      this.searchQuery = '';
      setTimeout(() => {
        this.outsideBaguioWarning = false;
      }, 4000);
      return;
    }

    this.currentLocation = {
      lat: suggestion.lat,
      lng: suggestion.lng,
      address: suggestion.address,
    };
    this.showSuggestions = false;
    this.searchQuery = '';
    this.outsideBaguioWarning = false;

    // Center map and update marker smoothly
    this.marker.setLatLng([suggestion.lat, suggestion.lng]);
    this.map.flyTo([suggestion.lat, suggestion.lng], 16, {
      duration: 0.8,
      easeLinearity: 0.25,
    });

    // Emit location immediately for real-time sync to form
    this.locationSelected.emit({ ...this.currentLocation });
  }

  private reverseGeocode(lat: number, lng: number): void {
    const url = `${this.nominatimUrl}/reverse?format=json&lat=${lat}&lon=${lng}`;

    fetch(url)
      .then((response) => response.json())
      .then((result) => {
        this.currentLocation.address = result.address ? result.display_name : undefined;
        // Emit location update for real-time sync
        this.locationSelected.emit({ ...this.currentLocation });
      })
      .catch(() => {
        // Silently fail - coordinates still valid
        this.locationSelected.emit({ ...this.currentLocation });
      });
  }

  onCoordinateChange(): void {
    if (this.isLocationValid()) {
      this.updateMarkerPosition(this.currentLocation.lat, this.currentLocation.lng);
    }
  }

  isLocationValid(): boolean {
    return (
      this.currentLocation.lat >= -90 &&
      this.currentLocation.lat <= 90 &&
      this.currentLocation.lng >= -180 &&
      this.currentLocation.lng <= 180
    );
  }

  confirmLocation(): void {
    if (!this.isLocationValid()) {
      return;
    }

    const confirmedLatLng = L.latLng(this.currentLocation.lat, this.currentLocation.lng);

    // Final check: ensure location is within Baguio City
    if (!this.baguioBounds.contains(confirmedLatLng)) {
      this.outsideBaguioWarning = true;
      this.locationConfirmed = false;
      setTimeout(() => {
        this.outsideBaguioWarning = false;
      }, 4000);
      return;
    }

    // Location is valid and within Baguio City - save to form fields only (not submit report)
    this.locationConfirmed = true;
    this.marker.setPopupContent('Location saved');
    this.marker.openPopup();

    // Emit to parent to save coordinates to form fields
    this.locationSelected.emit({ ...this.currentLocation });

    // Reset visual feedback after a moment
    setTimeout(() => {
      this.marker.setPopupContent('Location selected');
    }, 3000);
  }

  // Geocode barangay name to coordinates for bidirectional sync
  private geocodeBarangayToMap(barangayName: string): void {
    if (!this.map || !this.marker) return;

    const BAGUIO_BARANGAYS: { [key: string]: [number, number] } = BAGUIO_BARANGAY_CENTROIDS;
    const normalizedName = barangayName.trim().toLowerCase();

    // Find exact or partial match
    const match = Object.entries(BAGUIO_BARANGAYS).find(
      ([name]) =>
        name.toLowerCase() === normalizedName ||
        name.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(name.toLowerCase().split('(')[0].trim()),
    );

    if (match) {
      const [name, coords] = match;
      const lat = coords[0];
      const lng = coords[1];

      // Update map position and marker
      this.currentLocation.lat = lat;
      this.currentLocation.lng = lng;
      this.currentLocation.address = `${name}, Baguio City, Philippines`;
      this.marker.setLatLng([lat, lng]);
      this.map.flyTo([lat, lng], 15, { duration: 0.8 });
    }
  }
}
