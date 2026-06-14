import{C as e}from"./chunk-vendor-Dud1btXW.js";import{u as g}from"./chunk-redux-Dma7DRjD.js";import{N as b}from"./NoData-D1yOLx7L.js";import{u as f}from"./chunk-router-BYWSRRcv.js";import"./chunk-immer-DjZ3-QBq.js";import"./index-BqJgH0R1.js";import"./chunk-react-dom-xS4Kvmaq.js";import"./chunk-axios-B8_nURbH.js";import"./chunk-firebase-D9zex91O.js";import"./chunk-socket-C-7jB70P.js";import"./chunk-icons-BbVYuKXC.js";import"./chunk-swiper-CQYswzoC.js";const u=({order:t})=>{const i=()=>{var o,d,r,p,c;const a=`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Snapit Invoice - ${t.orderId}</title>
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
      <div class="invoice-id">#${t.orderId}</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px;">${new Date(t.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-block">
      <div class="meta-label">Billed To</div>
      <div class="meta-value">${((o=t.delivery_address)==null?void 0:o.name)||"Customer"}</div>
      <div style="font-size:13px;color:#64748b;margin-top:4px;">${((d=t.delivery_address)==null?void 0:d.address_line)||""}</div>
      <div style="font-size:13px;color:#64748b;">${((r=t.delivery_address)==null?void 0:r.city)||""} ${((p=t.delivery_address)==null?void 0:p.pincode)||""}</div>
    </div>
    <div class="meta-block">
      <div class="meta-label">Order Status</div>
      <div style="margin-top:4px;"><span class="status-badge">${t.delivery_status}</span></div>
      <div class="meta-label" style="margin-top:12px;">Payment Method</div>
      <div style="margin-top:4px;"><span class="payment-badge">${t.payment_status||"COD"}</span></div>
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
      ${t.cartItems&&t.cartItems.length>0?t.cartItems.map(s=>{var x;return`
          <tr>
            <td>${s.name||((x=t.product_details)==null?void 0:x.name)}</td>
            <td>${s.quantity||1}</td>
            <td>₹${s.price||0}</td>
            <td style="text-align:right;font-weight:700;">₹${(s.price||0)*(s.quantity||1)}</td>
          </tr>
        `}).join(""):`<tr>
            <td>${((c=t.product_details)==null?void 0:c.name)||"Product"}</td>
            <td>${t.quantity||1}</td>
            <td>₹${t.subTotalAmt||t.totalAmt}</td>
            <td style="text-align:right;font-weight:700;">₹${t.subTotalAmt||t.totalAmt}</td>
          </tr>`}
      <tr class="total-row">
        <td colspan="3"><strong>Total Amount</strong></td>
        <td style="text-align:right;"><strong>₹${t.totalAmt}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>Thank you for shopping with <strong>Snapit</strong> 🛒</p>
    <p style="margin-top:6px;">Questions? WhatsApp us at <strong>+91 94720 26580</strong></p>
    <p style="margin-top:4px;">Follow us: <strong>@snapitexpress</strong> on Instagram</p>
  </div>
</body>
</html>`,l=new Blob([a],{type:"text/html"}),m=URL.createObjectURL(l),n=window.open(m,"_blank");n&&setTimeout(()=>{n.print()},800)};return t.delivery_status!=="Delivered"?null:e.jsx("button",{onClick:i,className:"flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm transition-all active:scale-95",children:"📄 Download Invoice"})},T=()=>{const t=g(a=>a.orders.order),i=f();return e.jsxs("div",{className:"bg-neutral-50 min-h-screen pb-10",children:[e.jsxs("div",{className:"bg-white shadow-md p-4 font-bold text-xl sticky top-0 z-10 flex items-center justify-between",children:[e.jsx("h1",{children:"My Orders"}),e.jsxs("span",{className:"text-sm font-medium text-neutral-400",children:[(t==null?void 0:t.length)||0," Orders Total"]})]}),e.jsx("div",{className:"flex flex-col gap-4 p-4 max-w-2xl mx-auto",children:!t||t.length===0?e.jsxs("div",{className:"mt-20",children:[e.jsx(b,{}),e.jsx("p",{className:"text-center text-neutral-400 mt-4",children:"You haven't placed any orders yet."})]}):t.map((a,l)=>e.jsxs("div",{className:"bg-white rounded-xl p-5 shadow-sm border border-neutral-200 flex flex-col gap-4 hover:shadow-md transition-shadow",children:[e.jsxs("div",{className:"flex justify-between items-center border-b pb-3",children:[e.jsxs("div",{className:"flex flex-col",children:[e.jsx("p",{className:"text-[10px] uppercase tracking-widest text-neutral-400 font-bold",children:"Order ID"}),e.jsx("p",{className:"text-neutral-700 font-mono font-semibold",children:a==null?void 0:a.orderId})]}),e.jsx("span",{className:`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${a.delivery_status==="Delivered"?"bg-emerald-100 text-emerald-700":a.delivery_status==="Out for Delivery"?"bg-orange-100 text-orange-700 animate-pulse":"bg-blue-100 text-blue-700"}`,children:a.delivery_status||"Processing"})]}),e.jsxs("div",{className:"flex gap-4 items-start",children:[e.jsx("img",{src:a.product_details.image[0],className:"w-20 h-20 object-scale-down bg-neutral-50 rounded-lg border border-neutral-100",alt:a.product_details.name}),e.jsxs("div",{className:"flex-1 py-1",children:[e.jsx("h3",{className:"font-bold text-slate-800 text-lg line-clamp-1",children:a.product_details.name}),e.jsxs("div",{className:"flex items-center gap-3 mt-1",children:[e.jsxs("p",{className:"text-neutral-500 text-sm font-medium",children:["Qty: ",a.quantity||1]}),e.jsx("span",{className:"w-1 h-1 bg-neutral-300 rounded-full"}),e.jsxs("p",{className:"text-slate-900 font-bold",children:["₹",a.totalAmt]})]}),e.jsxs("p",{className:"text-[10px] text-neutral-400 mt-2 italic",children:["Ordered on: ",new Date(a.createdAt).toLocaleDateString()]})]})]}),e.jsxs("div",{className:"flex flex-wrap gap-3 mt-2 pt-3 border-t",children:[e.jsx("button",{onClick:()=>i(`/dashboard/order-tracking/${a.orderId}`),className:"flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-slate-200 flex items-center justify-center gap-2",children:"📍 Track Live"}),e.jsx(u,{order:a})]})]},a._id+l+"order"))})]})};export{T as default};
