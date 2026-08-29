// IndexedDB wrapper for durable local storage and mutation queue

export interface OfflineMutation {
  client_generated_id: string;
  mutation_type: 'FIELD_REPORT' | 'DISPATCH_DRAFT';
  payload: Record<string, unknown>;
  created_at: string;
  retry_count: number;
  last_attempt_at?: string | null;
  status: 'QUEUED' | 'SYNCING' | 'SYNCED' | 'SYNC_FAILED' | 'CONFLICT';
  error_message?: string | null;
}

const DB_NAME = 'SLI_Command_Center_Offline_DB';
const DB_VERSION = 1;

export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store cached domain datasets
      if (!db.objectStoreNames.contains('disasters_cache')) {
        db.createObjectStore('disasters_cache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('roads_cache')) {
        db.createObjectStore('roads_cache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('hubs_cache')) {
        db.createObjectStore('hubs_cache', { keyPath: 'id' });
      }

      // Store durable offline mutation queue
      if (!db.objectStoreNames.contains('mutation_queue')) {
        const queueStore = db.createObjectStore('mutation_queue', { keyPath: 'client_generated_id' });
        queueStore.createIndex('status', 'status', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// --- Caching Utilities ---
export async function cacheDataset<T extends { id: string }>(storeName: string, items: T[]): Promise<void> {
  const db = await openOfflineDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  items.forEach((item) => store.put(item));
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
}

export async function getCachedDataset<T>(storeName: string): Promise<T[]> {
  const db = await openOfflineDB();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

// --- Mutation Queue Utilities ---
export async function enqueueMutation(mutation: OfflineMutation): Promise<void> {
  const db = await openOfflineDB();
  const tx = db.transaction('mutation_queue', 'readwrite');
  const store = tx.objectStore('mutation_queue');
  store.put(mutation);
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
}

export async function getPendingMutations(): Promise<OfflineMutation[]> {
  const db = await openOfflineDB();
  const tx = db.transaction('mutation_queue', 'readonly');
  const store = tx.objectStore('mutation_queue');
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const items = request.result as OfflineMutation[];
      resolve(items.filter((m) => m.status === 'QUEUED' || m.status === 'SYNC_FAILED' || m.status === 'SYNCING'));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function updateMutationStatus(
  clientGeneratedId: string,
  status: OfflineMutation['status'],
  errorMessage?: string | null
): Promise<void> {
  const db = await openOfflineDB();
  const tx = db.transaction('mutation_queue', 'readwrite');
  const store = tx.objectStore('mutation_queue');
  const request = store.get(clientGeneratedId);

  return new Promise((resolve) => {
    request.onsuccess = () => {
      const item = request.result as OfflineMutation | undefined;
      if (item) {
        item.status = status;
        item.last_attempt_at = new Date().toISOString();
        if (status === 'SYNC_FAILED') item.retry_count += 1;
        if (errorMessage) item.error_message = errorMessage;
        store.put(item);
      }
      resolve();
    };
  });
}
