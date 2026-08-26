path = "server/controllers/foodOrder.controller.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Import assignAvailableRider from order.controller.js
old_import = """import {
    notifyUserOrderPlaced,
    notifySellersOfNewOrder,
} from '../utils/notificationService.js'"""

new_import = """import {
    notifyUserOrderPlaced,
    notifySellersOfNewOrder,
} from '../utils/notificationService.js'
// FIX: food orders never assigned a real rider — every order silently fell back
// to the OrderModel schema's hardcoded rider_name/rider_contact defaults
// (a specific person's real name + personal phone number). Reuse the same
// load-balanced rider assignment grocery orders already use.
import { assignAvailableRider } from './order.controller.js'"""

assert content.count(old_import) == 1, f"import block: expected 1 match, found {content.count(old_import)}"
content = content.replace(old_import, new_import)

# 2. foodOrderCOD
old_cod = """    req.body.walletAmountUsed = 0
    const { fields, user, priced, groupOrderId } = await prepareMultiRestaurantOrder(req)

    const orders = []
    for (const group of priced) {
      const order = new OrderModel(buildOrderFields(req.userId, groupOrderId, group, fields, {
        payment_status:  'CASH ON DELIVERY',
        payment_mode:    'COD',
        delivery_status: 'Pending',
      }))"""

new_cod = """    req.body.walletAmountUsed = 0
    const { fields, user, priced, groupOrderId } = await prepareMultiRestaurantOrder(req)
    const assignedRider = await assignAvailableRider()

    const orders = []
    for (const group of priced) {
      const order = new OrderModel(buildOrderFields(req.userId, groupOrderId, group, fields, {
        payment_status:  'CASH ON DELIVERY',
        payment_mode:    'COD',
        delivery_status: 'Pending',
        riderId:         assignedRider?._id    || null,
        rider_name:      assignedRider?.name   || 'Unassigned',
        rider_contact:   assignedRider?.mobile || '',
      }))"""

assert content.count(old_cod) == 1, f"foodOrderCOD block: expected 1 match, found {content.count(old_cod)}"
content = content.replace(old_cod, new_cod)

# 3. foodOrderWallet
old_wallet = """    await deductWallet(req.userId, deductAmt, priced[0]?.restaurantName)

    const orders = []
    for (const group of priced) {
      const order = new OrderModel(buildOrderFields(req.userId, groupOrderId, group, fields, {
        paymentId:       'WALLET-' + Date.now(),
        payment_status:  'PAID',
        payment_mode:    'WALLET',
        delivery_status: 'Confirmed',
      }))"""

new_wallet = """    await deductWallet(req.userId, deductAmt, priced[0]?.restaurantName)
    const assignedRider = await assignAvailableRider()

    const orders = []
    for (const group of priced) {
      const order = new OrderModel(buildOrderFields(req.userId, groupOrderId, group, fields, {
        paymentId:       'WALLET-' + Date.now(),
        payment_status:  'PAID',
        payment_mode:    'WALLET',
        delivery_status: 'Confirmed',
        riderId:         assignedRider?._id    || null,
        rider_name:      assignedRider?.name   || 'Unassigned',
        rider_contact:   assignedRider?.mobile || '',
      }))"""

assert content.count(old_wallet) == 1, f"foodOrderWallet block: expected 1 match, found {content.count(old_wallet)}"
content = content.replace(old_wallet, new_wallet)

# 4. foodOrderVerifyPayment (online/Razorpay) — matches real file's blank line after deductWallet
old_online = """    await deductWallet(req.userId, fields.walletAmountUsed, priced[0]?.restaurantName)

    const orders = []
    for (const group of priced) {
      const order = new OrderModel(buildOrderFields(req.userId, groupOrderId, group, fields, {
        paymentId:       razorpay_payment_id,
        payment_status:  'PAID',
        payment_mode:    'ONLINE',
        delivery_status: 'Confirmed',
      }))"""

new_online = """    await deductWallet(req.userId, fields.walletAmountUsed, priced[0]?.restaurantName)
    const assignedRider = await assignAvailableRider()

    const orders = []
    for (const group of priced) {
      const order = new OrderModel(buildOrderFields(req.userId, groupOrderId, group, fields, {
        paymentId:       razorpay_payment_id,
        payment_status:  'PAID',
        payment_mode:    'ONLINE',
        delivery_status: 'Confirmed',
        riderId:         assignedRider?._id    || null,
        rider_name:      assignedRider?.name   || 'Unassigned',
        rider_contact:   assignedRider?.mobile || '',
      }))"""

assert content.count(old_online) == 1, f"foodOrderVerifyPayment block: expected 1 match, found {content.count(old_online)}"
content = content.replace(old_online, new_online)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("patched", path)
