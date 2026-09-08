import RiderDutyModel from '../models/riderDuty.model.js';
import UserModel from '../models/user.model.js';
import OrderModel from '../models/order.model.js';
import RiderRemittanceModel from '../models/riderRemittance.model.js';

// Helper: Get today's date in YYYY-MM-DD (IST)
export const getTodayDateIST = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

// Helper: Get or create today's duty doc with seamless midnight shift rollover
export const getOrCreateTodayDutyDoc = async (riderId) => {
  const today = getTodayDateIST();
  let dutyDoc = await RiderDutyModel.findOne({ riderId, date: today });

  if (!dutyDoc) {
    // Check if rider had an active shift open from a previous day
    const lastActiveDoc = await RiderDutyModel.findOne({ riderId, isDutyOn: true }).sort({ date: -1 });
    let carriedOverDuty = false;
    let carriedOverStart = null;

    if (lastActiveDoc && lastActiveDoc.date !== today) {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const start = lastActiveDoc.currentShiftStart || midnight;
      const prevMinutes = Math.max(0, Math.round((midnight.getTime() - new Date(start).getTime()) / 60000));

      lastActiveDoc.shifts.push({
        startTime: start,
        endTime: midnight,
        durationMinutes: prevMinutes
      });
      lastActiveDoc.totalDutyMinutes = (Number(lastActiveDoc.totalDutyMinutes) || 0) + prevMinutes;
      lastActiveDoc.isDutyOn = false;
      lastActiveDoc.currentShiftStart = null;
      await lastActiveDoc.save();

      carriedOverDuty = true;
      carriedOverStart = midnight;
    }

    dutyDoc = new RiderDutyModel({
      riderId,
      date: today,
      isDutyOn: carriedOverDuty,
      currentShiftStart: carriedOverStart,
      totalDutyMinutes: 0,
      shifts: []
    });
    await dutyDoc.save();
  }

  return dutyDoc;
};

