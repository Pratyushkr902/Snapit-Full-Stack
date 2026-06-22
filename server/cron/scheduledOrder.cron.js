import cron from 'node-cron'
import ScheduledOrderModel from '../models/scheduledOrder.model.js'
import { CashOnDeliveryOrderController, WalletPaymentOrderController } from '../controllers/order.controller.js'

export function startScheduledOrdersCron() {
    cron.schedule('0 6 * * *', async () => {
        const due = await ScheduledOrderModel.find({ isActive: true, nextRunAt: { $lte: new Date() } })

        for (const sched of due) {
            const fakeReq = {
                userId: sched.userId.toString(),
                body: {
                    list_items: sched.cartItems,
                    addressId: sched.addressId,
                    subTotalAmt: sched.cartItems.reduce((s, i) => s + i.sellerPrice * i.quantity, 0),
                    totalAmt: sched.cartItems.reduce((s, i) => s + i.sellerPrice * i.quantity, 0),
                }
            }
            const fakeRes = { json: () => {}, status: () => ({ json: () => {} }) }

            try {
                if (sched.paymentMode === 'WALLET') {
                    await WalletPaymentOrderController(fakeReq, fakeRes)
                } else {
                    await CashOnDeliveryOrderController(fakeReq, fakeRes)
                }

                const next = new Date(sched.nextRunAt)
                next.setDate(next.getDate() + (sched.frequency === 'DAILY' ? 1 : 7))
                await ScheduledOrderModel.findByIdAndUpdate(sched._id, { nextRunAt: next })
            } catch (e) {
                console.error('[ScheduledOrderCron] failed for', sched._id, e.message)
            }
        }
    })
}