import RiderDutyModel from '../models/riderDuty.model.js';
import UserModel from '../models/user.model.js';
import OrderModel from '../models/order.model.js';
import RiderRemittanceModel from '../models/riderRemittance.model.js';

// Helper: Get today's date in YYYY-MM-DD (IST)
export const getTodayDateIST = () => {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));
  return ist.toISOString().split('T')[0];
};

// ── 1. Toggle Rider Duty (ON / OFF) ──────────────────────────────────────────
export const toggleDutyController = async (req, res) => {
  try {
    const riderId = req.userId;
    const { status } = req.body; // boolean or undefined (toggle)
    const today = getTodayDateIST();

    let dutyDoc = await RiderDutyModel.findOne({ riderId, date: today });
    if (!dutyDoc) {
      dutyDoc = new RiderDutyModel({
        riderId,
        date: today,
        isDutyOn: false,
        totalDutyMinutes: 0,
        shifts: []
      });
    }

    const targetStatus = typeof status === 'boolean' ? status : !dutyDoc.isDutyOn;

    if (targetStatus === true && !dutyDoc.isDutyOn) {
      // Turn ON duty
      dutyDoc.isDutyOn = true;
      dutyDoc.currentShiftStart = new Date();
    } else if (targetStatus === false && dutyDoc.isDutyOn) {
      // Turn OFF duty — calculate shift duration
      const now = new Date();
      const start = dutyDoc.currentShiftStart || now;
      const shiftMinutes = Math.max(0, Math.round((now.getTime() - new Date(start).getTime()) / 60000));

      dutyDoc.shifts.push({
        startTime: start,
        endTime: now,
        durationMinutes: shiftMinutes
      });
      dutyDoc.totalDutyMinutes = (Number(dutyDoc.totalDutyMinutes) || 0) + shiftMinutes;
      dutyDoc.isDutyOn = false;
      dutyDoc.currentShiftStart = null;
    }

    await dutyDoc.save();

    // Calculate effective live duty minutes
    let effectiveTotalMinutes = Number(dutyDoc.totalDutyMinutes) || 0;
    if (dutyDoc.isDutyOn && dutyDoc.currentShiftStart) {
      const liveMinutes = Math.max(0, Math.round((Date.now() - new Date(dutyDoc.currentShiftStart).getTime()) / 60000));
      effectiveTotalMinutes += liveMinutes;
    }

    return res.status(200).json({
      success: true,
      message: dutyDoc.isDutyOn ? 'You are now ON DUTY 🛵' : 'You are now OFF DUTY 🛑',
      data: {
        isDutyOn: dutyDoc.isDutyOn,
        currentShiftStart: dutyDoc.currentShiftStart,
        totalDutyMinutes: effectiveTotalMinutes,
        shifts: dutyDoc.shifts
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to toggle duty'
    });
  }
};

// ── 2. Get Current Rider Duty Status ─────────────────────────────────────────
export const getRiderDutyStatusController = async (req, res) => {
  try {
    const riderId = req.userId;
    const today = getTodayDateIST();

    let dutyDoc = await RiderDutyModel.findOne({ riderId, date: today });
    if (!dutyDoc) {
      return res.status(200).json({
        success: true,
        data: {
          isDutyOn: false,
          currentShiftStart: null,
          totalDutyMinutes: 0,
          shifts: []
        }
      });
    }

    let effectiveTotalMinutes = Number(dutyDoc.totalDutyMinutes) || 0;
    if (dutyDoc.isDutyOn && dutyDoc.currentShiftStart) {
      const liveMinutes = Math.max(0, Math.round((Date.now() - new Date(dutyDoc.currentShiftStart).getTime()) / 60000));
      effectiveTotalMinutes += liveMinutes;
    }

    return res.status(200).json({
      success: true,
      data: {
        isDutyOn: dutyDoc.isDutyOn,
        currentShiftStart: dutyDoc.currentShiftStart,
        totalDutyMinutes: effectiveTotalMinutes,
        shifts: dutyDoc.shifts,
        lastLocation: dutyDoc.lastLocation
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch duty status'
    });
  }
};

// ── 3. Update Rider GPS Location (REST fallback) ──────────────────────────────
export const updateRiderLocationController = async (req, res) => {
  try {
    const riderId = req.userId;
    const { latitude, longitude, heading, speed, battery } = req.body;
    const today = getTodayDateIST();

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Coordinates required' });
    }

    const updateData = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      heading: heading !== undefined ? Number(heading) : null,
      speed: speed !== undefined ? Number(speed) : null,
      battery: battery !== undefined ? Number(battery) : null,
      updatedAt: new Date()
    };

    await RiderDutyModel.findOneAndUpdate(
      { riderId, date: today },
      { $set: { lastLocation: updateData } },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true, message: 'Location updated' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── 4. Admin / Super Admin: Get All Live Riders & Fleet Status ───────────────
export const getAdminLiveRidersController = async (req, res) => {
  try {
    const today = getTodayDateIST();

    // 1. Fetch ONLY actual delivery riders (role === 'RIDER')
    const riders = await UserModel.find({
      role: 'RIDER'
    }).select('name email mobile role avatar').lean();

    // 2. Fetch today's duty records for all riders
    const dutyRecords = await RiderDutyModel.find({ date: today }).lean();
    const dutyMap = new Map();
    dutyRecords.forEach(d => {
      dutyMap.set(String(d.riderId), d);
    });

    // 3. Fetch active orders ("Out for Delivery" or "Confirmed") assigned to riders
    const activeOrders = await OrderModel.find({
      delivery_status: { $in: ['Out for Delivery', 'Confirmed'] },
      riderId: { $exists: true, $ne: null }
    }).select('orderId totalAmt delivery_status payment_status delivery_address userId restaurantId createdAt deliveredAt riderId').lean();

    const activeOrderMap = new Map();
    activeOrders.forEach(o => {
      activeOrderMap.set(String(o.riderId), o);
    });

    // 4. Calculate Unremitted COD Cash in Hand per rider:
    // Total delivered COD orders delivered by this rider minus approved remittances
    const allCodDeliveredOrders = await OrderModel.find({
      delivery_status: 'Delivered',
      payment_status: /CASH/i,
      riderId: { $exists: true, $ne: null }
    }).select('riderId totalAmt').lean();

    const codSumByRider = new Map();
    allCodDeliveredOrders.forEach(o => {
      const rId = String(o.riderId);
      codSumByRider.set(rId, (codSumByRider.get(rId) || 0) + (Number(o.totalAmt) || 0));
    });

    const approvedRemittances = await RiderRemittanceModel.find({
      status: 'APPROVED'
    }).select('riderId amount').lean();

    const remittedByRider = new Map();
    approvedRemittances.forEach(r => {
      const rId = String(r.riderId);
      remittedByRider.set(rId, (remittedByRider.get(rId) || 0) + (Number(r.amount) || 0));
    });

    // 5. Combine fleet overview
    const fleet = riders.map(rider => {
      const rId = String(rider._id);
      const duty = dutyMap.get(rId);
      const isDutyOn = Boolean(duty?.isDutyOn);

      let effectiveMinutes = Number(duty?.totalDutyMinutes) || 0;
      if (isDutyOn && duty?.currentShiftStart) {
        const liveMinutes = Math.max(0, Math.round((Date.now() - new Date(duty.currentShiftStart).getTime()) / 60000));
        effectiveMinutes += liveMinutes;
      }

      const totalCod = codSumByRider.get(rId) || 0;
      const totalRemitted = remittedByRider.get(rId) || 0;
      const cashInHand = Math.max(0, totalCod - totalRemitted);

      return {
        riderId: rider._id,
        name: rider.name || 'Snapit Rider',
        mobile: rider.mobile || '',
        email: rider.email || '',
        avatar: rider.avatar || '',
        role: rider.role,
        isDutyOn,
        dutyStartedAt: duty?.currentShiftStart || null,
        todayDutyMinutes: effectiveMinutes,
        shiftsCount: duty?.shifts?.length || 0,
        lastLocation: duty?.lastLocation || null,
        activeOrder: activeOrderMap.get(rId) || null,
        cashInHand
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        date: today,
        totalRiders: fleet.length,
        onDutyCount: fleet.filter(r => r.isDutyOn).length,
        fleet
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch live rider fleet'
    });
  }
};
