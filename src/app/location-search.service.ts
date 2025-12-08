import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BAGUIO_BARANGAY_CENTROIDS } from './barangay-centroids';

export interface LocationSuggestion {
  name: string;
  barangay: string;
  coordinates: [number, number]; // [lat, lng]
  type: 'barangay' | 'street';
  matchScore: number;
}

@Injectable({
  providedIn: 'root',
})
export class LocationSearchService {
  private suggestions$ = new BehaviorSubject<LocationSuggestion[]>([]);

  // Common streets and landmarks in Baguio City with approximate coordinates
  private readonly STREETS_AND_LANDMARKS: LocationSuggestion[] = [
    // Major Streets
    { name: 'Session Road', barangay: 'Session Road Area', coordinates: [16.4125, 120.5964], type: 'street', matchScore: 0 },
    { name: 'Burnham Road', barangay: 'Legarda-Burnham-Kisad', coordinates: [16.4111, 120.5917], type: 'street', matchScore: 0 },
    { name: 'Bokawkan Road', barangay: 'Andres Bonifacio (Lower Bokawkan)', coordinates: [16.4174, 120.5856], type: 'street', matchScore: 0 },
    { name: 'Marcos Highway', barangay: 'Magsaysay, Upper', coordinates: [16.4222, 120.5958], type: 'street', matchScore: 0 },
    { name: 'Governor Pack Road', barangay: 'New Lucban', coordinates: [16.4214, 120.5925], type: 'street', matchScore: 0 },
    { name: 'Loakan Road', barangay: 'Loakan Proper', coordinates: [16.3833, 120.6167], type: 'street', matchScore: 0 },
    { name: 'Mines View Road', barangay: 'Mines View Park', coordinates: [16.4244, 120.6331], type: 'street', matchScore: 0 },
    { name: 'Outlook Drive', barangay: 'Outlook Drive', coordinates: [16.4139, 120.6225], type: 'street', matchScore: 0 },
    { name: 'South Drive', barangay: 'South Drive', coordinates: [16.4139, 120.6139], type: 'street', matchScore: 0 },
    { name: 'Santo Tomas Road', barangay: 'Santo Tomas Proper', coordinates: [16.37, 120.56], type: 'street', matchScore: 0 },

    // Popular Landmarks
    { name: 'Mines View Park', barangay: 'Mines View Park', coordinates: [16.4244, 120.6331], type: 'street', matchScore: 0 },
    { name: 'Rizal Monument', barangay: 'Rizal Monument Area', coordinates: [16.4131, 120.5931], type: 'street', matchScore: 0 },
    { name: 'Baguio Cathedral', barangay: 'Session Road Area', coordinates: [16.4125, 120.5964], type: 'street', matchScore: 0 },
    { name: 'SM City Baguio', barangay: 'Holy Ghost Extension', coordinates: [16.4189, 120.5994], type: 'street', matchScore: 0 },
    { name: 'Ayala Technohub', barangay: 'New Lucban', coordinates: [16.4214, 120.5925], type: 'street', matchScore: 0 },
    { name: 'PNP Camp', barangay: 'Camp 7', coordinates: [16.3769, 120.5939], type: 'street', matchScore: 0 },
  ];

  constructor() {}

  /**
   * Search for location suggestions based on user input
   * Returns barangays and streets that match the input
   */
  searchLocations(query: string): Observable<LocationSuggestion[]> {
    if (!query || query.trim().length === 0) {
      this.suggestions$.next([]);
      return this.suggestions$.asObservable();
    }

    const normalizedQuery = query.toLowerCase().trim();
    const results: LocationSuggestion[] = [];

    // Search barangays
    Object.entries(BAGUIO_BARANGAY_CENTROIDS).forEach(([barangayName, coordinates]) => {
      const matchScore = this.calculateMatchScore(normalizedQuery, barangayName.toLowerCase());
      if (matchScore > 0) {
        results.push({
          name: barangayName,
          barangay: barangayName,
          coordinates,
          type: 'barangay',
          matchScore,
        });
      }
    });

    // Search streets and landmarks
    this.STREETS_AND_LANDMARKS.forEach((suggestion) => {
      const matchScore = this.calculateMatchScore(normalizedQuery, suggestion.name.toLowerCase());
      if (matchScore > 0) {
        results.push({
          ...suggestion,
          matchScore,
        });
      }
    });

    // Sort by match score (highest first) and limit results
    const sortedResults = results
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 12); // Limit to 12 suggestions

    this.suggestions$.next(sortedResults);
    return this.suggestions$.asObservable();
  }

  /**
   * Calculate how well a query matches a location name
   * Returns a score between 0 and 100
   */
  private calculateMatchScore(query: string, target: string): number {
    // Exact match
    if (target === query) return 100;

    // Starts with query
    if (target.startsWith(query)) return 80;

    // Contains query
    if (target.includes(query)) return 60;

    // Check for fuzzy match with word boundaries
    const queryWords = query.split(/\s+/);
    const targetWords = target.split(/\s+/);
    const matchedWords = queryWords.filter((qw) => targetWords.some((tw) => tw.startsWith(qw)));

    if (matchedWords.length > 0) {
      return 40 + (matchedWords.length * 10);
    }

    return 0;
  }

  /**
   * Get all barangays for reference
   */
  getAllBarangays(): LocationSuggestion[] {
    return Object.entries(BAGUIO_BARANGAY_CENTROIDS).map(([name, coordinates]) => ({
      name,
      barangay: name,
      coordinates,
      type: 'barangay',
      matchScore: 0,
    }));
  }

  /**
   * Get coordinates for a specific location name
   */
  getLocationCoordinates(locationName: string): [number, number] | null {
    // Check barangays first
    if (BAGUIO_BARANGAY_CENTROIDS[locationName]) {
      return BAGUIO_BARANGAY_CENTROIDS[locationName];
    }

    // Check streets and landmarks
    const street = this.STREETS_AND_LANDMARKS.find(
      (s) => s.name.toLowerCase() === locationName.toLowerCase()
    );
    return street ? street.coordinates : null;
  }

  /**
   * Get nearby locations within a radius (in km)
   */
  getNearbyLocations(lat: number, lng: number, radiusKm: number = 1): LocationSuggestion[] {
    const results: LocationSuggestion[] = [];

    Object.entries(BAGUIO_BARANGAY_CENTROIDS).forEach(([name, [clat, clng]]) => {
      const distance = this.calculateDistance(lat, lng, clat, clng);
      if (distance <= radiusKm) {
        results.push({
          name,
          barangay: name,
          coordinates: [clat, clng],
          type: 'barangay',
          matchScore: 100 - (distance / radiusKm) * 100, // Higher score for closer locations
        });
      }
    });

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
}
