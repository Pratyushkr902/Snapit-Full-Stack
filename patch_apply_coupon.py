import re

path = "server/controllers/order.controller.js"
with open(path, "r") as f:
    content = f.read()

old = """        if (code === 'FIRSTUSER' || code === 'FIRSTFREE') {
            const previousOrder = await OrderModel.findOne({ userId })
            if (previousOrder) {
                return response.status(400).json({ message: 'This code is for first-time customers only.', error: true, success: false })
            }
        }
        const discount = Math.floor(Math.random() * 8) + 1
        return response.json({
            message:  `Lucky coupon! You got ₹${discount} surprise discount.`,
            error:    false,
            success:  true,
            data:     { couponCode: code, discount_label: 'Surprise Discount', discount, newTotal: Number(totalAmt) - discount },
        })"""

new = """        if (code === 'FIRSTUSER' || code === 'FIRSTFREE') {
            const previousOrder = await OrderModel.findOne({ userId })
            if (previousOrder) {
                return response.status(400).json({ message: 'This code is for first-time customers only.', error: true, success: false })
            }
        }

        // One use per calendar month per code, per user
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        const alreadyUsedThisMonth = (user.usedPromoCodes || []).some((entry) => {
            if (!entry || entry.code !== code || !entry.usedAt) return false
            const usedAt = new Date(entry.usedAt)
            return usedAt.getMonth() === currentMonth && usedAt.getFullYear() === currentYear
        })
        if (alreadyUsedThisMonth) {
            return response.status(400).json({ message: `You've already used ${code} this month. Try again next month.`, error: true, success: false })
        }

        const discount = Math.floor(Math.random() * 5) + 1

        await UserModel.findByIdAndUpdate(userId, {
            $push: { usedPromoCodes: { code, usedAt: now } }
        })

        return response.json({
            message:  `Lucky coupon! You got ₹${discount} surprise discount.`,
            error:    false,
            success:  true,
            data:     { couponCode: code, discount_label: 'Surprise Discount', discount, newTotal: Number(totalAmt) - discount },
        })"""

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w") as f:
    f.write(content)

print("patched", path)
