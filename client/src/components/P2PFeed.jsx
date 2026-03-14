const PRIORITY_COLOR = {
  HIGH:   'var(--color-text-danger)',
  MEDIUM: 'var(--color-text-warning)',
  LOW:    'var(--color-text-success)',
};

const TYPE_LABEL = {
  medical:    'Medical emergency',
  flood:      'Flood',
  road_block: 'Road blocked',
  shelter:    'Shelter needed',
  other:      'Other',
};

export default function P2PFeed({ messages, peerCount }) {
  return (
    <div style={{ marginTop: 24 }}>

      {/* Peer status bar */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   10,
      }}>
        <span style={{ fontSize:14, fontWeight:500 }}>Mesh alerts</span>
        <span style={{
          fontSize:   11,
          padding:    '2px 10px',
          borderRadius: 12,
          background: peerCount > 0
            ? 'var(--color-background-success)'
            : 'var(--color-background-secondary)',
          color: peerCount > 0
            ? 'var(--color-text-success)'
            : 'var(--color-text-tertiary)',
        }}>
          {peerCount > 0
            ? `${peerCount} peer${peerCount > 1 ? 's' : ''} connected`
            : 'No peers yet'}
        </span>
      </div>

      {messages.length === 0 && (
        <p style={{ fontSize:13, color:'var(--color-text-tertiary)' }}>
          Waiting for alerts from nearby devices...
        </p>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {messages.map((msg) => (
          <div key={msg.messageId} style={{
            padding:     '10px 13px',
            border:      '0.5px solid var(--color-border-tertiary)',
            borderLeft:  msg.payload?.priority === 'HIGH'
              ? '3px solid var(--color-border-danger)'
              : '0.5px solid var(--color-border-tertiary)',
            borderRadius: 8,
            background:  'var(--color-background-primary)',
          }}>

            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:13, fontWeight:500 }}>
                {TYPE_LABEL[msg.payload?.type] || msg.payload?.type}
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                color: PRIORITY_COLOR[msg.payload?.priority] || 'var(--color-text-secondary)',
              }}>
                {msg.payload?.priority}
              </span>
            </div>

            {/* Message text */}
            <p style={{ fontSize:13, color:'var(--color-text-secondary)', margin:'0 0 6px' }}>
              {msg.payload?.message}
            </p>

            {/* Footer — hops + time */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:11, color:'var(--color-text-tertiary)' }}>
                {new Date(msg.receivedAt).toLocaleTimeString()}
              </span>
              <span style={{
                fontSize:10, padding:'1px 7px', borderRadius:10,
                background: 'var(--color-background-secondary)',
                color: 'var(--color-text-tertiary)',
              }}>
                {msg.hopCount === 0 ? 'direct' : `${msg.hopCount} hop${msg.hopCount > 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}