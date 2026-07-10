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
    print("❌ anchor still not found. Aborting.")
    exit(1)
else:
    assert content.count(anchor2) == 1
    content = content.replace(anchor2, new2, 1)
    open(path, "w").write(content)
    print("✅ updateOrderStatusController patched (OTP gen + rider bypass blocked).")
