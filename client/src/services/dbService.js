import { openDB } from 'idb';

const DB_NAME = 'disaster-db';
const STORE_NAME = 'alerts';
const DB_VERSION = 1;

const getDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Only runs once — when the database is first created
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
      }
    },
  });
};

const generateId = () =>
  `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// Save a new alert locally
export const saveAlertLocally = async (alertData) => {
  const db = await getDB();
  const record = {
    ...alertData,
    localId: generateId(),
    synced: false,
    createdAt: new Date().toISOString(),
  };
  await db.put(STORE_NAME, record);
  return record;
};

// Get all alerts sorted newest first
export const getAllAlerts = async () => {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// Get only unsynced alerts — plain JS filter, no IDB index needed
export const getUnsyncedAlerts = async () => {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  return all.filter((a) => a.synced === false);
};

// Mark a single alert as synced
export const markAlertSynced = async (localId) => {
  const db = await getDB();
  const alert = await db.get(STORE_NAME, localId);
  if (alert) {
    alert.synced = true;
    await db.put(STORE_NAME, alert);
  }
};

// Mark multiple alerts as synced after bulk sync
export const markAllSynced = async (localIds) => {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await Promise.all(
    localIds.map(async (id) => {
      const alert = await tx.store.get(id);
      if (alert) {
        alert.synced = true;
        await tx.store.put(alert);
      }
    })
  );
  await tx.done;
};