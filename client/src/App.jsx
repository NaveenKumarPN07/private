import { useEffect, useState } from 'react';
import AlertForm from './components/AlertForm.jsx';
import AlertFeed from './components/AlertFeed.jsx';
import { startSyncListener } from './services/syncService.js';

export default function App() {
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    // Start listening for online/offline events
    startSyncListener();
  }, []);

  const handleAlertSaved = () => {
    setRefresh((r) => r + 1);
  };

  return (
    <div style={{ maxWidth:480, margin:'0 auto', padding:'24px 16px' }}>
      <h1 style={{ fontSize:18, fontWeight:500, marginBottom:4 }}>
        Disaster network
      </h1>
      <p style={{ fontSize:13, color:'var(--color-text-secondary)', marginBottom:20 }}>
        {navigator.onLine ? 'Online' : 'Offline — alerts saved locally'}
      </p>

      <AlertForm onAlertSaved={handleAlertSaved} />

      <AlertFeed refresh={refresh} />
    </div>
  );
}