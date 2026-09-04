import sendEmail from '../controllers/sendEmail.js'
import sendEmailResend from '../controllers/sendEmailResend.js'
import UserModel from '../models/user.model.js'

export async function sendOrderDeliveredEmail(order, userObj = null) {
  try {
    let user = userObj
    if (!user && order?.userId) {
      user = await UserModel.findById(order.userId).select('name email').lean()
    }

    if (!user?.email) return null

    const userName = user.name || 'Valued Customer'
    const orderId = order.orderId || 'ORDER'
    const totalAmt = order.totalAmt || 0
    const paymentStatus = order.payment_status || 'PAID'
    const riderName = order.rider_name || 'Snapit Express Rider'

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Order Delivered Successfully! 🎉</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px 12px; margin: 0; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #f1f5f9;">
    
    <!-- Top Header Banner -->
    <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 36px 24px; text-align: center; color: #ffffff;">
      <div style="font-size: 48px; line-height: 1; margin-bottom: 12px;">🎉</div>
      <h1 style="font-size: 24px; font-weight: 900; margin: 0 0 6px; letter-spacing: -0.5px;">Order Delivered Successfully!</h1>
      <p style="font-size: 14px; margin: 0; color: #bbf7d0; font-weight: 600;">Your package has arrived</p>
    </div>

    <!-- Body Content -->
    <div style="padding: 32px 24px;">
      <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 12px;">
        Hi ${userName}! 👋
      </p>
      
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 18px;">
        Your <strong>Snapit</strong> order <span style="font-family: monospace; background: #f0fdf4; color: #16a34a; padding: 2px 8px; border-radius: 6px; font-weight: 800;">#${orderId}</span> has been delivered successfully. 🛍️
      </p>

      <!-- Order Details Summary Box -->
      <div style="background: #f8fafc; border-radius: 14px; padding: 16px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Total Amount:</td>
            <td style="padding: 6px 0; text-align: right; color: #0f172a; font-weight: 800;">₹${totalAmt}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Payment Mode:</td>
            <td style="padding: 6px 0; text-align: right; color: #16a34a; font-weight: 700;">${paymentStatus}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Delivered By:</td>
            <td style="padding: 6px 0; text-align: right; color: #0f172a; font-weight: 600;">${riderName}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
        Thank you for choosing <strong>Snapit</strong>! We hope you enjoy your purchase.
      </p>

      <!-- Rating Box -->
      <div style="background: #fffbeb; border: 1.5px dashed #f59e0b; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <div style="font-size: 26px; margin-bottom: 6px;">⭐⭐⭐⭐⭐</div>
        <p style="font-size: 14px; font-weight: 700; color: #92400e; margin: 0 0 6px;">
          How was your experience?
        </p>
        <p style="font-size: 12px; color: #b45309; margin: 0 0 14px; line-height: 1.5;">
          If you loved our service, we'd really appreciate a 5-star rating and your feedback. It helps us serve you even better.
        </p>
        <a href="https://snapit.pages.dev/dashboard/myorders" style="display: inline-block; background: #f59e0b; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 10px; font-size: 13px; font-weight: 800;">
          Rate Your Order
        </a>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 6px;">
        We look forward to delivering to you again soon! 💚
      </p>
      <p style="font-size: 14px; font-weight: 800; color: #16a34a; margin: 0;">
        – Team Snapit
      </p>

    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
      Snapit • Paliganj, Bihar • <a href="https://snapit.pages.dev" style="color: #16a34a; text-decoration: none; font-weight: 700;">snapit.pages.dev</a><br>
      Need help? WhatsApp us at <strong style="color: #1e293b;">+91 94720 26580</strong>
    </div>

  </div>
</body>
</html>`

    const subject = `🎉 Order Delivered Successfully! #${orderId} - Snapit`
    // Send delivered order emails directly from Brevo (snapitxpress@gmail.com)
    let res = await sendEmail({
      sendTo: user.email,
      subject,
      html
    })
    if (!res) {
      // Fallback to Resend if Brevo fails
      res = await sendEmailResend({
        sendTo: user.email,
        subject,
        html
      })
    }
    return res
  } catch (err) {
    console.error('[sendOrderDeliveredEmail error]', err.message)
    return null
  }
}
