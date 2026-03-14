import { useState } from 'react';
import {
  saveAlertLocally,
  findExistingAlert,
  updateAlertLocally,
} from '../services/dbService.js';
import { broadcastAlert } from '../services/p2pService.js'; // NEW

const PRIORITY_LADDER = ['LOW', 'MEDIUM', 'HIGH'];

const escalatePriority = (current) => {
  const idx = PRIORITY_LADDER.indexOf(current);
  if (idx === PRIORITY_LADDER.length - 1) return current;
  return PRIORITY_LADDER[idx + 1];
};

const ALERT_TYPES = [
  { value: 'medical',    label: 'Medical emergency' },
  { value: 'flood',      label: 'Flood'             },
  { value: 'road_block', label: 'Road blocked'      },
  { value: 'shelter',    label: 'Need shelter'      },
  { value: 'other',      label: 'Other'             },
];

const getLocation = () =>
  new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()    => resolve({ lat: null, lng: null })
    )
  );

export default function AlertForm({ onAlertSaved }) {
  const [form,    setForm]    = useState({ type: 'medical', message: '' });
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(false);

  const deviceId = navigator.userAgent.slice(0, 50);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const location = await getLocation();
    const existing = await findExistingAlert(deviceId, form.type);

    let saved;
    let isUpdate = false;

    if (existing) {
      const newPriority = escalatePriority(existing.priority);
      saved = await updateAlertLocally(existing.localId, {
        message:  form.message,
        location,
        priority: newPriority,
      });
      isUpdate = true;
    } else {
      saved = await saveAlertLocally({
        type:     form.type,
        message:  form.message,
        location,
        priority: 'LOW',
        deviceId,
      });
    }

    // Phase 2 — broadcast over P2P mesh (works offline)
    broadcastAlert(saved);

    // Phase 1 — sync to server if online
    if (navigator.onLine) {
      try {
        if (isUpdate && saved.serverId) {
          await fetch(`http://localhost:5000/api/alerts/${saved.serverId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message:  saved.message,
              priority: saved.priority,
              location: saved.location,
            }),
          });
          await updateAlertLocally(saved.localId, { synced: true });
        } else if (!isUpdate) {
          const res  = await fetch('http://localhost:5000/api/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saved),
          });
          const json = await res.json();
          if (json.data?._id) {
            await updateAlertLocally(saved.localId, {
              serverId: json.data._id,
              synced:   true,
            });
          }
        }
        setStatus({
          type: 'success',
          msg: isUpdate
            ? `Updated — priority now ${saved.priority}. Broadcast to peers.`
            : 'Sent to server and broadcast to peers.',
        });
      } catch {
        setStatus({ type: 'warn', msg: 'Saved locally and broadcast to peers.' });
      }
    } else {
      setStatus({
        type: 'warn',
        msg: `Offline — broadcast to ${0} nearby peer(s) via mesh.`,
      });
    }

    setForm({ type: 'medical', message: '' });
    setLoading(false);
    onAlertSaved(saved);
  };

  const statusColor = status?.type === 'success'
    ? 'var(--color-text-success)'
    : 'var(--color-text-warning)';

  return (
    <form onSubmit={handleSubmit}
      style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <select name="type" value={form.type} onChange={handleChange}>
        {ALERT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <textarea
        name="message"
        rows={3}
        placeholder="Describe the situation..."
        value={form.message}
        onChange={handleChange}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send alert'}
      </button>
      {status && (
        <p style={{ fontSize:13, color: statusColor, margin:0 }}>
          {status.msg}
        </p>
      )}
    </form>
  );
}