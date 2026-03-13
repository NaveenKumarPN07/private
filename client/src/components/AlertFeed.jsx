import { useEffect, useState } from 'react';
import { getAllAlerts } from '../services/dbService.js';

const PRIORITY_COLOR = {
  HIGH:   'var(--color-text-danger)',
  MEDIUM: 'var(--color-text-warning)',
  LOW:    'var(--color-text-success)',
};

const TYPE_LABEL = {
  medical:    'Medical',
  flood:      'Flood',
  road_block: 'Road blocked',
  shelter:    'Shelter',
  other:      'Other',
};

export default function AlertFeed({ refresh }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    getAllAlerts().then(setAlerts);
  }, [refresh]);

  if (alerts.length === 0) {
    return (
      <p style={{ fontSize:13, color:'var(--color-text-tertiary)', marginTop:16 }}>
        No alerts yet. Submit one above.
      </p>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:16 }}>
      {alerts.map((a) => (
        <div key={a.localId} style={{
          padding:'10px 13px',
          border:'0.5px solid var(--color-border-tertiary)',
          borderRadius:8,
          background:'var(--color-background-primary)',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:500 }}>
              {TYPE_LABEL[a.type] || a.type}
            </span>
            <span style={{ fontSize:11, color: PRIORITY_COLOR[a.priority] }}>
              {a.priority}
            </span>
          </div>

          <p style={{ fontSize:13, color:'var(--color-text-secondary)', margin:'4px 0 6px' }}>
            {a.message}
          </p>

          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:11, color:'var(--color-text-tertiary)' }}>
              {new Date(a.createdAt).toLocaleTimeString()}
            </span>
            <span style={{
              fontSize:10,
              padding:'1px 7px',
              borderRadius:10,
              background: a.synced
                ? 'var(--color-background-success)'
                : 'var(--color-background-warning)',
              color: a.synced
                ? 'var(--color-text-success)'
                : 'var(--color-text-warning)',
            }}>
              {a.synced ? 'Synced' : 'Offline'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}