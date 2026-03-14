import { openDB } from 'idb';

const DB_NAME    = 'disaster-db';
const STORE_NAME = 'alerts';
const DB_VERSION = 1;

const getDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
      }
    },
  });
};

const generateId = () =>
  `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ── CREATE ────────────────────────────────────────────────────
export const saveAlertLocally = async (alertData) => {
  const db = await getDB();
  const record = {
    ...alertData,
    localId:   generateId(),
    synced:    false,
    createdAt: new Date().toISOString(),
  };
  await db.put(STORE_NAME, record);
  return record;
};

// ── READ ──────────────────────────────────────────────────────
export const getAllAlerts = async () => {
  const db  = await getDB();
  const all = await db.getAll(STORE_NAME);
  return all.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
};

export const getUnsyncedAlerts = async () => {
  const db  = await getDB();
  const all = await db.getAll(STORE_NAME);
  return all.filter((a) => a.synced === false);
};

export const findExistingAlert = async (deviceId, type) => {
  const db  = await getDB();
  const all = await db.getAll(STORE_NAME);
  return (
    all.find((a) => a.deviceId === deviceId && a.type === type) || null
  );
};

// ── UPDATE ────────────────────────────────────────────────────
export const updateAlertLocally = async (localId, updates) => {
  const db       = await getDB();
  const existing = await db.get(STORE_NAME, localId);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...updates,
    synced:    false,
    updatedAt: new Date().toISOString(),
  };

  await db.put(STORE_NAME, updated);
  return updated;
};

export const markAlertSynced = async (localId) => {
  const db    = await getDB();
  const alert = await db.get(STORE_NAME, localId);
  if (alert) {
    alert.synced = true;
    await db.put(STORE_NAME, alert);
  }
};

// ── SYNC HELPERS ──────────────────────────────────────────────
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