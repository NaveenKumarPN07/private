import express          from 'express';
import cors             from 'cors';
import { createServer } from 'http';
import 'dotenv/config';

import connectDB            from './config/db.js';
import { initSocket }       from './socket/socket.js';
import { initSignaling }    from './socket/signalingSocket.js';
import alertRoutes          from './routes/alertRoutes.js';

const app        = express();
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Socket.io on the http server
const io = initSocket(httpServer);

// Initialize WebRTC signalling
initSignaling(io);

// Make io accessible in controllers via req.app.get('io')
app.set('io', io);

// Health check
app.get('/', (req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/alerts', alertRoutes);

const PORT = process.env.PORT || 5000;

// Connect DB then start — httpServer, not app
connectDB().then(() => {
  httpServer.listen(PORT,'0.0.0.0', () => {          // ← httpServer here
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('DB connection failed:', err);
  process.exit(1);
})