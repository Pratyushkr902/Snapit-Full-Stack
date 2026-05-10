import React from 'react'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { pricewithDiscount } from '../utils/PriceWithDiscount'

const OrderInvoice = ({ order }) => {

    const handleDownload = () => {
        const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Snapit Invoice - ${order.orderId}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #1e293b; background: #fff; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #16a34a; padding-bottom: 20px; }
  .brand { font-size: 32px; font-weight: 900; color: #16a34a; letter-spacing: -1px; }
  .brand span { color: #1e293b; }
  .invoice-title { font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; }
  .invoice-id { font-size: 18px; font-weight: 800; color: #1e293b; margin-top: 4px; font-family: monospace; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
  .meta-block { background: #f8fafc; border-radius: 10px; padding: 16px; }
  .meta-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .meta-value { font-size: 14px; font-weight: 600; color: #1e293b; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #1e293b; color: white; padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  tr:last-child td { border-bottom: none; }
  .total-row { background: #f0fdf4; font-weight: 800; font-size: 16px; color: #16a34a; }
  .total-row td { border-top: 2px solid #16a34a; padding: 16px; }
  .status-badge { display: inline-block; background: #dcfce7; color: #16a34a; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
  .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; }
  .footer strong { color: #16a34a; }
  .payment-badge { display: inline-block; background: #fef9c3; color: #854d0e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">snap<span>it</span></div>
      <div style="font-size:12px;color:#64748b;margin-top:4px;">Paliganj, Bihar • snapit.in</div>
    </div>
    <div style="text-align:right;">
      <div class="invoice-title">Tax Invoice</div>
      <div class="invoice-id">#${order.orderId}</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px;">${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-block">
      <div class="meta-label">Billed To</div>
      <div class="meta-value">${order.delivery_address?.name || 'Customer'}</div>
      <div style="font-size:13px;color:#64748b;margin-top:4px;">${order.delivery_address?.address_line || ''}</div>
      <div style="font-size:13px;color:#64748b;">${order.delivery_address?.city || ''} ${order.delivery_address?.pincode || ''}</div>
    </div>
    <div class="meta-block">
      <div class="meta-label">Order Status</div>
      <div style="margin-top:4px;"><span class="status-badge">${order.delivery_status}</span></div>
      <div class="meta-label" style="margin-top:12px;">Payment Method</div>
      <div style="margin-top:4px;"><span class="payment-badge">${order.payment_status || 'COD'}</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${(order.cartItems && order.cartItems.length > 0
        ? order.cartItems.map(item => `
          <tr>
            <td>${item.name || order.product_details?.name}</td>
            <td>${item.quantity || 1}</td>
            <td>₹${item.price || 0}</td>
            <td style="text-align:right;font-weight:700;">₹${(item.price || 0) * (item.quantity || 1)}</td>
          </tr>
        `).join('')
        : `<tr>
            <td>${order.product_details?.name || 'Product'}</td>
            <td>${order.quantity || 1}</td>
            <td>₹${order.subTotalAmt || order.totalAmt}</td>
            <td style="text-align:right;font-weight:700;">₹${order.subTotalAmt || order.totalAmt}</td>
          </tr>`
      )}
      <tr class="total-row">
        <td colspan="3"><strong>Total Amount</strong></td>
        <td style="text-align:right;"><strong>₹${order.totalAmt}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>Thank you for shopping with <strong>Snapit</strong> 🛒</p>
    <p style="margin-top:6px;">Questions? WhatsApp us at <strong>+91 94720 26580</strong></p>
    <p style="margin-top:4px;">Follow us: <strong>@snapit.official_</strong> on Instagram</p>
  </div>
</body>
</html>`

        const blob = new Blob([invoiceHTML], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const win = window.open(url, '_blank')
        if (win) {
            setTimeout(() => {
                win.print()
            }, 800)
        }
    }

    if (order.delivery_status !== 'Delivered') return null

    return (
        <button
            onClick={handleDownload}
            className='flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm transition-all active:scale-95'
        >
            📄 Download Invoice
        </button>
    )
}

export default OrderInvoice