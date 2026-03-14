import { useEffect, useState, useRef } from 'react';
import AlertForm  from './components/AlertForm.jsx';
import AlertFeed  from './components/AlertFeed.jsx';
import P2PFeed    from './components/P2PFeed.jsx';
import { startSyncListener }                     from './services/syncService.js';
import { initP2P, getPeerCount, disconnectP2P }  from './services/p2pService.js';
import { getAllMessages }                         from './services/messageQueue.js';

export default function App() {
  const [refresh,   setRefresh]   = useState(0);
  const [meshMsgs,  setMeshMsgs]  = useState([]);
  const [peerCount, setPeerCount] = useState(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    startSyncListener();

    initP2P((messages) => {
      setMeshMsgs([...messages]);
      setPeerCount(getPeerCount());
    });

    const interval = setInterval(() => {
      setPeerCount(getPeerCount());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ maxWidth:480, margin:'0 auto', padding:'24px 16px' }}>
      <div style={{
        display:'flex', justifyContent:'space-between',
        alignItems:'center', marginBottom:4,
      }}>
        <h1 style={{ fontSize:18, fontWeight:500, margin:0 }}>
          Disaster network
        </h1>
        <span style={{
          fontSize:10, padding:'2px 10px', borderRadius:10,
          background: peerCount > 0
            ? 'var(--color-background-success)'
            : 'var(--color-background-secondary)',
          color: peerCount > 0
            ? 'var(--color-text-success)'
            : 'var(--color-text-tertiary)',
        }}>
          {peerCount > 0
            ? `${peerCount} peer${peerCount > 1 ? 's' : ''}`
            : 'No peers'}
        </span>
      </div>

      <p style={{ fontSize:13, color:'var(--color-text-secondary)', marginBottom:20 }}>
        {navigator.onLine ? 'Online' : 'Offline — mesh active'}
      </p>

      <AlertForm onAlertSaved={() => setRefresh((r) => r + 1)} />

      <div style={{ marginTop:24 }}>
        <span style={{ fontSize:14, fontWeight:500 }}>My alerts</span>
        <AlertFeed refresh={refresh} />
      </div>

      <P2PFeed messages={meshMsgs} peerCount={peerCount} />
    </div>
  );
}