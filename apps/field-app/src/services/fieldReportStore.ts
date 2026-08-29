export interface FieldReportItem {
  id?: number;
  clientGeneratedId: string;
  reportType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  latitude: number | null;
  longitude: number | null;
  description: string;
  photoName?: string;
  photoPreview?: string;
  createdAt: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  serverId?: string;
}

const DB_NAME = 'NERFieldOpsDB';
const DB_VERSION = 1;
const STORE_NAME = 'field_reports';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('clientGeneratedId', 'clientGeneratedId', { unique: true });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const fieldReportStore = {
  async saveReport(
    report: Omit<FieldReportItem, 'id' | 'clientGeneratedId' | 'createdAt' | 'syncStatus'>
  ): Promise<FieldReportItem> {
    const db = await openDB();
    const clientGeneratedId = `REP-FIELD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fullReport: Omit<FieldReportItem, 'id'> = {
      ...report,
      clientGeneratedId,
      createdAt: new Date().toISOString(),
      syncStatus: 'PENDING',
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(fullReport);

      req.onsuccess = () => {
        resolve({ ...fullReport, id: req.result as number });
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getAllReports(): Promise<FieldReportItem[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const items = (req.result as FieldReportItem[]).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getPendingCount(): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('syncStatus');
      const req = index.count('PENDING');

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async markReportAsSynced(clientGeneratedId: string, serverId?: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('clientGeneratedId');
      const req = index.get(clientGeneratedId);

      req.onsuccess = () => {
        const report = req.result as FieldReportItem | undefined;
        if (report) {
          report.syncStatus = 'SYNCED';
          if (serverId) report.serverId = serverId;
          store.put(report);
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  },

  async markReportAsFailed(clientGeneratedId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('clientGeneratedId');
      const req = index.get(clientGeneratedId);

      req.onsuccess = () => {
        const report = req.result as FieldReportItem | undefined;
        if (report) {
          report.syncStatus = 'FAILED';
          store.put(report);
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  },

  async markAllPendingAsSynced(): Promise<number> {
    const db = await openDB();
    const reports = await this.getAllReports();
    const pending = reports.filter((r) => r.syncStatus === 'PENDING');

    if (pending.length === 0) return 0;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      let updatedCount = 0;

      pending.forEach((item) => {
        item.syncStatus = 'SYNCED';
        store.put(item);
        updatedCount++;
      });

      tx.oncomplete = () => resolve(updatedCount);
      tx.onerror = () => reject(tx.error);
    });
  },
};
