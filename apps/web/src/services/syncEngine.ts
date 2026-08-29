import { api } from './api';
import {
  getPendingMutations,
  updateMutationStatus,
} from './offlineStore';

export type NetworkConnectivityState = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNC_FAILED';

export class SyncEngine {
  private listener: ((state: NetworkConnectivityState, pendingCount: number) => void) | null = null;
  private currentState: NetworkConnectivityState = navigator.onLine ? 'ONLINE' : 'OFFLINE';
  private syncInProgress = false;

  constructor() {
    window.addEventListener('online', () => this.handleConnectionChange());
    window.addEventListener('offline', () => this.handleConnectionChange());
  }

  public onStateChange(callback: (state: NetworkConnectivityState, pendingCount: number) => void) {
    this.listener = callback;
    this.notifyState();
  }

  public async handleConnectionChange() {
    const isOnline = navigator.onLine;
    if (!isOnline) {
      this.currentState = 'OFFLINE';
      this.notifyState();
      return;
    }

    // Ping API health to verify backend is reachable
    try {
      const health = await api.getHealth();
      if (health.status === 'healthy') {
        this.currentState = 'ONLINE';
        this.syncPendingMutations();
      } else {
        this.currentState = 'OFFLINE';
      }
    } catch {
      this.currentState = 'OFFLINE';
    }
    this.notifyState();
  }

  public async syncPendingMutations(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) return;
    this.syncInProgress = true;
    this.currentState = 'SYNCING';
    this.notifyState();

    try {
      const pending = await getPendingMutations();
      let hasError = false;

      for (const m of pending) {
        if (m.retry_count >= 5) {
          await updateMutationStatus(m.client_generated_id, 'SYNC_FAILED', 'Max retry threshold (5) reached.');
          hasError = true;
          continue;
        }

        try {
          if (m.mutation_type === 'FIELD_REPORT') {
            const res = await api.syncFieldReport(m.payload as any);
            if (res.status === 'SYNCED') {
              await updateMutationStatus(m.client_generated_id, 'SYNCED');
            } else if (res.status === 'CONFLICT') {
              await updateMutationStatus(m.client_generated_id, 'CONFLICT', res.message);
              hasError = true;
            } else {
              await updateMutationStatus(m.client_generated_id, 'SYNC_FAILED', res.message);
              hasError = true;
            }
          }
        } catch (err: unknown) {
          hasError = true;
          const msg = err instanceof Error ? err.message : 'Network sync error';
          await updateMutationStatus(m.client_generated_id, 'SYNC_FAILED', msg);
        }
      }

      this.currentState = hasError ? 'SYNC_FAILED' : 'ONLINE';
    } finally {
      this.syncInProgress = false;
      this.notifyState();
    }
  }

  private async notifyState() {
    if (this.listener) {
      const pending = await getPendingMutations();
      this.listener(this.currentState, pending.length);
    }
  }
}

export const syncEngine = new SyncEngine();
