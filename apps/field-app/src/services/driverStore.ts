export interface DriverEventItem {
  id?: number;
  clientGeneratedId: string;
  eventType: 'TRIP_UPDATE' | 'PROBLEM_REPORT' | 'EMERGENCY_SOS' | 'GPS_UPDATE';
  dispatchId?: string;
  tripStatus?: 'ASSIGNED' | 'ACCEPTED' | 'EN_ROUTE' | 'DELIVERED';
  problemType?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  latitude: number | null;
  longitude: number | null;
  description?: string;
  photoName?: string;
  photoPreview?: string;
  createdAt: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  serverId?: string;
}

const DB_NAME = 'NERDriverOpsDB';
const DB_VERSION = 1;
const STORE_NAME = 'driver_events';

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

export const driverStore = {
  async saveEvent(
    eventData: Omit<DriverEventItem, 'id' | 'clientGeneratedId' | 'createdAt' | 'syncStatus'>
  ): Promise<DriverEventItem> {
    const db = await openDB();
    const clientGeneratedId = `DRV-EVENT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fullEvent: Omit<DriverEventItem, 'id'> = {
      ...eventData,
      clientGeneratedId,
      createdAt: new Date().toISOString(),
      syncStatus: 'PENDING',
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(fullEvent);

      req.onsuccess = () => {
        resolve({ ...fullEvent, id: req.result as number });
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getAllEvents(): Promise<DriverEventItem[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const items = (req.result as DriverEventItem[]).sort(
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

  async markEventAsSynced(clientGeneratedId: string, serverId?: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('clientGeneratedId');
      const req = index.get(clientGeneratedId);

      req.onsuccess = () => {
        const evt = req.result as DriverEventItem | undefined;
        if (evt) {
          evt.syncStatus = 'SYNCED';
          if (serverId) evt.serverId = serverId;
          store.put(evt);
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  },

  async markEventAsFailed(clientGeneratedId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('clientGeneratedId');
      const req = index.get(clientGeneratedId);

      req.onsuccess = () => {
        const evt = req.result as DriverEventItem | undefined;
        if (evt) {
          evt.syncStatus = 'FAILED';
          store.put(evt);
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  },
};
