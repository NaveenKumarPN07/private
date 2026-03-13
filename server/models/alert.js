import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['medical', 'flood', 'road_block', 'shelter', 'other'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    priority: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: 'MEDIUM',
    },
    deviceId: {
      type: String,
      default: 'unknown',
    },
    hopCount: {
      type: Number,
      default: 0,
    },
    synced: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }   // adds createdAt and updatedAt automatically
);

const Alert = mongoose.models.Alert || mongoose.model('Alert', AlertSchema);
export default Alert;
