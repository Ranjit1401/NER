import { driverStore } from './driverStore';

const API_BASE_URL = (import.meta as unknown as { env: { VITE_API_BASE_URL?: string } }).env.VITE_API_BASE_URL || '';

export const driverSync = {
  async syncPendingDriverEvents(): Promise<{
    syncedCount: number;
    failedCount: number;
    message: string;
  }> {
    if (!navigator.onLine) {
      return {
        syncedCount: 0,
        failedCount: 0,
        message: "You're offline. Driver events remain safely stored locally.",
      };
    }

    const allEvents = await driverStore.getAllEvents();
    const pendingEvents = allEvents.filter((e) => e.syncStatus === 'PENDING');

    if (pendingEvents.length === 0) {
      return {
        syncedCount: 0,
        failedCount: 0,
        message: 'All driver events synchronized.',
      };
    }

    let syncedCount = 0;
    let failedCount = 0;

    for (const evt of pendingEvents) {
      try {
        const payload = {
          client_generated_id: evt.clientGeneratedId,
          event_type: evt.eventType,
          dispatch_id: evt.dispatchId || 'DISP-1001',
          driver_id: 'NER-DRIVER-01',
          truck_id: 'TRK-NE-042',
          trip_status: evt.tripStatus || null,
          problem_type: evt.problemType || null,
          severity: evt.severity || 'MEDIUM',
          latitude: evt.latitude ?? 26.1833,
          longitude: evt.longitude ?? 91.7333,
          speed_kmh: 45.0,
          heading: 90.0,
          description: evt.description || '',
          created_at: evt.createdAt,
          version: 1,
        };

        const res = await fetch(`${API_BASE_URL}/api/v1/sync/driver-events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        if (data.status === 'SYNCED' || data.status === 'CONFLICT') {
          await driverStore.markEventAsSynced(evt.clientGeneratedId, data.server_id);
          syncedCount++;
        } else {
          await driverStore.markEventAsFailed(evt.clientGeneratedId);
          failedCount++;
        }
      } catch (err) {
        console.error(`Failed to sync driver event ${evt.clientGeneratedId}:`, err);
        await driverStore.markEventAsFailed(evt.clientGeneratedId);
        failedCount++;
      }
    }

    return {
      syncedCount,
      failedCount,
      message: `${syncedCount} driver event(s) synchronized to FastAPI.`,
    };
  },
};
