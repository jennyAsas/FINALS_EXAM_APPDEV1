import { Component, OnInit, inject, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { Data } from '../data';
import { Incident, RiskZone } from '../models';
import { AuthService } from '../auth.service';
import { ReportService, Report } from '../report.service';
import { AnimationService } from '../animation.service';
import { LocationSearchService, LocationSuggestion } from '../location-search.service';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { Observable } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Cluster interface for grouping nearby reports
interface Cluster {
  center: [number, number]; // [lat, lng]
  reports: Report[];
}

@Component({
  standalone: true,
  selector: 'app-map',
  templateUrl: './map.html',
  styleUrl: './map.css',
  imports: [CommonModule, FormsModule],
})
export class Map implements OnInit, AfterViewInit, OnDestroy {
  private data = inject(Data);
  private auth = inject(AuthService);
  private reportService = inject(ReportService);
  private router = inject(Router);
  private animationService = inject(AnimationService);
  private locationSearchService = inject(LocationSearchService);
  private map!: L.Map;
  private readonly BAGUIO_COORDS: L.LatLngExpression = [16.4167, 120.5933];
  // Baguio City approximate bounds
  private readonly BAGUIO_BOUNDS: L.LatLngBoundsExpression = [
    [16.35, 120.52], // Southwest corner
    [16.48, 120.66], // Northeast corner
  ];

  // Search properties
  searchQuery: string = '';
  locationSuggestions: LocationSuggestion[] = [];
  showSuggestions: boolean = false;
  selectedSearchLocation: LocationSuggestion | null = null;
  private searchMarker: L.Marker | null = null;

  // Notification properties
  notificationMessage: string = '';
  notificationType: 'error' | 'success' | 'warning' = 'error';
  private notificationTimeout: any;

  // Barangay centroids for accurate fallback mapping when GPS is not available
  private readonly BARANGAY_CENTROIDS: { [key: string]: [number, number] } = {
    'A. Bonifacio-Caguioa-Rimando (ABCR)': [16.4142, 120.5947],
    'Abanao-Zandueta-Kayong-Chugum-Otek (AZKCO)': [16.4153, 120.5934],
    'Alfonso Tabora': [16.4234, 120.5969],
    Ambiong: [16.4288, 120.6081],
    'Andres Bonifacio (Lower Bokawkan)': [16.4174, 120.5856],
    'Apugan-Loakan': [16.3828, 120.6175],
    'Asin Road': [16.4046, 120.5636],
    'Atok Trail': [16.3792, 120.6307],
    'Aurora Hill Proper (Malvar-Sgt. Floresca)': [16.4245, 120.603],
    'Aurora Hill, North Central': [16.4278, 120.6042],
    'Aurora Hill, South Central': [16.4254, 120.6069],
    'Bagong Lipunan (Market Area)': [16.4153, 120.596],
    'Baguio Dairy Farm': [16.382, 120.5694],
    'Bakakeng Central': [16.3908, 120.5839],
    'Bakakeng North': [16.3969, 120.5878],
    'Bal-Marcoville (Marcoville)': [16.4089, 120.6017],
    Balsigan: [16.4047, 120.5889],
    'Bayan Park East': [16.4278, 120.6125],
    'Bayan Park Village': [16.4264, 120.6108],
    'Bayan Park West (Bayan Park)': [16.4267, 120.6083],
    'BGH Compound': [16.4008, 120.5922],
    Brookside: [16.4225, 120.6058],
    Brookspoint: [16.4258, 120.6153],
    "Cabinet Hill-Teacher's Camp": [16.4158, 120.6067],
    'Camdas Subdivision': [16.4272, 120.5975],
    'Camp 7': [16.3769, 120.5939],
    'Camp 8': [16.3917, 120.5967],
    'Camp Allen': [16.4147, 120.5892],
    'Campo Filipino': [16.4169, 120.5861],
    'City Camp Central': [16.4117, 120.5869],
    'City Camp Proper': [16.4108, 120.5858],
    'Country Club Village': [16.41, 120.6189],
    'Cresencia Village': [16.4142, 120.5867],
    Dagisitan: [16.4269, 120.5986],
    'Dagsian, Lower': [16.3986, 120.6028],
    'Dagsian, Upper': [16.4011, 120.6025],
    'Dizon Subdivision': [16.4286, 120.5989],
    'Dominican Hill-Mirador': [16.4097, 120.5794],
    Dontogan: [16.3758, 120.5736],
    'DPS Area': [16.4039, 120.5986],
    "Engineers' Hill": [16.4111, 120.6011],
    'Fairview Village': [16.4128, 120.5819],
    'Ferdinand (Happy Homes-Campo Sioco)': [16.4061, 120.5869],
    'Fort del Pilar': [16.3886, 120.6192],
    'Gabriel Silang': [16.4006, 120.6053],
    'General Emilio F. Aguinaldo (Quirino-Magsaysay, Upper)': [16.4239, 120.5919],
    'General Luna, Lower': [16.4136, 120.5997],
    'General Luna, Upper': [16.415, 120.6014],
    Gibraltar: [16.4183, 120.6278],
    'Greenwater Village': [16.4056, 120.6083],
    'Guisad Central': [16.4217, 120.5839],
    'Guisad Sorong': [16.425, 120.5819],
    'Happy Hollow': [16.4036, 120.6306],
    'Happy Homes (Happy Homes-Lucban)': [16.4239, 120.5936],
    'Harrison-Claudio Carantes': [16.4131, 120.5956],
    Hillside: [16.3981, 120.605],
    'Holy Ghost Extension': [16.4189, 120.5994],
    'Holy Ghost Proper': [16.4172, 120.5969],
    'Honeymoon (Honeymoon-Holy Ghost)': [16.4206, 120.5947],
    'Imelda R. Marcos (La Salle)': [16.4083, 120.6014],
    'Imelda Village': [16.4167, 120.6056],
    Irisan: [16.4083, 120.5606],
    Kabayanihan: [16.4144, 120.5931],
    Kagitingan: [16.4156, 120.5908],
    'Kayang Extension': [16.4167, 120.5925],
    'Kayang-Hilltop': [16.4161, 120.5942],
    Kias: [16.3667, 120.6233],
    'Legarda-Burnham-Kisad': [16.4111, 120.5917],
    'Liwanag-Loakan': [16.3889, 120.6125],
    'Loakan Proper': [16.3833, 120.6167],
    'Lopez Jaena': [16.4183, 120.6011],
    'Lourdes Subdivision Extension': [16.4089, 120.585],
    'Lourdes Subdivision, Lower': [16.4097, 120.5883],
    'Lourdes Subdivision, Proper': [16.4086, 120.5869],
    Lualhati: [16.4136, 120.615],
    Lucnab: [16.4133, 120.6308],
    'Magsaysay Private Road': [16.4192, 120.5964],
    'Magsaysay, Lower': [16.4208, 120.5947],
    'Magsaysay, Upper': [16.4222, 120.5958],
    'Malcolm Square-Perfecto (Jose Abad Santos)': [16.415, 120.5958],
    'Manuel A. Roxas': [16.4183, 120.6031],
    'Market Subdivision, Upper': [16.4164, 120.5975],
    'Middle Quezon Hill Subdivision (Quezon Hill Middle)': [16.42, 120.58],
    'Military Cut-off': [16.4067, 120.5983],
    'Mines View Park': [16.4244, 120.6331],
    'Modern Site, East': [16.425, 120.6042],
    'Modern Site, West': [16.425, 120.6028],
    'MRR-Queen of Peace': [16.4111, 120.5844],
    'New Lucban': [16.4214, 120.5925],
    'Outlook Drive': [16.4139, 120.6225],
    Pacdal: [16.425, 120.6194],
    'Padre Burgos': [16.4161, 120.59],
    'Padre Zamora': [16.4194, 120.5939],
    'Palma-Urbano (Cariño-Palma)': [16.405, 120.595],
    'Phil-Am': [16.42, 120.605],
    Pinget: [16.435, 120.58],
    'Pinsao Pilot Project': [16.4294, 120.575],
    'Pinsao Proper': [16.4333, 120.5722],
    Poliwes: [16.3983, 120.5933],
    Pucsusan: [16.4214, 120.6264],
    'Quezon Hill Proper': [16.4233, 120.5783],
    'Quezon Hill, Upper': [16.425, 120.5767],
    'Quirino Hill, East': [16.43, 120.5883],
    'Quirino Hill, Lower': [16.4283, 120.59],
    'Quirino Hill, Middle': [16.43, 120.59],
    'Quirino Hill, West': [16.43, 120.5867],
    'Quirino-Magsaysay, Lower (Quirino-Magsaysay, West)': [16.4225, 120.5933],
    'Rizal Monument Area': [16.4131, 120.5931],
    'Rock Quarry, Lower': [16.4083, 120.5883],
    'Rock Quarry, Middle': [16.4094, 120.5867],
    'Rock Quarry, Upper': [16.4106, 120.585],
    'Salud Mitra': [16.4167, 120.5983],
    'San Antonio Village': [16.4167, 120.6083],
    'San Luis Village': [16.3917, 120.5833],
    'San Roque Village': [16.395, 120.575],
    'San Vicente': [16.3917, 120.5917],
    'Sanitary Camp, North': [16.4367, 120.6028],
    'Sanitary Camp, South': [16.435, 120.6028],
    'Santa Escolastica': [16.4044, 120.6017],
    'Santo Rosario': [16.4161, 120.5833],
    'Santo Tomas Proper': [16.37, 120.56],
    'Santo Tomas School Area': [16.375, 120.565],
    'Scout Barrio': [16.3992, 120.6133],
    'Session Road Area': [16.4125, 120.5964],
    'Slaughter House Area (Santo Niño Slaughter)': [16.4267, 120.5942],
    'SLU-SVP Housing Village': [16.4022, 120.59],
    'South Drive': [16.4139, 120.6139],
    'Teodora Alonzo': [16.4117, 120.59],
    Trancoville: [16.4222, 120.6028],
    'Upper General Luna': [16.415, 120.6014],
    'Victoria Village': [16.4172, 120.5811],
    'Websters Subdivision': [16.4178, 120.585],
  };

  private incidentsLayer: L.LayerGroup = L.layerGroup();
  private eventListenerBound = false;
  private allReports: Report[] = [];
  private reportsSubscription?: Subscription;

  activeFilter: 'all' | 'high' | 'medium' | 'low' = 'all';

  ngOnInit() {
    setTimeout(() => {
      this.initMap();
      this.loadApprovedReports();
    }, 100);

    // Listen for custom event from popup button
    if (!this.eventListenerBound) {
      window.addEventListener('viewIncidentDetail', ((event: CustomEvent) => {
        this.viewReportDetail(event.detail);
      }) as EventListener);
      this.eventListenerBound = true;
    }
  }

  setFilter(filter: 'all' | 'high' | 'medium' | 'low') {
    this.activeFilter = filter;
    this.displayFilteredMarkers();

    // Zoom to filtered markers after a brief delay to allow rendering
    setTimeout(() => {
      this.zoomToFilteredMarkers();
    }, 100);
  }

  /**
   * Handle search input with debouncing
   */
  onSearchInput(query: string): void {
    this.searchQuery = query;

    if (query.trim().length === 0) {
      this.locationSuggestions = [];
      this.showSuggestions = false;
      return;
    }

    this.locationSearchService.searchLocations(query).subscribe((suggestions) => {
      this.locationSuggestions = suggestions;
      this.showSuggestions = suggestions.length > 0;
    });
  }

  /**
   * Select a location from suggestions
   */
  selectLocation(suggestion: LocationSuggestion): void {
    // Validate location is within Baguio bounds
    if (!this.isLocationInBaguio(suggestion.coordinates)) {
      this.showNotification(
        '⚠️ Location is outside Baguio City bounds. Please select a location within Baguio.',
        'error',
      );
      return;
    }

    this.selectedSearchLocation = suggestion;
    this.searchQuery = suggestion.name;
    this.showSuggestions = false;

    // Remove previous search marker
    if (this.searchMarker) {
      this.map.removeLayer(this.searchMarker);
    }

    // Add marker for selected location
    const searchIcon = L.divIcon({
      className: 'search-marker-icon',
      html: `<div style="
        width: 32px; 
        height: 32px; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%; 
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.6);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      ">
        📍
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    this.searchMarker = L.marker(suggestion.coordinates, { icon: searchIcon });

    const popupContent = `
      <div style="padding: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <h4 style="margin: 0 0 8px 0; color: #333;">${suggestion.name}</h4>
        <p style="margin: 0; font-size: 12px; color: #666;">
          <strong>Type:</strong> ${suggestion.type === 'barangay' ? 'Barangay' : 'Street/Landmark'}
        </p>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #888;">
          Lat: ${suggestion.coordinates[0].toFixed(4)}, Lng: ${suggestion.coordinates[1].toFixed(4)}
        </p>
      </div>
    `;

    this.searchMarker.bindPopup(popupContent).openPopup();
    this.map.addLayer(this.searchMarker);

    // Zoom to selected location
    this.map.setView(suggestion.coordinates, 15, { animate: true, duration: 0.5 });
  }

  /**
   * Save selected location (updates incident form fields)
   */
  saveSelectedLocation(): void {
    if (!this.selectedSearchLocation) {
      this.showNotification('No location selected', 'error');
      return;
    }

    // Validate location is in Baguio
    if (!this.isLocationInBaguio(this.selectedSearchLocation.coordinates)) {
      this.showNotification(
        '⚠️ Cannot save: Location is outside Baguio City. Please select a location within Baguio.',
        'error',
      );
      return;
    }

    // Emit location data for the incident form (or update global state)
    const locationData = {
      barangay: this.selectedSearchLocation.barangay,
      street: this.selectedSearchLocation.name,
      latitude: this.selectedSearchLocation.coordinates[0],
      longitude: this.selectedSearchLocation.coordinates[1],
      type: this.selectedSearchLocation.type,
    };

    // Dispatch event that other components can listen to
    const event = new CustomEvent('locationSelected', { detail: locationData });
    window.dispatchEvent(event);

    this.showNotification(
      `✓ Location "${this.selectedSearchLocation.name}" saved successfully!`,
      'success',
    );

    // Keep marker visible and location panel open
  }

  /**
   * Check if location is within Baguio City bounds
   */
  private isLocationInBaguio(coordinates: [number, number]): boolean {
    const [lat, lng] = coordinates;
    const bounds = this.BAGUIO_BOUNDS as [[number, number], [number, number]];
    const [swLat, swLng] = bounds[0];
    const [neLat, neLng] = bounds[1];

    return lat >= swLat && lat <= neLat && lng >= swLng && lng <= neLng;
  }

  /**
   * Show notification message
   */
  private showNotification(message: string, type: 'error' | 'success' | 'warning' = 'error'): void {
    this.notificationMessage = message;
    this.notificationType = type;

    // Auto-hide after 5 seconds
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }

    this.notificationTimeout = setTimeout(() => {
      this.notificationMessage = '';
    }, 5000);
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.locationSuggestions = [];
    this.showSuggestions = false;
    this.selectedSearchLocation = null;

    if (this.searchMarker) {
      this.map.removeLayer(this.searchMarker);
      this.searchMarker = null;
    }
  }

  /**
   * Handle search button click
   */
  searchLocation(): void {
    if (this.locationSuggestions.length > 0) {
      this.selectLocation(this.locationSuggestions[0]);
    } else if (this.searchQuery.trim().length === 0) {
      this.showNotification('Please enter a location to search', 'warning');
    } else {
      this.showNotification(
        'No locations found. Try searching by barangay or street name.',
        'warning',
      );
    }
  }

  ngOnDestroy() {
    // Clean up observers to prevent memory leaks
    this.animationService.destroyScrollObserver();
    if (this.map) {
      this.map.remove();
    }
    if (this.reportsSubscription) {
      this.reportsSubscription.unsubscribe();
    }
  }

  private initMap(): void {
    if (!this.map) {
      this.map = L.map('mountainSentinelMap', {
        center: this.BAGUIO_COORDS,
        zoom: 13,
        maxBounds: this.BAGUIO_BOUNDS,
        maxBoundsViscosity: 0.5, // Allows slight dragging outside bounds
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 12,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(this.map);

      this.incidentsLayer.addTo(this.map);

      // Set initial view to Baguio City bounds
      this.map.fitBounds(this.BAGUIO_BOUNDS);
    }
  }

  private loadApprovedReports(): void {
    // Subscribe to real-time updates of approved reports
    this.reportsSubscription = this.reportService
      .getAllReports()
      .pipe(
        map((reports) => {
          console.log('All reports:', reports);
          const approved = reports.filter((r) => r.status === 'approved');
          console.log(
            'Approved reports with location:',
            approved.filter((r) => r.location),
          );
          return approved;
        }),
      )
      .subscribe((reports) => {
        this.allReports = reports;
        this.displayFilteredMarkers();

        // Auto-zoom to markers when new reports arrive
        if (this.activeFilter === 'all') {
          setTimeout(() => this.zoomToFilteredMarkers(), 300);
        }
      });
  }

  private displayFilteredMarkers(): void {
    this.incidentsLayer.clearLayers();

    const filteredReports =
      this.activeFilter === 'all'
        ? this.allReports
        : this.allReports.filter((report) => report.priority === this.activeFilter);

    // Separate reports with GPS and without GPS
    const reportsWithGPS = filteredReports.filter(
      (r) => r.location && r.location.lat && r.location.lng,
    );
    const reportsWithoutGPS = filteredReports.filter(
      (r) => !r.location || !r.location.lat || !r.location.lng,
    );

    if (reportsWithGPS.length === 0 && reportsWithoutGPS.length === 0) {
      return; // No reports to display
    }

    // Process reports with GPS coordinates (clustering)
    if (reportsWithGPS.length > 0) {
      const clusters = this.createClusters(reportsWithGPS);

      clusters.forEach((cluster) => {
        if (cluster.reports.length === 1) {
          // Single report - show regular marker
          const report = cluster.reports[0];
          const priority = report.priority || 'low';
          const coords: L.LatLngExpression = [report.location!.lat, report.location!.lng];

          const reportIcon = L.divIcon({
            className: 'custom-marker-icon',
            html: `<div class="marker-pin marker-${priority}" style="
              width: 35px; 
              height: 35px; 
              background-color: ${this.getPriorityColor(priority)}; 
              border-radius: 50% 50% 50% 0; 
              transform: rotate(-45deg); 
              border: 3px solid white;
              box-shadow: 0 3px 8px rgba(0,0,0,0.4);
              position: relative;
              cursor: pointer;
            ">
              <div style="
                position: absolute;
                width: 16px;
                height: 16px;
                background-color: white;
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
              "></div>
            </div>`,
            iconSize: [35, 35],
            iconAnchor: [17.5, 35],
            popupAnchor: [0, -35],
          });

          const marker = L.marker(coords, { icon: reportIcon });
          this.addMarkerPopup(marker, report);
          this.incidentsLayer.addLayer(marker);
        } else {
          // Multiple reports - show cluster with number indicator
          const clusterCenter = cluster.center;
          const clusterIcon = L.divIcon({
            className: 'cluster-icon',
            html: `<div class="cluster-pin" style="
              width: 45px; 
              height: 45px; 
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
              border-radius: 50%; 
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(255, 107, 107, 0.5);
              position: relative;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              color: white;
              font-size: 18px;
              text-shadow: 0 1px 2px rgba(0,0,0,0.3);
            ">
              ${cluster.reports.length}
            </div>`,
            iconSize: [45, 45],
            iconAnchor: [22.5, 45],
            popupAnchor: [0, -45],
          });

          const clusterMarker = L.marker(clusterCenter, { icon: clusterIcon });

          // Create popup showing all incidents in cluster
          const popupContent = this.createClusterPopup(cluster);
          clusterMarker.bindPopup(popupContent, {
            maxWidth: 380,
            className: 'cluster-popup',
          });

          clusterMarker.on('click', () => {
            clusterMarker.openPopup();
          });

          this.incidentsLayer.addLayer(clusterMarker);
        }
      });
    }

    // Process reports without GPS - use barangay fallback
    if (reportsWithoutGPS.length > 0) {
      const barangayGroups: { [key: string]: Report[] } = {};

      // Group reports by barangay
      reportsWithoutGPS.forEach((report) => {
        const barangay = report.barangay || 'Unknown Location';
        if (!barangayGroups[barangay]) {
          barangayGroups[barangay] = [];
        }
        barangayGroups[barangay].push(report);
      });

      // Create markers for each barangay group
      Object.entries(barangayGroups).forEach(([barangay, reports]) => {
        // Resolve centroid using resilient lookup (exact, case-insensitive, partial)
        const centroid = this.getBarangayCentroid(barangay);

        // Only show markers for barangays we have accurate coordinates for
        if (!centroid) {
          console.warn(`No coordinates found for barangay: ${barangay}`);
          return;
        }

        const priority = reports[0]?.priority || 'low';

        if (reports.length === 1) {
          // Single report without GPS - show muted marker
          const report = reports[0];
          const fallbackIcon = L.divIcon({
            className: 'fallback-marker-icon',
            html: `<div class="marker-pin marker-fallback" style="
              width: 35px; 
              height: 35px; 
              background-color: #999; 
              border-radius: 50% 50% 50% 0; 
              transform: rotate(-45deg); 
              border: 3px solid white;
              box-shadow: 0 3px 8px rgba(0,0,0,0.2);
              position: relative;
              cursor: pointer;
              opacity: 0.7;
            ">
              <div style="
                position: absolute;
                width: 16px;
                height: 16px;
                background-color: white;
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
              "></div>
            </div>`,
            iconSize: [35, 35],
            iconAnchor: [17.5, 35],
            popupAnchor: [0, -35],
          });

          const marker = L.marker(centroid, { icon: fallbackIcon });
          this.addMarkerPopup(marker, report);
          this.incidentsLayer.addLayer(marker);
        } else {
          // Multiple reports without GPS - show barangay cluster
          const barangayIcon = L.divIcon({
            className: 'barangay-cluster-icon',
            html: `<div class="barangay-cluster-pin" style="
              width: 45px; 
              height: 45px; 
              background: linear-gradient(135deg, #9370DB 0%, #6A5ACD 100%);
              border-radius: 50%; 
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(147, 112, 219, 0.5);
              position: relative;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              color: white;
              font-size: 18px;
              text-shadow: 0 1px 2px rgba(0,0,0,0.3);
              opacity: 0.8;
            ">
              ${reports.length}+
            </div>`,
            iconSize: [45, 45],
            iconAnchor: [22.5, 45],
            popupAnchor: [0, -45],
          });

          const barangayMarker = L.marker(centroid, { icon: barangayIcon });

          // Create popup for barangay cluster
          const popupContent = `
            <div style="padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <h3 style="margin: 0 0 12px 0; color: #333; font-size: 14px; border-bottom: 2px solid #9370DB; padding-bottom: 8px;">
                ${barangay} (${reports.length} reports without GPS)
              </h3>
              <div style="max-height: 200px; overflow-y: auto; margin-bottom: 12px;">
                ${reports
                  .map(
                    (report) =>
                      `
                  <div style="padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; font-size: 12px;"
                       onclick="window.dispatchEvent(new CustomEvent('viewIncidentDetail', { detail: '${report.id}' }))"
                       onmouseover="this.style.backgroundColor='#f5f5f5';" 
                       onmouseout="this.style.backgroundColor='transparent';">
                    <div style="font-weight: 600; color: ${this.getPriorityColor(report.priority || 'low')};">
                      ${this.getPriorityIcon(report.priority || 'low')} ${report.description.substring(0, 40)}...
                    </div>
                  </div>
                `,
                  )
                  .join('')}
              </div>
              <small style="color: #666;">Note: These reports use barangay-based mapping (no GPS available)</small>
            </div>
          `;

          barangayMarker.bindPopup(popupContent, {
            maxWidth: 380,
            className: 'cluster-popup',
          });

          barangayMarker.on('click', () => {
            barangayMarker.openPopup();
          });

          this.incidentsLayer.addLayer(barangayMarker);
        }
      });
    }
  }

  /**
   * Create clusters from reports using grid-based clustering
   */
  private createClusters(reports: Report[]): Cluster[] {
    const clusters: Cluster[] = [];
    const assigned = new Set<string>();
    // Determine clustering radius (km) based on current map zoom — tighter clusters when zoomed in
    const zoom = this.map ? this.map.getZoom() : 13;
    let clusterRadiusKm = 1.0; // default 1 km
    if (zoom >= 15) {
      clusterRadiusKm = 0.25; // ~250m at high zoom
    } else if (zoom >= 13) {
      clusterRadiusKm = 0.5; // ~500m at medium zoom
    } else {
      clusterRadiusKm = 1.5; // broader clustering at low zoom
    }

    // Override: only cluster if reports are essentially at the same location
    // Use a hard cap so clustering only happens within ~50 meters (0.05 km)
    const SAME_LOCATION_RADIUS_KM = 0.05; // 50 meters
    clusterRadiusKm = Math.min(clusterRadiusKm, SAME_LOCATION_RADIUS_KM);

    reports.forEach((report) => {
      if (assigned.has(report.id)) return;

      const cluster: Cluster = {
        center: [report.location!.lat, report.location!.lng],
        reports: [report],
      };
      assigned.add(report.id);

      // Find nearby reports within cluster distance
      reports.forEach((otherReport) => {
        if (assigned.has(otherReport.id) || otherReport.id === report.id) return;

        const distance = this.haversineDistance(
          report.location!.lat,
          report.location!.lng,
          otherReport.location!.lat,
          otherReport.location!.lng,
        );

        if (distance <= clusterRadiusKm) {
          // Reports are within the same location threshold
          cluster.reports.push(otherReport);
          assigned.add(otherReport.id);
        }
      });

      // Calculate cluster center
      if (cluster.reports.length > 1) {
        const avgLat =
          cluster.reports.reduce((sum, r) => sum + r.location!.lat, 0) / cluster.reports.length;
        const avgLng =
          cluster.reports.reduce((sum, r) => sum + r.location!.lng, 0) / cluster.reports.length;
        cluster.center = [avgLat, avgLng];
      }

      clusters.push(cluster);
    });

    return clusters;
  }

  // Resolve barangay centroid coordinates robustly.
  private getBarangayCentroid(barangayName: string): [number, number] | null {
    if (!barangayName) return null;
    const name = barangayName.trim();

    // Exact key
    if (this.BARANGAY_CENTROIDS[name]) {
      return this.BARANGAY_CENTROIDS[name];
    }

    // Case-insensitive exact match
    const ciExact = Object.entries(this.BARANGAY_CENTROIDS).find(
      ([k]) => k.toLowerCase() === name.toLowerCase(),
    );
    if (ciExact) return ciExact[1];

    // Partial match (either direction)
    const partial = Object.entries(this.BARANGAY_CENTROIDS).find(
      ([k]) =>
        k.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(k.toLowerCase()),
    );
    if (partial) return partial[1];

    return null;
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Create popup content for cluster showing all incidents
   */
  private createClusterPopup(cluster: Cluster): string {
    const reportList = cluster.reports
      .map((report, index) => {
        const priority = report.priority || 'low';
        const priorityColor = this.getPriorityColor(priority);
        const description = (report.description || 'No description').substring(0, 45);
        const truncated = description.length >= 45 ? '...' : '';
        return `
      <div style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;" 
           onclick="window.dispatchEvent(new CustomEvent('viewIncidentDetail', { detail: '${report.id}' }))"
           onmouseover="this.style.backgroundColor='#f5f5f5';" 
           onmouseout="this.style.backgroundColor='transparent';">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <div style="width: 8px; height: 8px; background: ${priorityColor}; border-radius: 50%; flex-shrink: 0;"></div>
          <strong style="font-size: 12px; color: #333; flex: 1; word-break: break-word;">${description}${truncated}</strong>
        </div>
        <small style="color: #666; font-size: 11px;">Location: ${report.barangay}</small>
      </div>
    `;
      })
      .join('');

    return `
      <div style="padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; color: #333; font-size: 14px; border-bottom: 2px solid #ff6b6b; padding-bottom: 8px; font-weight: 700;">
          Multiple Incidents (${cluster.reports.length})
        </h3>
        <div style="max-height: 300px; overflow-y: auto; margin-bottom: 10px;">
          ${reportList}
        </div>
        <button 
          onclick="console.log('View all incidents in cluster')"
          style="
            width: 100%;
            padding: 10px;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 700;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.3s;
            box-shadow: 0 2px 4px rgba(255, 107, 107, 0.2);
          "
          onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(255, 107, 107, 0.3)'"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(255, 107, 107, 0.2)'"
        >
          View All Incidents
        </button>
      </div>
    `;
  }

  /**
   * Add popup to individual marker
   */
  private addMarkerPopup(marker: L.Marker, report: Report): void {
    const priority = report.priority || 'low';
    const priorityColor = this.getPriorityColor(priority);
    const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);

    // Truncate and escape description for safe display
    const description = (report.description || 'No description').substring(0, 60);
    const truncated = description.length >= 60 ? '...' : '';

    const popupContent = `
      <div style="padding: 12px; min-width: 280px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 2px solid ${priorityColor};">
          <div style="width: 12px; height: 12px; background: ${priorityColor}; border-radius: 50%;"></div>
          <h3 style="margin: 0; color: #333; font-size: 14px; font-weight: 700; flex: 1; word-break: break-word;">
            ${description}${truncated}
          </h3>
        </div>
        
        <div style="margin-bottom: 10px;">
          <div style="font-size: 12px; color: #555; margin-bottom: 8px; line-height: 1.5;">
            <strong>Location:</strong><br>
            <span style="color: #666; font-size: 11px;">
              ${report.street ? report.street + '<br>' : ''}
              ${report.barangay || 'N/A'}, ${report.city || 'Baguio City'}
            </span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; padding: 8px; background: #f8f9fa; border-radius: 6px;">
          <div style="font-size: 11px;">
            <div style="color: #999; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Status</div>
            <div style="color: #28a745; font-weight: 700;">Approved</div>
          </div>
          <div style="font-size: 11px;">
            <div style="color: #999; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Priority</div>
            <div style="color: ${priorityColor}; font-weight: 700; text-transform: uppercase;">${priorityLabel}</div>
          </div>
        </div>

        ${
          report.reporterName
            ? `
          <div style="font-size: 11px; color: #666; margin-bottom: 8px; padding: 6px; background: #f0f0f0; border-radius: 4px;">
            <strong>Reported by:</strong> ${report.reporterName}
          </div>
        `
            : ''
        }

        ${
          report.timestamp || report.createdAt
            ? `
          <div style="font-size: 10px; color: #999; margin-bottom: 10px;">
            ${new Date(report.timestamp || report.createdAt).toLocaleDateString()} at ${new Date(report.timestamp || report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        `
            : ''
        }

        <button 
          onclick="window.dispatchEvent(new CustomEvent('viewIncidentDetail', { detail: '${report.id}' }))"
          style="
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            width: 100%;
            transition: all 0.3s;
            box-shadow: 0 2px 4px rgba(0,123,255,0.2);
          "
          onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(0,123,255,0.3)'"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,123,255,0.2)'"
        >
          View Full Report Details
        </button>
      </div>
    `;

    marker.bindPopup(popupContent, {
      maxWidth: 350,
      className: 'custom-popup',
    });

    marker.on('click', () => {
      marker.openPopup();
    });
  }

  private zoomToFilteredMarkers(): void {
    const filteredReports =
      this.activeFilter === 'all'
        ? this.allReports
        : this.allReports.filter((report) => report.priority === this.activeFilter);

    const reportsWithLocation = filteredReports.filter(
      (r) => r.location && r.location.lat && r.location.lng,
    );

    if (reportsWithLocation.length > 0) {
      const bounds = L.latLngBounds(
        reportsWithLocation.map((r) => [r.location!.lat, r.location!.lng] as L.LatLngExpression),
      );
      this.map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
    } else {
      // If no markers for this filter, return to Baguio City view
      this.map.fitBounds(this.BAGUIO_BOUNDS);
    }
  }

  viewReportDetail(reportId: string): void {
    this.router.navigate(['/report-detail', reportId]);
  }

  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high':
        return '#dc3545';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#28a745';
      default:
        return '#6c757d';
    }
  }

  private getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'high':
        return '[HIGH]';
      case 'medium':
        return '[MED]';
      case 'low':
        return '[LOW]';
      default:
        return '[--]';
    }
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
}
