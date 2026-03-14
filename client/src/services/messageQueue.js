// In-memory store for all peer-received messages
const messageStore = new Map();  // messageId → message
const seenIds      = new Set();  // messageIds we have already processed

const MAX_HOPS = 10;

// Generate a unique message ID
export const generateMessageId = () =>
  `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// Add an incoming message — returns false if already seen (duplicate)
export const addMessage = (message) => {
  if (seenIds.has(message.messageId)) {
    return false; // already processed — do not forward again
  }

  if (message.hopCount >= MAX_HOPS) {
    return false; // too many hops — drop it
  }

  seenIds.add(message.messageId);
  messageStore.set(message.messageId, {
    ...message,
    receivedAt: new Date().toISOString(),
  });

  return true; // new message — should be forwarded
};

// Get all stored messages sorted newest first
export const getAllMessages = () =>
  [...messageStore.values()].sort(
    (a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)
  );

// Check if we have seen a message ID already
export const hasSeen = (messageId) => seenIds.has(messageId);

// Build a mesh message envelope around an alert
export const buildMeshMessage = (alert) => ({
  messageId: generateMessageId(),
  hopCount:  0,
  origin:    alert.deviceId || 'unknown',
  timestamp: new Date().toISOString(),
  payload:   alert,          // the actual alert object
});

// Increment hop count before forwarding
export const prepareForForward = (message) => ({
  ...message,
  hopCount: message.hopCount + 1,
});