// ── 1. Toggle Rider Duty (ON / OFF) ──────────────────────────────────────────
export const toggleDutyController = async (req, res) => {
  try {
    const riderId = req.userId;
    const { status } = req.body; // boolean or undefined (toggle)

    let dutyDoc = await getOrCreateTodayDutyDoc(riderId);

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
    let dutyDoc = await getOrCreateTodayDutyDoc(riderId);

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

    // Update in-memory live positions and broadcast to Admin Fleet OpenStreetMap
    const payload = {
      riderId: String(riderId),
      latitude: Number(latitude),
      longitude: Number(longitude),
      heading: heading !== undefined ? Number(heading) : null,
      speed: speed !== undefined ? Number(speed) : null,
      battery: battery !== undefined ? Number(battery) : null,
      isDutyOn: true,
      timestamp: Date.now()
    };

    const latestFleet = req.app?.get('latestRiderFleetPositions');
    if (latestFleet) {
      latestFleet.set(String(riderId), payload);
    }

    const io = req.app?.get('io');
    if (io) {
      io.to('admin_live_fleet').emit('rider_fleet_updated', payload);
    }

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

    const allRiderIds = riders.map(r => r._id);

    // 2. Fetch today's duty records for all riders
    const dutyRecords = await RiderDutyModel.find({ date: today }).lean();
    const dutyMap = new Map();
    dutyRecords.forEach(d => {
      dutyMap.set(String(d.riderId), d);
    });

    // 2b. Fetch in-memory socket positions
    const inMemoryFleetMap = req.app?.get('latestRiderFleetPositions');

    // 2c. Fetch latest GPS coordinates recorded on orders for each rider
    const latestOrdersWithGps = await OrderModel.find({
      riderId: { $in: allRiderIds },
      'riderLocation.latitude': { $ne: null }
    }).sort({ 'riderLocation.updatedAt': -1, updatedAt: -1 }).lean();

    const orderLocMap = new Map();
    latestOrdersWithGps.forEach(o => {
      const rKey = String(o.riderId);
      if (!orderLocMap.has(rKey) && o.riderLocation?.latitude) {
        orderLocMap.set(rKey, {
          latitude: o.riderLocation.latitude,
          longitude: o.riderLocation.longitude,
          heading: null,
          speed: null,
          battery: null,
          updatedAt: o.riderLocation.updatedAt || o.updatedAt || o.createdAt,
          source: 'order'
        });
      }
    });

    // 2d. Fallback: Past duty records with coordinates
    const pastDutiesWithGps = await RiderDutyModel.find({
      riderId: { $in: allRiderIds },
      'lastLocation.latitude': { $ne: null }
    }).sort({ updatedAt: -1, date: -1 }).lean();

    const fallbackLocMap = new Map();
    pastDutiesWithGps.forEach(pd => {
      const rKey = String(pd.riderId);
      if (!fallbackLocMap.has(rKey) && pd.lastLocation?.latitude) {
        fallbackLocMap.set(rKey, pd.lastLocation);
      }
    });

    // 3. Fetch active orders ("Out for Delivery" or "Confirmed") assigned to riders
    const activeOrders = await OrderModel.find({
      delivery_status: { $in: ['Out for Delivery', 'Confirmed'] },
      riderId: { $exists: true, $ne: null }
    }).select('orderId totalAmt delivery_status payment_status delivery_address userId restaurantId createdAt deliveredAt riderId')
      .populate('delivery_address')
      .lean();

    const activeOrderMap = new Map();
    activeOrders.forEach(o => {
      activeOrderMap.set(String(o.riderId), o);
    });

    // 4. Calculate Unremitted COD Cash in Hand per rider:
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

    // 5. Combine fleet overview and resolve freshest GPS coordinates
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

      // Resolve best coordinates among live socket, today's duty, latest order, and past duty
      const inMemoryLoc = inMemoryFleetMap?.get(rId);
      const dutyLoc = (duty?.lastLocation?.latitude && duty?.lastLocation?.longitude) ? duty.lastLocation : null;
      const orderLoc = orderLocMap.get(rId);
      const pastDutyLoc = fallbackLocMap.get(rId);

      const candidates = [
        inMemoryLoc ? {
          latitude: Number(inMemoryLoc.latitude),
          longitude: Number(inMemoryLoc.longitude),
          heading: inMemoryLoc.heading ?? null,
          speed: inMemoryLoc.speed ?? null,
          battery: inMemoryLoc.battery ?? null,
          updatedAt: new Date(inMemoryLoc.timestamp || Date.now()),
          source: 'live_socket'
        } : null,
        dutyLoc ? { ...dutyLoc, source: 'today_duty' } : null,
        orderLoc,
        pastDutyLoc ? { ...pastDutyLoc, source: 'past_duty' } : null
      ].filter(c => c && c.latitude && c.longitude);

      // Sort by newest updatedAt timestamp descending
      candidates.sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      });

      const resolvedLoc = candidates[0] || null;

      // Determine GPS freshness: within last 15 minutes is live
      const isFreshGps = resolvedLoc?.updatedAt
        ? (Date.now() - new Date(resolvedLoc.updatedAt).getTime() < 15 * 60 * 1000)
        : false;

      // If resolvedLoc is from order or socket and today's duty doc is empty, backfill today's duty doc
      if (resolvedLoc && (!dutyLoc || new Date(resolvedLoc.updatedAt).getTime() > new Date(dutyLoc.updatedAt || 0).getTime())) {
        RiderDutyModel.findOneAndUpdate(
          { riderId: rider._id, date: today },
          {
            $set: {
              'lastLocation.latitude': resolvedLoc.latitude,
              'lastLocation.longitude': resolvedLoc.longitude,
              'lastLocation.heading': resolvedLoc.heading ?? null,
              'lastLocation.speed': resolvedLoc.speed ?? null,
              'lastLocation.battery': resolvedLoc.battery ?? null,
              'lastLocation.updatedAt': resolvedLoc.updatedAt
            }
          },
          { upsert: true }
        ).catch(() => {});
      }

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
        lastLocation: resolvedLoc ? {
          ...resolvedLoc,
          isFreshGps
        } : null,
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
