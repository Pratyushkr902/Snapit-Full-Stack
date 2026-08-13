import re

# ── 1. order.model.js — add OTP + proof fields ──────────────────────────────
path = "server/models/order.model.js"
content = open(path).read()

anchor = """        payment_collected: { type: Boolean, default: false },
        payment_mode:      { type: String,  default: null },
        cashReceived:      { type: Number,  default: 0 },"""

new = anchor + """

        // ── Delivery OTP verification ──────────────────────────────
        deliveryOtp:        { type: String, default: null },
        otpAttempts:        { type: Number, default: 0 },
        otpLockedUntil:     { type: Date,   default: null },
        deliveryProofPhoto: { type: String, default: null },
        otpVerifiedAt:      { type: Date,   default: null },"""

if "deliveryOtp:" in content:
    print("ℹ️ order.model.js already patched, skipping.")
elif anchor not in content:
    print("❌ order.model.js anchor not found. Aborting.")
    exit(1)
else:
    assert content.count(anchor) == 1
    content = content.replace(anchor, new, 1)
    open(path, "w").write(content)
    print("✅ order.model.js patched with OTP fields.")

# ── 2. order.controller.js — block rider bypass + generate OTP ─────────────
path = "server/controllers/order.controller.js"
content = open(path).read()

anchor2 = """        if (request.userRole === 'RIDER') {
            if (!order.riderId || order.riderId.toString() !== userId) {
                console.warn(`RIDER_IDOR | user=${userId} | orderId=${orderId} | ip=${request.ip}`)
                return response.status(403).json({ message: 'This order is not assigned to you.', error: true, success: false })
            }
        }
        if (status === 'Delivered' && !order.payment_collected && order.payment_status !== 'PAID' && !payment_status) {
            return response.status(400).json({ message: 'Collect payment before marking as Delivered.', success: false, error: true })
        }
        const updatedOrder = await OrderModel.findOneAndUpdate(
            { orderId },
            {
                delivery_status: status,"""

new2 = """        if (request.userRole === 'RIDER') {
            if (!order.riderId || order.riderId.toString() !== userId) {
                console.warn(`RIDER_IDOR | user=${userId} | orderId=${orderId} | ip=${request.ip}`)
                return response.status(403).json({ message: 'This order is not assigned to you.', error: true, success: false })
            }
            if (status === 'Delivered') {
                return response.status(400).json({ message: 'Use OTP verification to mark this order Delivered.', error: true, success: false })
            }
        }
        if (status === 'Delivered' && !order.payment_collected && order.payment_status !== 'PAID' && !payment_status) {
            return response.status(400).json({ message: 'Collect payment before marking as Delivered.', success: false, error: true })
        }
        let otpFieldsUpdate = {}
        if (status === 'Out for Delivery' && !order.deliveryOtp) {
            otpFieldsUpdate = {
                deliveryOtp: String(Math.floor(1000 + Math.random() * 9000)),
                otpAttempts: 0,
                otpLockedUntil: null,
            }
        }
        const updatedOrder = await OrderModel.findOneAndUpdate(
            { orderId },
            {
                delivery_status: status,
                ...otpFieldsUpdate,"""

if "otpFieldsUpdate" in content:
    print("ℹ️ updateOrderStatusController already patched, skipping.")
elif anchor2 not in content:
    print("❌ updateOrderStatusController anchor not found. Aborting.")
    exit(1)
else:
    assert content.count(anchor2) == 1
    content = content.replace(anchor2, new2, 1)
    print("✅ updateOrderStatusController patched (OTP gen + rider bypass blocked).")

# ── 3. insert verifyDeliveryOtpController before collectPaymentController ──
anchor3 = "export const collectPaymentController = async (request, response) => {"

