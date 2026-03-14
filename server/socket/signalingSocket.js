const rooms = new Map(); // roomId → Set of socketIds

export const initSignaling = (io) => {
  io.on('connection', (socket) => {
    console.log('Peer connected to signalling:', socket.id);

    // Peer joins the mesh room
    socket.on('join-mesh', (roomId = 'disaster-mesh') => {
      socket.join(roomId);

      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId).add(socket.id);

      // Tell the new peer who else is already in the room
      const existingPeers = [...rooms.get(roomId)].filter(
        (id) => id !== socket.id
      );
      socket.emit('existing-peers', existingPeers);

      // Tell everyone else a new peer arrived
      socket.to(roomId).emit('peer-joined', socket.id);

      console.log(`${socket.id} joined ${roomId}. Peers: ${rooms.get(roomId).size}`);
    });

    // Relay WebRTC offer from initiator to target peer
    socket.on('offer', ({ targetId, offer }) => {
      io.to(targetId).emit('offer', {
        fromId: socket.id,
        offer,
      });
    });

    // Relay WebRTC answer back to initiator
    socket.on('answer', ({ targetId, answer }) => {
      io.to(targetId).emit('answer', {
        fromId: socket.id,
        answer,
      });
    });

    // Relay ICE candidates between peers
    socket.on('ice-candidate', ({ targetId, candidate }) => {
      io.to(targetId).emit('ice-candidate', {
        fromId: socket.id,
        candidate,
      });
    });

    // Clean up when peer disconnects
    socket.on('disconnect', () => {
      rooms.forEach((peers, roomId) => {
        if (peers.has(socket.id)) {
          peers.delete(socket.id);
          socket.to(roomId).emit('peer-left', socket.id);
          console.log(`${socket.id} left ${roomId}`);
        }
      });
    });
  });
};