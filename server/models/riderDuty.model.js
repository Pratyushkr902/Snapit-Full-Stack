import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  durationMinutes: { type: Number, default: 0 }
}, { _id: false });

const riderDutySchema = new mongoose.Schema({
  riderId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String, // YYYY-MM-DD in IST
    required: true,
    index: true
  },
  isDutyOn: {
    type: Boolean,
    default: false
  },
  currentShiftStart: {
    type: Date,
    default: null
  },
  totalDutyMinutes: {
    type: Number,
    default: 0
  },
  shifts: [shiftSchema],
  lastLocation: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    heading: { type: Number, default: null },
    speed: { type: Number, default: null },
    battery: { type: Number, default: null },
    updatedAt: { type: Date, default: null }
  }
}, {
  timestamps: true
});

riderDutySchema.index({ riderId: 1, date: 1 }, { unique: true });

const RiderDutyModel = mongoose.model('RiderDuty', riderDutySchema);
export default RiderDutyModel;
