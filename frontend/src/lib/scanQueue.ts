// Minimal IndexedDB-backed queue for offline scans (no external dependency).

export interface QueuedScan {
  clientId: string
  eventId: string
  participantToken: string
  kind: number
  occurredAt: string
  online: boolean
}

const DB_NAME = 'eventpulse'
const STORE = 'scanQueue'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'clientId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        const request = run(transaction.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        transaction.oncomplete = () => db.close()
      }),
  )
}

export const enqueueScan = (scan: QueuedScan) => tx('readwrite', (s) => s.put(scan)).then(() => undefined)

export const allScans = () => tx<QueuedScan[]>('readonly', (s) => s.getAll() as IDBRequest<QueuedScan[]>)

export const removeScan = (clientId: string) => tx('readwrite', (s) => s.delete(clientId)).then(() => undefined)

export const queueCount = () => tx<number>('readonly', (s) => s.count())
