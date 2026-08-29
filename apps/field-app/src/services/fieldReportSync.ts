import { fieldReportStore } from './fieldReportStore';

const API_BASE_URL = (import.meta as unknown as { env: { VITE_API_BASE_URL?: string } }).env.VITE_API_BASE_URL || '';

export interface SyncResponse {
  client_generated_id: string;
  status: string; // SYNCED, CONFLICT, FAILED
  server_id?: string;
  message: string;
}

export const fieldReportSync = {
  /**
   * Synchronizes all PENDING reports from local IndexedDB to FastAPI backend.
   */
  async syncPendingReports(): Promise<{
    syncedCount: number;
    failedCount: number;
    message: string;
  }> {
    if (!navigator.onLine) {
      return {
        syncedCount: 0,
        failedCount: 0,
        message: "You're offline. Reports remain safely stored on this device.",
      };
    }

    const allReports = await fieldReportStore.getAllReports();
    const pendingReports = allReports.filter((r) => r.syncStatus === 'PENDING');

    if (pendingReports.length === 0) {
      return {
        syncedCount: 0,
        failedCount: 0,
        message: 'All reports are up to date.',
      };
    }

    let syncedCount = 0;
    let failedCount = 0;

    for (const report of pendingReports) {
      try {
        const payload = {
          client_generated_id: report.clientGeneratedId,
          report_type: report.reportType,
          severity: report.severity,
          description: report.description,
          location: {
            latitude: report.latitude ?? 26.1833,
            longitude: report.longitude ?? 91.7333,
          },
          observed_at: report.createdAt,
          reported_by: 'FIELD_OFFICER_NER',
          version: 1,
        };

        const res = await fetch(`${API_BASE_URL}/api/v1/sync/field-reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data: SyncResponse = await res.json();

        if (data.status === 'SYNCED' || data.status === 'CONFLICT') {
          await fieldReportStore.markReportAsSynced(report.clientGeneratedId, data.server_id);
          syncedCount++;
        } else {
          await fieldReportStore.markReportAsFailed(report.clientGeneratedId);
          failedCount++;
        }
      } catch (err) {
        console.error(`Failed to sync report ${report.clientGeneratedId}:`, err);
        await fieldReportStore.markReportAsFailed(report.clientGeneratedId);
        failedCount++;
      }
    }

    if (failedCount > 0 && syncedCount === 0) {
      return {
        syncedCount,
        failedCount,
        message: `Failed to connect to backend server. ${failedCount} report(s) kept offline.`,
      };
    }

    return {
      syncedCount,
      failedCount,
      message: `${syncedCount} report(s) synchronized to FastAPI backend.`,
    };
  },
};