new_controller = '''export const verifyDeliveryOtpController = async (request, response) => {
    try {
        const { orderId, otp, deliveryProofPhoto } = request.body
        const userId = request.userId

        if (!orderId || !otp || !deliveryProofPhoto) {
            return response.status(400).json({ message: 'orderId, otp and deliveryProofPhoto are required.', error: true, success: false })
        }

        const order = await OrderModel.findOne({ orderId })
        if (!order) return response.status(404).json({ message: 'Order not found.', error: true, success: false })

        if (!order.riderId || order.riderId.toString() !== userId) {
            console.warn(`VERIFY_OTP_IDOR | user=${userId} | orderId=${orderId} | ip=${request.ip}`)
            return response.status(403).json({ message: 'This order is not assigned to you.', error: true, success: false })
        }

        if (order.delivery_status === 'Delivered') {
            return response.status(400).json({ message: 'Order is already marked Delivered.', error: true, success: false })
        }

        const MAX_OTP_ATTEMPTS = 5
        const LOCK_DURATION_MS = 15 * 60 * 1000

        if (order.otpLockedUntil && order.otpLockedUntil > new Date()) {
            const minutesLeft = Math.ceil((order.otpLockedUntil - new Date()) / 60000)
            return response.status(423).json({
                message: `Too many wrong attempts. Try again in ${minutesLeft} minute(s).`,
                error: true,
                success: false,
            })
        }

        if (!order.deliveryOtp) {
            return response.status(400).json({ message: 'No OTP has been generated for this order yet.', error: true, success: false })
        }

        if (String(otp).trim() !== order.deliveryOtp) {
            const attempts = (order.otpAttempts || 0) + 1
            const update = { otpAttempts: attempts }
            let message = `Incorrect OTP. ${MAX_OTP_ATTEMPTS - attempts} attempt(s) left.`

            if (attempts >= MAX_OTP_ATTEMPTS) {
                update.otpLockedUntil = new Date(Date.now() + LOCK_DURATION_MS)
                update.otpAttempts = 0
                message = 'Too many wrong attempts. OTP locked for 15 minutes.'
            }

            await OrderModel.findOneAndUpdate({ orderId }, update)
            return response.status(400).json({ message, error: true, success: false })
        }

        if (!order.payment_collected && order.payment_status !== 'PAID') {
            return response.status(400).json({ message: 'Collect payment before marking as Delivered.', error: true, success: false })
        }

        const updatedOrder = await OrderModel.findOneAndUpdate(
            { orderId },
            {
                delivery_status: 'Delivered',
                deliveredAt: new Date(),
                deliveryProofPhoto,
                otpVerifiedAt: new Date(),
                otpAttempts: 0,
                otpLockedUntil: null,
            },
            { new: true }
        )

        try {
            const customer = await UserModel.findById(updatedOrder.userId).select('fcmToken')
            const token = customer?.fcmToken
            if (token) {
                notifyUserOrderDelivered(updatedOrder.userId, orderId, token).catch(() => {})
            }
        } catch (e) {
            console.error('Delivery OTP notify failed (non-fatal):', e.message)
        }

        return response.json({ message: 'OTP verified. Order marked Delivered.', success: true, error: false, data: updatedOrder })
    } catch (error) {
        console.error('verifyDeliveryOtpController:', error.message)
        return response.status(500).json({ message: 'OTP verification failed.', error: true, success: false })
    }
}

export const collectPaymentController = async (request, response) => {'''

if "verifyDeliveryOtpController" in content:
    print("ℹ️ verifyDeliveryOtpController already present, skipping insert.")
elif anchor3 not in content:
    print("❌ collectPaymentController anchor not found. Aborting.")
    exit(1)
else:
    assert content.count(anchor3) == 1
    content = content.replace(anchor3, new_controller, 1)
    print("✅ verifyDeliveryOtpController inserted.")

open(path, "w").write(content)

# ── 4. order.route.js — import + register route ─────────────────────────────
path = "server/route/order.route.js"
content = open(path).read()

anchor4 = "    updateOrderStatusController,\n    getRiderLocationController,"
new4 = "    updateOrderStatusController,\n    verifyDeliveryOtpController,\n    getRiderLocationController,"

anchor5 = 'orderRouter.put( "/update-status",         auth, rider,  updateOrderStatusController)'
new5 = anchor5 + '\norderRouter.post("/verify-delivery-otp",   auth, rider,  verifyDeliveryOtpController)'

if "verifyDeliveryOtpController" in content:
    print("ℹ️ order.route.js already patched, skipping.")
else:
    assert anchor4 in content and content.count(anchor4) == 1
    assert anchor5 in content and content.count(anchor5) == 1
    content = content.replace(anchor4, new4, 1)
    content = content.replace(anchor5, new5, 1)
    open(path, "w").write(content)
    print("✅ order.route.js patched with verify-delivery-otp route.")

# ── 5. SummaryApi.js — client mapping ────────────────────────────────────────
path = "client/src/common/SummaryApi.js"
content = open(path).read()

anchor6 = """    updateOrderStatus: {
        url: '/api/order/update-status',
        method: 'put'
    },"""
new6 = anchor6 + """
    verifyDeliveryOtp: {
        url: '/api/order/verify-delivery-otp',
        method: 'post'
    },"""

if "verifyDeliveryOtp" in content:
    print("ℹ️ SummaryApi.js already patched, skipping.")
elif anchor6 not in content:
    print("❌ SummaryApi.js anchor not found. Aborting.")
    exit(1)
else:
    assert content.count(anchor6) == 1
    content = content.replace(anchor6, new6, 1)
    open(path, "w").write(content)
    print("✅ SummaryApi.js patched with verifyDeliveryOtp mapping.")

print("🎉 All done.")
