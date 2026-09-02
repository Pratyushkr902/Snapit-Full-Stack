import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { FaMapMarkedAlt, FaCheckCircle, FaShoppingBasket, FaPhone, FaMotorcycle, FaStore, FaClock, FaPowerOff, FaMoneyBillWave, FaWhatsapp, FaVolumeMute, FaVolumeUp } from "react-icons/fa";
import { MdPayment } from "react-icons/md";
import { IoArrowBack } from "react-icons/io5";
import { io } from 'socket.io-client';
import CollectPayment from '../components/CollectPayment';
import RiderCashRemittanceModal from '../components/RiderCashRemittanceModal';

const STORE_EMOJI = {
    'Pali Mega Mart':                 '🛒',
    'Monginis':                       '🎂',
    'Fresh Fruits Shop':              '🍎',
    'Egg Shop':                       '🥚',
    'Cold Drink & Energy Drink Shop': '🥤',
};
const storeEmoji = (name) => STORE_EMOJI[name] || '🏪';

const storeMapLink = (store) => {
    if (!store) return null;
    const lat = store.location?.lat;
    const lng = store.location?.lng;
    if (!lat || !lng) return null;
    return `https://www.google.com/maps?q=${lat},${lng}`;
};

const getDeliveryFee = (o) => {
    const fee = o.delivery_fee ?? o.deliveryFee ?? o.delivery_charge ?? o.riderFee ?? o.rider_fee ?? 0;
    return isNaN(Number(fee)) ? 0 : Number(fee);
};

const fmt = (n) => Number(n).toFixed(2);
const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const formatDutyDuration = (totalMinutes) => {
    const m = Number(totalMinutes || 0);
    const hrs = Math.floor(m / 60);
    const mins = m % 60;
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
};

