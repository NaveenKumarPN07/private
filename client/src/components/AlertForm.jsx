import { useState } from 'react';
import { saveAlertLocally } from '../services/dbService.js';

const ALERT_TYPES = [
  { value: 'medical',    label: 'Medical emergency' },
  { value: 'flood',      label: 'Flood' },
  { value: 'road_block', label: 'Road blocked' },
  { value: 'shelter',    label: 'Need shelter' },
  { value: 'other',      label: 'Other' },
];

const getLocation = () =>
  new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: null, lng: null })
    )
  );

export default function AlertForm({ onAlertSaved }) {
  const [form, setForm] = useState({ type: 'medical', message: '' });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const location = await getLocation();

    const alertData = {
      type: form.type,
      message: form.message,
      location,
      priority: 'MEDIUM',
      deviceId: navigator.userAgent.slice(0, 50),
    };

    // Step 1 — always save locally first
    const saved = await saveAlertLocally(alertData);

    // Step 2 — try to send to server if online
    if (navigator.onLine) {
      try {
        const res = await fetch('http://localhost:5000/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alertData),
        });
        if (res.ok) {
          setStatus({ type: 'success', msg: 'Alert sent to server.' });
        } else {
          throw new Error();
        }
      } catch {
        setStatus({ type: 'warn', msg: 'Saved offline. Will sync when internet returns.' });
      }
    } else {
      setStatus({ type: 'warn', msg: 'No internet. Alert saved locally.' });
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