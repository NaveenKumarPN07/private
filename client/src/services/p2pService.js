import { io } from 'socket.io-client';
import {
  addMessage,
  buildMeshMessage,
  prepareForForward,
  getAllMessages,
} from './messageQueue.js';

const SIGNAL_SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
const ROOM_ID       = 'disaster-mesh';
const ICE_SERVERS   = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

let socket            = null;
let peers             = new Map();          // peerId → { pc, channel }
let pendingMessages   = new Map();          // peerId → [json strings]
let onMessageCallback = null;
let initialized       = false;

// ── INIT ─────────────────────────────────────────────────────
export const initP2P = (onMessage) => {
  if (initialized) return;
  initialized = true;
  onMessageCallback = onMessage;

  socket = io(SIGNAL_SERVER, { transports: ['websocket', 'polling'] });

  socket.on('connect', () => {
    console.log('Signalling connected:', socket.id);
    socket.emit('join-mesh', ROOM_ID);
  });

  socket.on('existing-peers', (peerIds) => {
    console.log('Existing peers:', peerIds);
    peerIds.forEach((id) => createPeer(id, true));
  });

  socket.on('peer-joined', (peerId) => {
    console.log('New peer joined:', peerId);
    createPeer(peerId, false);
  });

  socket.on('offer', async ({ fromId, offer }) => {
    if (!peers.has(fromId)) createPeer(fromId, false);
    const { pc } = peers.get(fromId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('answer', { targetId: fromId, answer });
  });

  socket.on('answer', async ({ fromId, answer }) => {
    const entry = peers.get(fromId);
    if (entry) {
      await entry.pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  });

  socket.on('ice-candidate', async ({ fromId, candidate }) => {
    const entry = peers.get(fromId);
    if (entry && candidate) {
      try {
        await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('ICE error:', e.message);
      }
    }
  });

  socket.on('peer-left', (peerId) => {
    closePeer(peerId);
    if (onMessageCallback) onMessageCallback(getAllMessages());
  });

  socket.on('connect_error', (err) =>
    console.error('Signalling error:', err.message)
  );

  socket.on('disconnect', () => {
    console.log('Signalling disconnected');
    initialized = false;
  });
};

// ── CREATE PEER ───────────────────────────────────────────────
const createPeer = (peerId, initiator) => {
  if (peers.has(peerId)) return;

  const pc = new RTCPeerConnection(ICE_SERVERS);
  peers.set(peerId, { pc, channel: null }); // channel starts null

  pc.onicecandidate = ({ candidate }) => {
    if (candidate) {
      socket.emit('ice-candidate', { targetId: peerId, candidate });
    }
  };

  pc.onconnectionstatechange = () => {
    const state = pc.connectionState;
    console.log(`Peer ${peerId}: ${state}`);
    if (['disconnected', 'failed', 'closed'].includes(state)) {
      closePeer(peerId);
      if (onMessageCallback) onMessageCallback(getAllMessages());
    }
  };

  if (initiator) {
    const channel = pc.createDataChannel('mesh');

    channel.onopen = () => {
      peers.get(peerId).channel = channel;  // store only after open
      console.log('Channel open (initiator) with:', peerId);
      flushPending(peerId, channel);
      if (onMessageCallback) onMessageCallback(getAllMessages());
    };

    channel.onclose = () => {
      if (peers.has(peerId)) peers.get(peerId).channel = null;
    };
    channel.onerror   = (e) => console.warn('Channel error:', peerId, e);
    channel.onmessage = ({ data }) => {
      try { handleIncomingMessage(JSON.parse(data), peerId); }
      catch (e) { console.warn('Parse error:', e); }
    };

    pc.createOffer()
      .then((o) => pc.setLocalDescription(o))
      .then(() => socket.emit('offer', {
        targetId: peerId,
        offer: pc.localDescription,
      }))
      .catch((e) => console.error('Offer error:', e));

  } else {
    pc.ondatachannel = ({ channel }) => {
      channel.onopen = () => {
        peers.get(peerId).channel = channel; // store only after open
        console.log('Channel open (receiver) with:', peerId);
        flushPending(peerId, channel);
        if (onMessageCallback) onMessageCallback(getAllMessages());
      };
      channel.onclose = () => {
        if (peers.has(peerId)) peers.get(peerId).channel = null;
      };
      channel.onerror   = (e) => console.warn('Channel error:', peerId, e);
      channel.onmessage = ({ data }) => {
        try { handleIncomingMessage(JSON.parse(data), peerId); }
        catch (e) { console.warn('Parse error:', e); }
      };
    };
  }
};

// ── FLUSH PENDING ─────────────────────────────────────────────
const flushPending = (peerId, channel) => {
  const pending = pendingMessages.get(peerId) || [];
  if (pending.length > 0) {
    console.log(`Flushing ${pending.length} message(s) to ${peerId}`);
    pending.forEach((json) => {
      try { channel.send(json); }
      catch (e) { console.warn('Flush send failed:', e); }
    });
    pendingMessages.delete(peerId);
  }
};

// ── INCOMING ─────────────────────────────────────────────────
const handleIncomingMessage = (message, fromPeerId) => {
  const isNew = addMessage(message);
  if (!isNew) return;

  console.log('Mesh message received — type:',
    message.payload?.type, 'hops:', message.hopCount);

  if (onMessageCallback) onMessageCallback(getAllMessages());

  // Relay to all other open channels
  const forwarded = prepareForForward(message);
  const json = JSON.stringify(forwarded);

  peers.forEach(({ channel }, peerId) => {
    if (peerId !== fromPeerId && channel?.readyState === 'open') {
      try { channel.send(json); }
      catch (e) { console.warn('Relay failed to:', peerId); }
    }
  });
};

// ── BROADCAST ────────────────────────────────────────────────
export const broadcastAlert = (alert) => {
  const message = buildMeshMessage(alert);
  addMessage(message);

  const json = JSON.stringify(message);
  let sent   = 0;

  peers.forEach(({ channel }, peerId) => {
    if (channel?.readyState === 'open') {
      try { channel.send(json); sent++; }
      catch (e) { console.warn('Send failed:', peerId); }
    } else {
      // Queue for when channel opens
      if (!pendingMessages.has(peerId)) pendingMessages.set(peerId, []);
      pendingMessages.get(peerId).push(json);
      console.log(`Queued for ${peerId} — channel: ${channel?.readyState ?? 'null'}`);
    }
  });

  console.log(`Broadcast: sent=${sent}, pending peers=${pendingMessages.size}`);
  return message;
};

// ── HELPERS ──────────────────────────────────────────────────
const closePeer = (peerId) => {
  const entry = peers.get(peerId);
  if (entry) {
    entry.channel?.close();
    entry.pc.close();
    peers.delete(peerId);
    pendingMessages.delete(peerId);
  }
};

export const getPeerCount = () => {
  let n = 0;
  peers.forEach(({ channel }) => {
    if (channel?.readyState === 'open') n++;
  });
  return n;
};

export const isP2PReady    = () => getPeerCount() > 0;
export const disconnectP2P = () => {
  peers.forEach((_, id) => closePeer(id));
  peers.clear();
  pendingMessages.clear();
  socket?.disconnect();
  initialized = false;
};