// e.g. "5 Jul at 12:58 PM" — same format used in the admin History view
const fmtOrderTime = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (isNaN(d)) return null;
    const datePart = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const timePart = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${datePart} at ${timePart}`;
};

const RiderDashboard = () => {
    const navigate = useNavigate();
    const user = useSelector(state => state.user);
    const [orders, setOrders]               = useState([]);
    const [loading, setLoading]             = useState(true);
    const [filter, setFilter]               = useState('Confirmed');
    const [isTracking, setIsTracking]       = useState(false);
    const [paymentOrder, setPaymentOrder]   = useState(null);
    const [activeTab, setActiveTab]         = useState('orders');
    const [earningFilter, setEarningFilter] = useState('all');
    const [lastSynced, setLastSynced]       = useState(null);
    const [cancellingId, setCancellingId]   = useState(null);

    // ── Duty Shift State ──
    const [isDutyOn, setIsDutyOn]           = useState(false);
    const [dutyMinutes, setDutyMinutes]     = useState(0);
    const [currentShiftStart, setCurrentShiftStart] = useState(null);
    const [togglingDuty, setTogglingDuty]   = useState(false);

    // ── Remittance Modal & Cash in Hand State ──
    const [showRemittanceModal, setShowRemittanceModal] = useState(false);
    const [unremittedCash, setUnremittedCash] = useState(0);

    // ── Loud Order Siren State ──
    const [isAlarmActive, setIsAlarmActive] = useState(false);
    const alarmIntervalRef = useRef(null);
    const silencedOrdersRef = useRef(new Set());

    const socketRef = useRef(null);
    const ordersRef = useRef(orders);
    useEffect(() => { ordersRef.current = orders; }, [orders]);

    // ── Auth Guard for Rider Panel ──
    useEffect(() => {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('accesstoken');
        if (!token && !user?._id) {
            toast.error('Please login with your Rider account to access the panel', { icon: '🔐' });
            navigate('/login');
            return;
        }
        if (user?._id && !['RIDER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
            toast.error('Rider access required. Please login with a delivery partner account.', { icon: '🚫' });
            navigate('/');
            return;
        }
    }, [user?._id, user?.role, navigate]);

    // ── 1. Fetch Orders Callback ──
    const fetchRiderOrders = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await Axios({ ...SummaryApi.getOrderItems });
            if (response.data?.success) {
                const allOrders = Array.isArray(response.data.data) ? response.data.data : [];

                const visibleOrders = allOrders.filter(o => {
                    if (!o) return false;
                    if (['Confirmed', 'Out for Delivery', 'Delivered'].includes(o.delivery_status)) return true;
                    const ageMinutes = (Date.now() - new Date(o.createdAt)) / 60000;
                    if (o.delivery_status === 'Pending' && ageMinutes >= 3) return true;
                    return false;
                });

                setOrders(visibleOrders);
                setLastSynced(new Date());

                // Check for new incoming orders requiring attention (placed within last 20 mins)
                const hasNewIncoming = visibleOrders.some(o =>
                    ['Confirmed', 'Pending'].includes(o.delivery_status) &&
                    !silencedOrdersRef.current.has(o._id) &&
                    ((Date.now() - new Date(o.createdAt)) / 60000) <= 20
                );
                if (hasNewIncoming) {
                    triggerLoudOrderSiren();
                } else {
                    const anyActive = visibleOrders.some(o => ['Confirmed', 'Pending'].includes(o.delivery_status));
                    if (!anyActive) {
                        stopOrderSiren();
                    }
                }
            }
        } catch (err) {
            console.warn('[RiderOrders] fetch error:', err?.message);
            // Only alert if fatal 401 session expiry, otherwise retry silently in background
            if (err?.response?.status === 401) {
                toast.error('Session expired. Please login again.', { id: 'rider-session-expired' });
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // ── 2. Fetch Duty Status Callback ──
    const fetchDutyStatus = useCallback(async () => {
        try {
            const res = await Axios({ ...SummaryApi.getRiderDutyStatus });
            if (res.data?.success && res.data?.data) {
                setIsDutyOn(Boolean(res.data.data.isDutyOn));
                setDutyMinutes(Number(res.data.data.totalDutyMinutes) || 0);
                setCurrentShiftStart(res.data.data.currentShiftStart ? new Date(res.data.data.currentShiftStart) : null);
                localStorage.setItem('snapit_rider_duty', String(res.data.data.isDutyOn));
            }
        } catch (err) {
            console.warn('[RiderDuty] fetch error:', err?.message);
            const cachedDuty = localStorage.getItem('snapit_rider_duty') === 'true';
            if (cachedDuty) {
                setIsDutyOn(true);
            }
        }
    }, []);

    // ── 3. Fetch Unremitted Cash Callback ──
    const fetchCashSummary = useCallback(async () => {
        try {
            const res = await Axios({ ...SummaryApi.getRiderRemittanceHistory });
            if (res.data?.success && res.data?.data?.cashSummary) {
                setUnremittedCash(Number(res.data.data.cashSummary.cashInHand) || 0);
            }
        } catch (err) {
            console.warn('[RiderRemittance] fetch error:', err?.message);
        }
    }, []);

    // ── 4. Loud Order Siren & Audio Alert Engine ──
    const triggerLoudOrderSiren = useCallback(() => {
        setIsAlarmActive(true);
        const playSirenPulse = () => {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                const ctx = new AudioContext();

                // High-intensity repeating chime (Zomato/Swiggy order alert tone)
                const playBeep = (freq, startTime, duration) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, startTime);
                    gain.gain.setValueAtTime(0.85, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(startTime);
                    osc.stop(startTime + duration);
                };

                const now = ctx.currentTime;
                playBeep(850, now, 0.25);
                playBeep(1150, now + 0.28, 0.28);
                playBeep(850, now + 0.58, 0.25);
                playBeep(1150, now + 0.86, 0.45);

                if (navigator.vibrate) {
                    navigator.vibrate([400, 200, 400, 200, 800]);
                }
            } catch (e) {
                console.warn('[RiderSiren] Sound playback error:', e);
            }
        };

        playSirenPulse();
        if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = setInterval(playSirenPulse, 2600);
    }, []);

    const stopOrderSiren = useCallback(() => {
        setIsAlarmActive(false);
        if (alarmIntervalRef.current) {
            clearInterval(alarmIntervalRef.current);
            alarmIntervalRef.current = null;
        }
        // Mark currently visible pending/confirmed orders as acknowledged
        (ordersRef.current || []).forEach(o => {
            if (o?._id) silencedOrdersRef.current.add(o._id);
        });
    }, []);

    const playOrderAlertSound = useCallback(() => {
        triggerLoudOrderSiren();
    }, [triggerLoudOrderSiren]);

    // Clean up siren on unmount
    useEffect(() => {
        return () => {
            if (alarmIntervalRef.current) {
                clearInterval(alarmIntervalRef.current);
            }
        };
    }, []);

    // ── 4b. 1-Tap WhatsApp Forward Handlers ──
    const handleWhatsAppStore = (order) => {
        const store = order.store_details || order.store || {};
        const storeName = store.name || order.restaurantName || 'Restaurant';
        const itemsList = order.cartItems?.map((item, idx) => `• ${item.quantity}x ${item.productId?.name || item.name}`).join('\n') || 'Order items';
        const rawStorePhone = String(store.phone || store.contactNumber || store.mobile || '');
        const cleanStorePhone = rawStorePhone.replace(/\D/g, '');

        const message = `*Snapit Order #${order.orderId?.slice(-8) || order.orderId}* ⚡\n\n*Store:* ${storeName}\n*Customer:* ${order.delivery_address?.recipient_name || order.userId?.name || 'Customer'}\n\n*Items to Prepare:*\n${itemsList}\n\n*Total Amount:* ₹${order.totalAmt || 0}\n*Payment Mode:* ${order.payment_status || 'CASH ON DELIVERY'}\n\n*Rider:* Manish Kumar (Snapit)\nPlease start preparing and keep packed. Rider reaching in 5-10 minutes! 🛵💨`;

        const waUrl = cleanStorePhone.length >= 10
            ? `https://api.whatsapp.com/send?phone=91${cleanStorePhone.slice(-10)}&text=${encodeURIComponent(message)}`
            : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

        window.open(waUrl, '_blank');
    };

    const handleWhatsAppCustomer = (order) => {
        const rawPhone = String(order.recipient_mobile || order.delivery_address?.recipient_mobile || order.delivery_address?.mobile || order.userId?.mobile || '');
        const cleanPhone = rawPhone.replace(/\D/g, '');
        if (!cleanPhone) {
            toast.error('Customer phone number not available');
            return;
        }
        const message = `Hello! Snapit delivery partner Manish yahan se. Aapka order #${order.orderId?.slice(-6) || ''} leke main nikal raha hoon. Doorstep pe 10-15 min mein pahunch raha hoon! 🛵`;
        window.open(`https://api.whatsapp.com/send?phone=91${cleanPhone.slice(-10)}&text=${encodeURIComponent(message)}`, '_blank');
    };

    // ── 5. Online / Offline Connectivity Tracker ──
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.success('🌐 Online: Synced with Paliganj server');
            fetchRiderOrders(true);
        };
        const handleOffline = () => {
            setIsOnline(false);
            toast.error('⚠️ Offline: Lost network connection. Reconnecting…', { duration: 5000 });
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [fetchRiderOrders]);

    // ── 6. Initial Load & Polling Interval ──
    useEffect(() => {
        fetchRiderOrders();
        fetchDutyStatus();
        fetchCashSummary();
        const interval = setInterval(() => {
            fetchRiderOrders(true);
            fetchCashSummary();
        }, 20000);
        return () => clearInterval(interval);
    }, [fetchRiderOrders, fetchDutyStatus, fetchCashSummary]);

    // ── 7. Toggle Duty Handler ──
    const handleToggleDuty = async () => {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('accesstoken');
        if (!token) {
            toast.error('Please login with your Rider account', { icon: '🔐' });
            navigate('/login');
            return;
        }

        const target = !isDutyOn;
        try {
            setTogglingDuty(true);

            // If going ON DUTY, test GPS permissions
            if (target && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    () => {},
                    (err) => {
                        console.warn('[RiderGPS] Permission prompt warning:', err.message);
                        toast('Please enable GPS Location on your device for accurate tracking', { icon: '📍' });
                    },
                    { enableHighAccuracy: true, timeout: 6000 }
                );
            }

            // Optimistic update
            setIsDutyOn(target);
            localStorage.setItem('snapit_rider_duty', String(target));
            if (target) {
                setCurrentShiftStart(new Date());
            }

            const res = await Axios({
                ...SummaryApi.toggleRiderDuty,
                data: { status: target }
            });
            if (res.data?.success && res.data?.data) {
                setIsDutyOn(Boolean(res.data.data.isDutyOn));
                setDutyMinutes(Number(res.data.data.totalDutyMinutes) || 0);
                setCurrentShiftStart(res.data.data.currentShiftStart ? new Date(res.data.data.currentShiftStart) : null);
            }
            
            if (target) {
                toast.success('🟢 ON DUTY! You can now accept deliveries and stream live GPS.', { duration: 4000 });
            } else {
                toast('🔴 OFF DUTY. Shift hours logged successfully.', { icon: '🛑', duration: 4000 });
            }
        } catch (err) {
            console.warn('[RiderDuty] Server sync note:', err?.message);
            if (err?.response?.status === 401) {
                toast.error('Session expired. Please login again.', { icon: '🔐' });
                navigate('/login');
            } else {
                // If network or server route is updating, maintain local on-duty state seamlessly
                if (target) {
                    toast.success('🟢 ON DUTY! GPS tracking active on device.', { duration: 4000 });
                } else {
                    toast('🔴 OFF DUTY.', { icon: '🛑', duration: 4000 });
                }
            }
        } finally {
            setTogglingDuty(false);
        }
    };

    // ── 8. Live Duty Stopwatch Timer ──
    useEffect(() => {
        if (!isDutyOn || !currentShiftStart) return;
        const timer = setInterval(() => {
            const liveMinutes = Math.max(0, Math.round((Date.now() - new Date(currentShiftStart).getTime()) / 60000));
            // Keep timer fresh
        }, 10000);
        return () => clearInterval(timer);
    }, [isDutyOn, currentShiftStart]);

    // ── 9. Socket Connection ──
    useEffect(() => {
        const socket = io(
            import.meta.env.VITE_API_URL || 'https://snapit-full-stack-production.up.railway.app',
            {
                path: '/socket.io/',
                transports: ['websocket', 'polling'],
                withCredentials: true,
            }
        );
        socketRef.current = socket;

        socket.on('new_order', () => {
            fetchRiderOrders(true);
            playOrderAlertSound();
            toast('🛵 New order available in Paliganj!', { icon: '📦', duration: 5000 });
        });
        socket.on('order_confirmed', () => {
            fetchRiderOrders(true);
            playOrderAlertSound();
        });

        return () => {
            socket.off('new_order');
            socket.off('order_confirmed');
            socket.disconnect();
        };
    }, [fetchRiderOrders, playOrderAlertSound]);

    // ─── High-Precision GPS Engine for On-Duty Delivery Partners (Manish Kumar) ──
    useEffect(() => {
        let isCancelled = false;
        let webWatchId = null;
        let capCallbackId = null;
        let lastHttpSync = 0;

        const processLocation = (lat, lng, heading = null, speed = null, accuracy = null) => {
            if (isCancelled || !lat || !lng) return;
            // Filter out coarse cell-tower noise if accuracy is worse than 80m
            if (accuracy && accuracy > 80) {
                console.warn('[RiderGPS] Discarding coarse GPS fix (accuracy too low):', accuracy);
                return;
            }

            // 1. Broadcast to Admin Fleet Tracker
            if (socketRef.current) {
                socketRef.current.emit('rider_live_location', {
                    riderId:     user?._id,
                    riderName:   user?.name,
                    riderMobile: user?.mobile,
                    latitude:    lat,
                    longitude:   lng,
                    heading:     heading || 0,
                    speed:       speed || 0,
                    accuracy:    accuracy || null,
                    isDutyOn:    true
                });
            }

            // 2. Broadcast to active customer tracking map for Out for Delivery orders
            const activeOrders = (ordersRef.current || []).filter(o => o?.delivery_status === "Out for Delivery");
            activeOrders.forEach(o => {
                if (socketRef.current && o?.orderId) {
                    socketRef.current.emit('send_location', {
                        orderId:   o.orderId,
                        latitude:  lat,
                        longitude: lng,
                        heading:   heading || 0,
                        speed:     speed || 0
                    });
                }
            });

            // 3. Throttle HTTP persistence to backend every 8s
            const nowTime = Date.now();
            if (activeOrders.length > 0 && nowTime - lastHttpSync > 8000) {
                lastHttpSync = nowTime;
                activeOrders.forEach(o => {
                    if (o?.orderId) {
                        Axios({
                            url: `/api/order/rider-location/${o.orderId}`,
                            method: 'post',
                            data: { latitude: lat, longitude: lng }
                        }).catch(() => {});
                    }
                });
            }
        };

        const startHighAccuracyGPS = async () => {
            // Strictly guard: ONLY run for active RIDER accounts on duty
            if (!isDutyOn || user?.role !== 'RIDER') return;

            try {
                const { Capacitor } = await import('@capacitor/core');
                if (Capacitor.isNativePlatform()) {
                    const { Geolocation } = await import('@capacitor/geolocation');
                    const perm = await Geolocation.checkPermissions();
                    if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
                        await Geolocation.requestPermissions();
                    }
                    capCallbackId = await Geolocation.watchPosition(
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 },
                        (pos, err) => {
                            if (err) {
                                console.warn('[NativeRiderGPS] Watch error:', err);
                                return;
                            }
                            if (pos?.coords) {
                                processLocation(
                                    pos.coords.latitude,
                                    pos.coords.longitude,
                                    pos.coords.heading,
                                    pos.coords.speed,
                                    pos.coords.accuracy
                                );
                            }
                        }
                    );
                    return;
                }
            } catch (err) {
                console.warn('[RiderGPS] Native GPS init fell back to browser:', err?.message);
            }

            // Web Browser High Accuracy GPS Fallback
            if (navigator.geolocation) {
                webWatchId = navigator.geolocation.watchPosition(
                    (pos) => {
                        processLocation(
                            pos.coords.latitude,
                            pos.coords.longitude,
                            pos.coords.heading,
                            pos.coords.speed,
                            pos.coords.accuracy
                        );
                    },
                    (err) => console.warn('[WebRiderGPS] Watch error:', err?.message),
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
                );
            }
        };

        startHighAccuracyGPS();

        return () => {
            isCancelled = true;
            if (webWatchId !== null && navigator.geolocation) {
                navigator.geolocation.clearWatch(webWatchId);
            }
            if (capCallbackId) {
                import('@capacitor/geolocation').then(({ Geolocation }) => {
                    Geolocation.clearWatch({ id: capCallbackId }).catch(() => {});
                }).catch(() => {});
            }
        };
    }, [isDutyOn, user?.role, user?._id, user?.name, user?.mobile]);

    const handlePickup = async (order) => {
        if (!isDutyOn) {
            toast.error('Please switch ON DUTY before picking up orders!', { icon: '🛑', duration: 4000 });
            return;
        }
        try {
            const response = await Axios({
                ...SummaryApi.updateOrderStatus,
                data: { orderId: order.orderId, status: 'Out for Delivery' }
            });
            if (response.data.success) {
                toast.success('Order picked up — now Out for Delivery!');
                setIsTracking(true);
                fetchRiderOrders(true);
            }
        } catch (error) {
            console.error('Pickup update failed:', error?.response?.data || error);
            toast.error(error?.response?.data?.message || "Update failed");
        }
    };

    // Cancel an order still waiting for pickup (Confirmed) or still stuck
    // awaiting seller response (Pending + delayed). Confirms first to avoid
    // accidental taps, guards against duplicate submits while a request is
    // in flight, and routes through the same updateOrderStatus endpoint the
    // backend already supports ('Cancelled' is a valid enum value and the
    // controller already handles refund calc + customer notification for
    // this status). `cancelledBy: 'rider'` is included so the backend can
    // distinguish rider-initiated cancels from admin/customer ones — this
    // only has effect if the controller reads and persists that field.
    const handleCancel = async (order) => {
        if (cancellingId) return; // a cancel is already in flight — ignore extra taps
        const confirmed = window.confirm(`Cancel order ${order.orderId}? This cannot be undone.`);
        if (!confirmed) return;
        setCancellingId(order.orderId);
        try {
            const response = await Axios({
                ...SummaryApi.updateOrderStatus,
                data: { orderId: order.orderId, status: 'Cancelled', cancelledBy: 'rider' }
            });
            if (response.data.success) {
                toast.success('Order cancelled');
                fetchRiderOrders(true);
            }
        } catch {
            toast.error("Cancel failed");
        } finally {
            setCancellingId(null);
        }
    };

    // ── Earnings ──────────────────────────────────────────────
    const isDeliveredToday = (o) => {
        if (!o || o.delivery_status !== 'Delivered') return false;
        const rawDate = o.deliveredAt || o.updatedAt || o.createdAt;
        if (!rawDate) return false;
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return false;
        const orderIST = new Date(d.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);
        const todayIST = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
        return orderIST === todayIST;
    };

    const now = new Date();
    const filterByDate = (list) => (Array.isArray(list) ? list : []).filter(o => {
        if (!o) return false;
        const deliveryTime = new Date(o.deliveredAt || o.createdAt);
        if (isNaN(deliveryTime.getTime())) return false;
        if (earningFilter === 'today') return isDeliveredToday(o);
        if (earningFilter === 'week')  { const w = new Date(now); w.setDate(now.getDate()-7); return deliveryTime >= w; }
        if (earningFilter === 'month') return deliveryTime.getMonth() === now.getMonth() && deliveryTime.getFullYear() === now.getFullYear();
        return true; // 'all'
    });

    const safeOrders             = Array.isArray(orders) ? orders : [];
    const allDeliveredOrders     = safeOrders.filter(o => o && o.delivery_status === 'Delivered');
    const deliveredTodayOrders   = allDeliveredOrders.filter(isDeliveredToday);
    const deliveredTodayEarned   = deliveredTodayOrders.reduce((acc, o) => acc + getDeliveryFee(o || {}), 0);
    const deliveredTodayDistance = deliveredTodayOrders.reduce((sum, o) => {
        if (Number(o?.delivery_distance_km) > 0) return sum + Number(o.delivery_distance_km);
        const addrText = `${o?.delivery_address?.address_line || ''} ${o?.delivery_address?.city || ''}`;
        if (/himalaya|hmch|bams|mbbs/i.test(addrText)) return sum + 9.5;
        if (/chiksi|chikasi/i.test(addrText)) return sum + 7.2;
        return sum + 1.8;
    }, 0);

    const filteredEarnings = filterByDate(allDeliveredOrders);
    const totalEarned      = filteredEarnings.reduce((acc, o) => acc + getDeliveryFee(o || {}), 0);
    const totalDelivered   = filteredEarnings.length;
    const avgFee           = totalDelivered > 0 ? totalEarned / totalDelivered : 0;

    const earningsByDate = filteredEarnings.reduce((acc, o) => {
        if (!o) return acc;
        const rawDate = o.deliveredAt || o.createdAt;
        const d = new Date(rawDate);
        const date = !isNaN(d.getTime()) ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Unknown';
        if (!acc[date]) acc[date] = { total: 0, count: 0 };
        acc[date].total += getDeliveryFee(o || {});
        acc[date].count += 1;
        return acc;
    }, {});

    const filteredOrders = safeOrders.filter(o => {
        if (!o) return false;
        if (filter === 'Delivered') return o.delivery_status === 'Delivered';
        if (o.delivery_status === 'Delivered' || o.delivery_status === 'Cancelled') return false;
        if (filter === 'All') return true;
        return o.delivery_status === filter;
    });

    const totalInHand = safeOrders
        .filter(o => o && o.delivery_status === 'Out for Delivery')
        .reduce((acc, curr) => acc + (Number(curr?.totalAmt) || 0), 0);

    if (loading) return (
        <div className='flex flex-col items-center justify-center min-h-screen bg-slate-950'>
            <div className='relative w-16 h-16 mb-6'>
                <div className='absolute inset-0 border-4 border-blue-500/30 rounded-full'></div>
                <div className='absolute inset-0 border-4 border-t-blue-400 rounded-full animate-spin'></div>
                <span className='absolute inset-0 flex items-center justify-center text-2xl'>🛵</span>
            </div>
            <p className='font-black text-blue-400 tracking-widest text-xs uppercase animate-pulse'>Syncing Paliganj Orders…</p>
        </div>
    );

    return (
        <div className='min-h-screen bg-slate-950 text-white w-full max-w-full overflow-x-hidden pb-12 font-sans'>

            {/* ── TOP HEADER BAR ── */}
            <header className='sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-4 py-2.5 w-full'>
                <div className='max-w-5xl mx-auto space-y-2'>
                    
                    {/* Top Row: Navigation + Duty Switcher + Refresh */}
                    <div className='flex items-center justify-between gap-2'>
                        <div className='flex items-center gap-2.5 min-w-0'>
                            <button
                                onClick={() => navigate(-1)}
                                className='w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90 flex-shrink-0'
                            >
                                <IoArrowBack size={16}/>
                            </button>
                            <div className='min-w-0'>
                                <div className='flex items-center gap-1.5'>
                                    <span className='w-2 h-2 rounded-full bg-emerald-400'></span>
                                    <p className='text-[9px] font-black text-slate-400 uppercase tracking-widest truncate'>Snapit Logistics · Paliganj</p>
                                </div>
                                <h1 className='text-base sm:text-lg font-black text-white leading-tight truncate tracking-tight'>RIDER COMMAND</h1>
                            </div>
                        </div>

                        <div className='flex items-center gap-1.5 sm:gap-2 flex-shrink-0'>
                            <button
                                onClick={handleToggleDuty}
                                disabled={togglingDuty}
                                className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-md ${
                                    isDutyOn
                                        ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/25 ring-2 ring-emerald-400/40 animate-pulse'
                                        : 'bg-rose-950/60 text-rose-300 border border-rose-800/60 hover:bg-rose-900/60'
                                }`}
                            >
                                <FaPowerOff size={10} />
                                <span>{togglingDuty ? 'Updating…' : isDutyOn ? '🟢 ON DUTY' : '🔴 OFF DUTY'}</span>
                            </button>

                            <button
                                onClick={() => fetchRiderOrders(true)}
                                className='w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90'
                                title='Refresh'
                            >
                                🔄
                            </button>
                        </div>
                    </div>

                    {/* Secondary Row: Quick Stats HUD */}
                    <div className='grid grid-cols-2 sm:grid-cols-3 gap-2 pt-0.5 w-full'>
                        {/* Duty Shift Card */}
                        <div className='bg-slate-900/90 border border-slate-800/90 rounded-2xl p-2.5 flex flex-col justify-between shadow-sm'>
                            <p className='text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1'>
                                <FaClock size={10} className={isDutyOn ? 'text-emerald-400' : 'text-slate-500'} />
                                <span>Duty Today</span>
                            </p>
                            <div className='flex items-baseline justify-between mt-1'>
                                <span className='text-sm sm:text-base font-black text-white tracking-tight'>
                                    {formatDutyDuration(dutyMinutes)}
                                </span>
                                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${isDutyOn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                    {isDutyOn ? 'Active' : 'Off'}
                                </span>
                            </div>
                        </div>

                        {/* Cash in Hand & Remit Card */}
                        <div
                            onClick={() => setShowRemittanceModal(true)}
                            className='bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-900 border border-amber-500/40 hover:border-amber-500/70 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition-all active:scale-95 group shadow-sm'
                        >
                            <div className='flex items-center justify-between'>
                                <p className='text-[9px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1'>
                                    <FaMoneyBillWave size={10} />
                                    <span>Cash in Hand</span>
                                </p>
                                <span className='text-[9px] font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded-md'>
                                    Deposit ➔
                                </span>
                            </div>
                            <p className='text-sm sm:text-base font-black text-amber-400 group-hover:text-amber-300 transition mt-1 truncate'>
                                {fmtINR(unremittedCash || totalInHand)}
                            </p>
                        </div>

                        {/* Total Delivered Today */}
                        <div className='hidden sm:flex bg-slate-900/90 border border-slate-800/90 rounded-2xl p-2.5 flex-col justify-between shadow-sm'>
                            <p className='text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1'>
                                <span>📦</span> Delivered Today
                            </p>
                            <div className='flex items-baseline justify-between mt-1'>
                                <span className='text-base font-black text-white'>
                                    {deliveredTodayOrders.length}
                                </span>
                                <span className='text-[9px] font-bold text-emerald-400 flex items-center gap-1'>
                                    <span>📍 {deliveredTodayDistance.toFixed(1)} km</span>
                                    <span>•</span>
                                    <span>{fmtINR(deliveredTodayEarned)}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className='max-w-5xl mx-auto px-3 sm:px-4 py-4 w-full max-w-full overflow-x-hidden'>

                {/* ── SEGMENTED NAVIGATION TABS ── */}
                <div className='flex gap-1.5 sm:gap-2 mb-4 bg-slate-900/90 rounded-2xl p-1.5 border border-slate-800 w-full shadow-inner'>
                    <button onClick={() => setActiveTab('orders')}
                        className={`flex-1 py-2 sm:py-2.5 rounded-xl font-black text-[11px] sm:text-xs transition-all truncate flex items-center justify-center gap-1.5 ${
                            activeTab === 'orders'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                                : 'text-slate-400 hover:text-white'
                        }`}>
                        <span>🛵</span>
                        <span>Orders ({orders.filter(o => o.delivery_status !== 'Delivered' && o.delivery_status !== 'Cancelled').length})</span>
                    </button>
                    <button onClick={() => setActiveTab('earnings')}
                        className={`flex-1 py-2 sm:py-2.5 rounded-xl font-black text-[11px] sm:text-xs transition-all truncate flex items-center justify-center gap-1.5 ${
                            activeTab === 'earnings'
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                                : 'text-slate-400 hover:text-white'
                        }`}>
                        <span>💰</span>
                        <span>Earnings</span>
                    </button>
                    <button onClick={() => setShowRemittanceModal(true)}
                        className='px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-black text-[11px] sm:text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all flex items-center gap-1.5 flex-shrink-0 active:scale-95'>
                        <FaMoneyBillWave size={12} />
                        <span>Deposit Cash</span>
                    </button>
                </div>

                {/* 🚨 Loud Order Siren Flashing Alert Banner */}
                {isAlarmActive && (
                    <div className='mb-4 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white flex items-center justify-between gap-3 shadow-xl border-2 border-white/40 animate-pulse'>
                        <div className='flex items-center gap-3 min-w-0'>
                            <span className='text-2xl sm:text-3xl animate-bounce'>🚨</span>
                            <div className='min-w-0'>
                                <p className='font-black text-sm text-white uppercase tracking-wider'>NEW ORDER INCOMING!</p>
                                <p className='text-xs text-white/90 truncate'>Siren ringing loud. Check order details below.</p>
                            </div>
                        </div>
                        <button
                            onClick={stopOrderSiren}
                            className='px-3.5 py-2 bg-white text-red-700 hover:bg-slate-100 font-black text-xs rounded-xl shadow-lg active:scale-95 transition flex items-center gap-1.5 flex-shrink-0'
                        >
                            <FaVolumeMute size={14}/>
                            <span>Stop Siren</span>
                        </button>
                    </div>
                )}

                {/* Offline Warning Bar */}
                {!isOnline && (
                    <div className='mb-4 p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-between gap-2 text-xs font-bold'>
                        <span className='flex items-center gap-1.5'>
                            <span className='w-2 h-2 rounded-full bg-amber-400 animate-ping'></span>
                            <span>Network Disconnected — working offline. Actions will sync upon reconnection.</span>
                        </span>
                        <button onClick={() => fetchRiderOrders(true)} className='px-2.5 py-1 bg-amber-500 text-slate-950 font-black rounded-lg text-[10px]'>Retry</button>
                    </div>
                )}

                {/* ══════════════ ORDERS TAB ══════════════ */}
                {activeTab === 'orders' && (
                    <>
                        {/* Off Duty Notice Banner */}
                        {!isDutyOn && (
                            <div className='mb-4 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-rose-950/60 to-slate-900 border border-rose-800/60 text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md'>
                                <div className='flex items-center gap-3'>
                                    <span className='text-2xl sm:text-3xl'>🛑</span>
                                    <div>
                                        <p className='font-black text-sm text-white'>You are currently OFF DUTY</p>
                                        <p className='text-xs text-rose-300/80'>Switch ON DUTY to accept delivery orders and stream live GPS location.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleToggleDuty}
                                    disabled={togglingDuty}
                                    className='w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition whitespace-nowrap'
                                >
                                    Go ON DUTY
                                </button>
                            </div>
                        )}

                        {/* Large Cash Remittance Banner on Top of Orders */}
                        {(unremittedCash > 0 || totalInHand > 0) && (
                            <div className='mb-4 p-4 rounded-3xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg'>
                                <div>
                                    <div className='flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider'>
                                        <FaMoneyBillWave size={14} />
                                        <span>Unremitted Cash in Hand</span>
                                    </div>
                                    <p className='text-2xl font-black text-amber-400 mt-1 tracking-tight'>
                                        {fmtINR(unremittedCash || totalInHand)}
                                    </p>
                                    <p className='text-[11px] text-slate-400 mt-0.5'>
                                        Deposit collected COD cash online to Super Admin
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowRemittanceModal(true)}
                                    className='w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black text-xs rounded-2xl shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2 whitespace-nowrap'
                                >
                                    <FaMoneyBillWave size={13} />
                                    <span>Deposit to Super Admin</span>
                                </button>
                            </div>
                        )}

                        {/* Filter Chips */}
                        <div className='flex gap-1.5 sm:gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide w-full'>
                            {[
                                { key: 'Confirmed', label: '📦 Ready for Pickup' },
                                { key: 'Out for Delivery', label: '🛵 Out for Delivery' },
                                { key: 'Delivered', label: '✅ Delivered' },
                                { key: 'All', label: '📋 All Orders' },
                            ].map(t => (
                                <button key={t.key} onClick={() => setFilter(t.key)}
                                    className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all border ${
                                        filter === t.key
                                            ? 'bg-white text-slate-900 border-white shadow-md'
                                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                                    }`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Order Cards Grid */}
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full max-w-full'>
                            {filteredOrders.length === 0 ? (
                                <div className='col-span-full py-16 text-center bg-slate-900/80 rounded-3xl border-2 border-dashed border-slate-800 p-6'>
                                    <p className='text-4xl mb-2'>🛵</p>
                                    <p className='text-slate-300 font-black text-sm'>No {filter === 'Confirmed' ? 'Ready for Pickup' : filter} orders</p>
                                    <p className='text-slate-500 text-xs mt-1'>Auto-refreshes every 20 seconds</p>
                                    <button onClick={() => fetchRiderOrders(true)} className='mt-3 text-xs text-blue-400 font-black underline'>Refresh Now</button>
                                </div>
                            ) : (
                                filteredOrders.map((order) => {
                                    const store          = order.store_details;
                                    const mapLink        = storeMapLink(store);
                                    const hasMultiStores = order.involved_stores?.length > 1;
                                    const ageMinutes     = (Date.now() - new Date(order.createdAt)) / 60000;
                                    const isSellerDelayed = order.delivery_status === 'Pending' && ageMinutes >= 3;
                                    const canCancel      = order.delivery_status === 'Confirmed' || isSellerDelayed;
                                    const isCancelling   = cancellingId === order.orderId;
                                    const isUnassigned   = !order.riderId;

                                    return (
                                        <div key={order._id}
                                            className={`bg-slate-900 border rounded-3xl p-4 sm:p-5 flex flex-col gap-3.5 transition-all w-full max-w-full overflow-hidden box-border shadow-lg ${
                                                isSellerDelayed
                                                    ? 'border-amber-500/50 shadow-amber-500/10'
                                                    : isUnassigned
                                                        ? 'border-blue-500/40 shadow-blue-500/10'
                                                        : 'border-slate-800 hover:border-slate-700'
                                            }`}>

                                            {/* Order Top Bar: ID + Status + Time */}
                                            <div className='flex items-start justify-between gap-2'>
                                                <div className='min-w-0'>
                                                    <div className='flex items-center gap-1.5 flex-wrap'>
                                                        <span className='text-[10px] font-mono font-black bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg uppercase tracking-wider'>
                                                            #{order.orderId?.slice(-8) || order.orderId}
                                                        </span>
                                                        {order.delivery_distance_km > 0 && (
                                                            <span className='bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-[10px] font-black'>
                                                                📍 {order.delivery_distance_km} km
                                                            </span>
                                                        )}
                                                        {isUnassigned && (
                                                            <span className='bg-blue-500/20 border border-blue-500/30 text-blue-400 px-1.5 py-0.5 rounded text-[9px] font-black uppercase'>
                                                                ⚡ Open to Claim
                                                            </span>
                                                        )}
                                                    </div>
                                                    {fmtOrderTime(order.createdAt) && (
                                                        <p className='text-[10px] text-slate-500 font-bold mt-1 flex items-center gap-1'>
                                                            <FaClock size={9} /> {fmtOrderTime(order.createdAt)}
                                                        </p>
                                                    )}
                                                </div>

                                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex-shrink-0 ${
                                                    order.delivery_status === 'Confirmed'        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                    order.delivery_status === 'Out for Delivery' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'  :
                                                    isSellerDelayed                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                }`}>
                                                    {isSellerDelayed ? '⏳ Awaiting Seller' : order.delivery_status === 'Confirmed' ? 'Ready for Pickup' : order.delivery_status}
                                                </span>
                                            </div>

                                            {/* Customer / Recipient Address & Contact Box */}
                                            <div className='bg-slate-950/70 rounded-2xl p-3 border border-slate-800/80 flex items-start justify-between gap-3'>
                                                <div className='min-w-0 flex-1'>
                                                    <div className='flex items-center gap-2'>
                                                        <p className='text-[9px] font-black text-slate-500 uppercase tracking-wider'>
                                                            {order.order_for === 'SOMEONE_ELSE' ? '🎁 Deliver to Recipient' : 'Deliver To'}
                                                        </p>
                                                        {order.order_for === 'SOMEONE_ELSE' && (
                                                            <span className='px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[9px] font-bold rounded-full border border-amber-500/30'>
                                                                Friends & Family
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className='text-sm font-bold text-white mt-0.5 leading-snug break-words'>
                                                        {order.order_for === 'SOMEONE_ELSE' && order.recipient_name
                                                            ? `${order.recipient_name} (For ${order.userId?.name || 'Customer'})`
                                                            : order.userId?.name || order.recipient_name || "Snapit Customer"}
                                                    </h3>

                                                    <p className='text-xs text-slate-400 font-medium mt-0.5'>
                                                        {order.delivery_address?.address_line || "📍 Address not provided"}
                                                    </p>

                                                    {(order.delivery_address?.floor_door || order.delivery_address?.landmark) && (
                                                        <p className='text-[11px] text-slate-500 mt-0.5'>
                                                            {[order.delivery_address?.floor_door, order.delivery_address?.landmark].filter(Boolean).join(' • ')}
                                                        </p>
                                                    )}

                                                    {order.delivery_instructions && (
                                                        <p className='text-[11px] text-amber-400/90 italic mt-1 font-semibold'>
                                                            📝 Note: {order.delivery_instructions}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className='flex gap-1.5 flex-shrink-0'>
                                                    <button
                                                        type='button'
                                                        onClick={() => handleWhatsAppCustomer(order)}
                                                        className='w-9 h-9 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all active:scale-90'
                                                        title='WhatsApp Customer'
                                                    >
                                                        <FaWhatsapp size={15}/>
                                                    </button>
                                                    <a href={`tel:${order.recipient_mobile || order.delivery_address?.recipient_mobile || order.delivery_address?.mobile || order.userId?.mobile}`}
                                                        className='w-9 h-9 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all active:scale-90'
                                                        title='Call Recipient'
                                                    >
                                                        <FaPhone size={14}/>
                                                    </a>
                                                    <a href={
                                                        order.delivery_lat && order.delivery_lng
                                                            ? `https://www.google.com/maps?q=${order.delivery_lat},${order.delivery_lng}`
                                                            : order.delivery_address?.lat && order.delivery_address?.lng
                                                                ? `https://www.google.com/maps?q=${order.delivery_address.lat},${order.delivery_address.lng}`
                                                                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address?.address_line || "")}`
                                                    }
                                                        target="_blank" rel="noreferrer"
                                                        className='w-9 h-9 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all active:scale-90'
                                                        title='Customer Location Map'
                                                    >
                                                        <FaMapMarkedAlt size={14}/>
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Store Pickup Box */}
                                            <div className='bg-slate-950/70 rounded-2xl p-3 border border-slate-800/80'>
                                                <div className='flex items-center justify-between gap-2'>
                                                    <div className='flex items-center gap-2.5 min-w-0'>
                                                        <span className='text-xl flex-shrink-0'>{storeEmoji(store?.name)}</span>
                                                        <div className='min-w-0'>
                                                            <p className='text-[9px] font-black text-amber-400/90 uppercase flex items-center gap-1'>
                                                                <FaStore size={8}/> Pickup Store
                                                            </p>
                                                            <p className='text-xs sm:text-sm font-black text-white truncate'>{store?.name || "Pali Mega Mart"}</p>
                                                            {store?.address && <p className='text-[10px] text-slate-400 truncate'>{store.address}</p>}
                                                        </div>
                                                    </div>
                                                    <div className='flex items-center gap-1.5 flex-shrink-0'>
                                                        <button
                                                            type='button'
                                                            onClick={() => handleWhatsAppStore(order)}
                                                            className='flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all active:scale-90 shadow-sm'
                                                            title='Forward order breakdown to restaurant kitchen'
                                                        >
                                                            <FaWhatsapp size={12}/>
                                                            <span>WhatsApp</span>
                                                        </button>
                                                        {mapLink && (
                                                            <a href={mapLink} target="_blank" rel="noreferrer"
                                                                className='flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all active:scale-90 flex-shrink-0'>
                                                                <FaMapMarkedAlt size={11}/>
                                                                <span>Map</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Items List */}
                                            <div className='bg-slate-950/40 rounded-2xl p-3 border border-slate-800/50'>
                                                <p className='text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 mb-1.5'>
                                                    <FaShoppingBasket size={9}/> Items ({order.cartItems?.length || 0})
                                                </p>
                                                <div className='divide-y divide-slate-800/60'>
                                                    {order.cartItems?.map((item, i) => (
                                                        <div key={i} className='flex justify-between text-xs py-1 font-medium text-slate-300'>
                                                            <span className='line-clamp-1 mr-2'>
                                                                {item.productId?.name || item.name}
                                                                {item.productId?.unit && (
                                                                    <span className='text-slate-500 font-normal'> ({item.productId.unit})</span>
                                                                )}
                                                            </span>
                                                            <span className='text-blue-400 font-bold flex-shrink-0'>
                                                                ×{item.quantity}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Financial Summary */}
                                            <div className='flex items-center justify-between pt-1 border-t border-slate-800'>
                                                <div>
                                                    <p className='text-[9px] font-black text-slate-500 uppercase'>Payment Mode</p>
                                                    <p className='text-xs font-bold text-slate-300 mt-0.5'>
                                                        {order.payment_status === 'CASH ON DELIVERY' ? '💵 Cash on Delivery' : '✅ Online Paid'}
                                                    </p>
                                                </div>
                                                <div className='text-right'>
                                                    <p className='text-[9px] font-black text-slate-500 uppercase'>Collect Amount</p>
                                                    <p className='text-xl font-black text-white'>{fmtINR(order.totalAmt)}</p>
                                                </div>
                                            </div>

                                            {/* Primary Action Buttons */}
                                            {(order.delivery_status === 'Confirmed') && (
                                                <button onClick={() => handlePickup(order)}
                                                    className='w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-2 active:scale-95'>
                                                    <FaCheckCircle/> {isUnassigned ? '⚡ CLAIM & PICKUP' : `PICKUP FROM ${store?.name?.toUpperCase() || 'STORE'}`}
                                                </button>
                                            )}
                                            {isSellerDelayed && (
                                                <button onClick={() => handlePickup(order)}
                                                    className='w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm text-white bg-orange-500 hover:bg-orange-400 shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 active:scale-95'>
                                                    <FaCheckCircle/> PICKUP ANYWAY (Seller Delayed)
                                                </button>
                                            )}
                                            {canCancel && (
                                                <button
                                                    onClick={() => handleCancel(order)}
                                                    disabled={isCancelling}
                                                    className='w-full py-2.5 rounded-xl font-black text-[11px] text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 active:scale-95'>
                                                    {isCancelling ? '⏳ CANCELLING…' : '✕ CANCEL ORDER'}
                                                </button>
                                            )}
                                            {order.delivery_status === 'Out for Delivery' && (
                                                <button onClick={() => setPaymentOrder(order)}
                                                    className='w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 active:scale-95'>
                                                    <MdPayment size={18}/> COLLECT PAYMENT & DELIVER
                                                </button>
                                            )}
                                            {order.delivery_status === 'Delivered' && (
                                                <div className='w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-xs text-center'>
                                                    ✅ Delivered Successfully
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}

                {/* ══════════════ EARNINGS TAB ══════════════ */}
                {activeTab === 'earnings' && (
                    <div className='flex flex-col gap-4'>
                        <div className='flex gap-2 flex-wrap'>
                            {[
                                { key: 'today', label: 'Today' },
                                { key: 'week',  label: 'This Week' },
                                { key: 'month', label: 'This Month' },
                                { key: 'all',   label: 'All Time' },
                            ].map(f => (
                                <button key={f.key} onClick={() => setEarningFilter(f.key)}
                                    className={`px-4 py-2 rounded-full text-xs font-black transition-all border ${
                                        earningFilter === f.key
                                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                                            : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500'
                                    }`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        <div className='grid grid-cols-2 gap-3'>
                            <div className='col-span-2 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 shadow-xl shadow-emerald-900/40'>
                                <p className='text-[9px] font-black text-emerald-200/80 uppercase tracking-widest mb-1'>Total Earned</p>
                                <p className='text-4xl font-black text-white'>{fmtINR(totalEarned)}</p>
                                <div className='mt-3 pt-3 border-t border-emerald-500/40 flex gap-4 flex-wrap'>
                                    <div>
                                        <p className='text-[9px] text-emerald-200/60 uppercase font-bold'>Deliveries</p>
                                        <p className='text-lg font-black text-white'>{totalDelivered}</p>
                                    </div>
                                    <div>
                                        <p className='text-[9px] text-emerald-200/60 uppercase font-bold'>Avg per Drop</p>
                                        <p className='text-lg font-black text-white'>{fmtINR(avgFee)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                <p className='text-[9px] font-black text-slate-500 uppercase'>Deliveries Done</p>
                                <p className='text-3xl font-black text-white mt-1'>{totalDelivered}</p>
                            </div>
                            <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                                <p className='text-[9px] font-black text-slate-500 uppercase'>Avg Fee</p>
                                <p className='text-3xl font-black text-blue-400 mt-1'>{fmtINR(avgFee)}</p>
                            </div>
                        </div>

                        <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                            <h3 className='font-black text-white text-xs uppercase tracking-widest mb-3'>📅 Daily Breakdown</h3>
                            {Object.keys(earningsByDate).length === 0 ? (
                                <p className='text-slate-500 text-sm text-center py-6'>No deliveries in this period.</p>
                            ) : (
                                <div className='flex flex-col divide-y divide-slate-800'>
                                    {Object.entries(earningsByDate)
                                        .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                                        .map(([date, data]) => (
                                            <div key={date} className='flex justify-between items-center py-3'>
                                                <div>
                                                    <p className='font-bold text-white text-sm'>{date}</p>
                                                    <p className='text-[10px] text-slate-500'>{data.count} delivery{data.count > 1 ? 's' : ''}</p>
                                                </div>
                                                <p className='font-black text-emerald-400 text-lg'>{fmtINR(data.total)}</p>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>

                        <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4'>
                            <h3 className='font-black text-white text-xs uppercase tracking-widest mb-3'>🛵 Recent Deliveries</h3>
                            {filteredEarnings.length === 0 ? (
                                <p className='text-slate-500 text-sm text-center py-6'>No deliveries yet.</p>
                            ) : (
                                <div className='flex flex-col divide-y divide-slate-800'>
                                    {filteredEarnings.slice(0, 10).map(order => (
                                        <div key={order._id} className='flex justify-between items-center py-3'>
                                            <div>
                                                <p className='font-bold text-slate-300 text-xs font-mono'>{order.orderId}</p>
                                                <p className='text-[10px] text-slate-500 mt-0.5'>
                                                    {storeEmoji(order.store_details?.name)} {order.store_details?.name || 'Store'}
                                                </p>
                                            </div>
                                            <div className='text-right'>
                                                <p className='font-black text-emerald-400'>{fmtINR(getDeliveryFee(order))}</p>
                                                <p className='text-[10px] text-slate-500'>
                                                    {fmtOrderTime(order.deliveredAt || order.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {paymentOrder && (
                <CollectPayment
                    order={paymentOrder}
                    onClose={() => setPaymentOrder(null)}
                    onSuccess={() => { setPaymentOrder(null); setIsTracking(false); fetchRiderOrders(true); fetchCashSummary(); }}
                />
            )}

            <RiderCashRemittanceModal
                isOpen={showRemittanceModal}
                onClose={() => setShowRemittanceModal(false)}
                onDepositSuccess={() => {
                    fetchCashSummary();
                    fetchRiderOrders(true);
                }}
            />
        </div>
    );
};

export default RiderDashboard;