import Alert from "../models/alert.js";
import { getIO } from "../socket/socket.js";

export const createAlert = async (req, res) => {
  try {
    const { type, message, location, priority, deviceId } = req.body;

    const alert = new Alert({
      type,
      message,
      location,
      priority: priority || "MEDIUM",
      deviceId: deviceId || "unknown",
      synced: true
    });
    
    const saved = await alert.save();

    // emit socket event
    const io = getIO();
    io.emit("new_alert", saved);
    res.status(201).json({
      success: true,
      data: saved
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

export const getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

export const getAlertById = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: "Alert not found"
      });
    }

    res.status(200).json({
      success: true,
      data: alert
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

export const syncAlerts = async (req, res) => {
  try {
    const { alerts } = req.body;

    if (!alerts || !Array.isArray(alerts) || alerts.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No alerts provided"
      });
    }

    const toInsert = alerts.map(({ id, ...rest }) => ({
      ...rest,
      synced: true
    }));

    const saved = await Alert.insertMany(toInsert, { ordered: false });

    const io = getIO();
    io.emit("bulk_alerts", saved);

    res.status(200).json({
      success: true,
      synced: saved.length,
      data: saved
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};


export const deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: "Alert not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Alert deleted"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};