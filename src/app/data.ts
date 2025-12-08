// src/app/data.ts
import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  getDoc,
  collection,
  collectionData,
  doc,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  CollectionReference,
  where,
  limit,
} from '@angular/fire/firestore';
import { Observable, combineLatest, map, from, of } from 'rxjs';
import { Incident, Alert, FeedItem, RiskZone, UserProfile } from './models';

@Injectable({
  providedIn: 'root',
})
export class Data {
  private firestore = inject(Firestore);

  // FIX: Explicitly cast CollectionReference to the specific type for strict typing
  private incidentsCollection = collection(
    this.firestore,
    'incidents',
  ) as CollectionReference<Incident>;
  private alertsCollection = collection(this.firestore, 'alerts') as CollectionReference<Alert>;
  private riskZonesCollection = collection(
    this.firestore,
    'riskZones',
  ) as CollectionReference<RiskZone>;

  // --- 1. Get Safety Feed (Incidents + Alerts) ---

  /**
   * Returns combined incidents and alerts.
   * If `role` === 'user', admin-only incidents will be filtered out.
   */
  getSafetyFeed(role?: 'user' | 'admin'): Observable<(Incident | Alert)[]> {
    const incidents$ = collectionData<Incident>(
      query(this.incidentsCollection, orderBy('createdAt', 'desc')),
      { idField: 'id' },
    ).pipe(map((items) => items.map((item) => ({ ...item, type: 'incident' }))));

    // If this caller wants to see only user-visible incidents, filter out admin-only ones
    const roleFilteredIncidents$ = incidents$.pipe(
      map((items) => (role === 'user' ? items.filter((i) => i.recipient !== 'admin') : items)),
    );

    const alerts$ = collectionData<Alert>(
      query(this.alertsCollection, orderBy('createdAt', 'desc')),
      { idField: 'id' },
    ).pipe(map((items) => items.map((item) => ({ ...item, type: 'alert' }))));

    return combineLatest([roleFilteredIncidents$, alerts$]).pipe(
      map(([incidents, alerts]) => {
        const feed = [...incidents, ...alerts] as (Incident | Alert)[];
        return feed.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      }),
    );
  }

  // --- 2. Write Operations ---

  async reportIncident(data: Partial<Incident>) {
    const incidentId = doc(this.incidentsCollection).id;
    const docRef = doc(this.incidentsCollection, incidentId);

    const finalData: Incident = {
      id: incidentId, // Required by Incident interface
      type: 'incident', // Required
      status: 'pending', // Required
      createdAt: serverTimestamp() as any, // Required, cast FieldValue to Timestamp/any to satisfy interface
      location: data.location || { lat: 0, lng: 0 }, // FIX: Ensure location exists
      description: data.description || 'N/A', // Ensure description exists
      priority: data.priority || 'medium', // Ensure priority exists
      recipient: data.recipient || 'both', // default to both for backwards compatibility
      // spread other properties from data, though they should be covered above
      ...(data as any),
    };

    await setDoc(docRef, finalData);
    return incidentId;
  }

  /**
   * Create a user profile document when a new user registers.
   * If there are no admins yet (no /config/adminExists doc), the first registered user becomes admin.
   */
  async createUserProfile(
    uid: string,
    profile: { email: string; displayName?: string; phoneNumber?: string },
  ) {
    const userDocRef = doc(this.firestore, `users/${uid}`);
    const adminMarkerRef = doc(this.firestore, `config/adminExists`);

    // Check if admin marker already exists
    const markerSnap = await getDoc(adminMarkerRef as any);
    const isFirstAdmin = !markerSnap.exists();

    const userData: any = {
      uid,
      email: profile.email || '',
      displayName: profile.displayName || '',
      phoneNumber: profile.phoneNumber || '',
      role: isFirstAdmin ? 'admin' : 'citizen',
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
    };

    await setDoc(userDocRef as any, userData);

    if (isFirstAdmin) {
      // write marker so future registrations can't create another admin
      await setDoc(adminMarkerRef as any, { ownerUid: uid, createdAt: serverTimestamp() });
    }

    return userData;
  }

  async issueAlert(data: Partial<Alert>) {
    const alertId = doc(this.alertsCollection).id;
    const docRef = doc(this.alertsCollection, alertId);

    await setDoc(docRef, {
      ...data,
      type: 'alert', // Explicitly set type for strictness
      createdAt: serverTimestamp(),
    });
    return alertId;
  }

  // --- 3. Admin Update (FIX TS2339: Ensures method exists) ---

  async updateIncidentStatus(incidentId: string, newStatus: Incident['status']) {
    const docRef = doc(this.incidentsCollection, incidentId);
    const changes: any = { status: newStatus };
    // If admin approves an incident, make it visible to users as well
    if (newStatus === 'approved') {
      changes.recipient = 'both';
    }
    await updateDoc(docRef, changes);
  }

  /**
   * General update helper so admin can edit any incident fields.
   */
  async updateIncident(incidentId: string, updates: Partial<Incident>) {
    const docRef = doc(this.incidentsCollection, incidentId);
    await updateDoc(docRef, updates as any);
  }

  // --- 4. Risk Zone Data ---
  getRiskZones(): Observable<RiskZone[]> {
    return collectionData<RiskZone>(this.riskZonesCollection, { idField: 'id' });
  }

  // --- 5. User Profile Operations ---

  /**
   * Get a user's profile by their UID.
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userDocRef = doc(this.firestore, `users/${uid}`);
    const snapshot = await getDoc(userDocRef as any);
    if (snapshot.exists()) {
      const data = snapshot.data() as Record<string, unknown>;
      return {
        uid,
        email: (data['email'] as string) || '',
        displayName: (data['displayName'] as string) || '',
        role: (data['role'] as 'user' | 'admin') || 'user',
        ...data,
      } as UserProfile;
    }
    return null;
  }

  /**
   * Update a user's profile with new data.
   */
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    const userDocRef = doc(this.firestore, `users/${uid}`);
    await updateDoc(userDocRef as any, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Get the count of reports submitted by a user.
   */
  async getUserReportsCount(uid: string): Promise<number> {
    const reportsQuery = query(this.incidentsCollection, where('userId', '==', uid));
    const snapshot = await collectionData(reportsQuery, { idField: 'id' })
      .pipe(map((reports) => reports.length))
      .toPromise();
    return snapshot || 0;
  }

  /**
   * Get recent activity for a user (their submitted reports).
   */
  getUserRecentActivity(uid: string, limitCount: number = 10): Observable<Incident[]> {
    const reportsQuery = query(
      this.incidentsCollection,
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(limitCount),
    );
    return collectionData<Incident>(reportsQuery, { idField: 'id' });
  }
}
