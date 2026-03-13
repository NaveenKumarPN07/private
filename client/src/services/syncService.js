import { getUnsyncedAlerts, markAllSynced } from './dbService.js';

const API_BASE = 'http://localhost:5000/api/alerts';

// Upload all unsynced local alerts to the server
export const syncOfflineAlerts = async () => {
  const unsynced = await getUnsyncedAlerts();

  if (unsynced.length === 0) {
    console.log('Nothing to sync.');
    return;
  }

  console.log(`Syncing ${unsynced.length} offline alert(s)...`);

  try {
    const res = await fetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alerts: unsynced }),
    });

    if (!res.ok) throw new Error(`Server responded ${res.status}`);

    const json = await res.json();
    console.log(`Synced ${json.synced} alerts.`);

    // Mark them synced in IndexedDB
    const syncedIds = unsynced.map((a) => a.localId);
    await markAllSynced(syncedIds);
  } catch (err) {
    console.warn('Sync failed, will retry on next reconnect:', err.message);
  }
};

// Call this once when the app mounts
export const startSyncListener = () => {
  // Try immediately if already online
  if (navigator.onLine) {
    syncOfflineAlerts();
  }

  // Listen for connectivity restore
  window.addEventListener('online', () => {
    console.log('Internet restored — starting sync...');
    syncOfflineAlerts();
  });

  // Optional: log when going offline
  window.addEventListener('offline', () => {
    console.log('Internet lost — alerts will be saved locally.');
  });
};