import express from 'express';
import {
  createAlert,
  getAlerts,
  getAlertById,
  syncAlerts,
  deleteAlert,
} from '../controllers/alertController.js';

const router = express.Router();

// GET  /api/alerts        → get all alerts
// POST /api/alerts        → create alert
router.route('/')
  .get(getAlerts)
  .post(createAlert);

// POST /api/alerts/sync   → bulk sync offline alerts
router.post('/sync', syncAlerts);

// GET    /api/alerts/:id  → get single alert
// DELETE /api/alerts/:id  → delete alert
router.route('/:id')
  .get(getAlertById)
  .delete(deleteAlert);

export default router;