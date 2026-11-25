const KEY_DATABASE = 'potber-settings-sync';
const KEY_STORE = 'keys';

export function readDeviceKey(userId: string): Promise<CryptoKey | undefined> {
  return withKeyStore('readonly', (store) => store.get(userId));
}

export async function writeDeviceKey(userId: string, key: CryptoKey) {
  await withKeyStore('readwrite', (store) => store.put(key, userId));
}

export async function deleteDeviceKey(userId: string) {
  await withKeyStore('readwrite', (store) => store.delete(userId));
}

function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(KEY_DATABASE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(KEY_STORE);
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function withKeyStore<Result>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<Result>,
): Promise<Result> {
  const database = await openKeyDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(KEY_STORE, mode);
      const request = operation(transaction.objectStore(KEY_STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () =>
        reject(
          transaction.error ?? new Error('Device key transaction aborted.'),
        );
    });
  } finally {
    database.close();
  }
}
