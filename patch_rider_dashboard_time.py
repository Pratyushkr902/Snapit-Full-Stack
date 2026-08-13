"""
Adds order timestamp display to RiderDashboard.jsx:
  1. Adds fmtOrderTime() helper (e.g. "5 Jul at 12:58 PM")
  2. Shows time under the order ID badge on every order card
  3. Shows full timestamp (not just date) in the "Recent Deliveries" list

Run from repo root:
    python3 patch_rider_dashboard_time.py
"""

path = "client/src/pages/RiderDashboard.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# --- Patch 1: add fmtOrderTime helper ---
old1 = """const fmt = (n) => Number(n).toFixed(2);
const fmtINR = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;"""

new1 = """const fmt = (n) => Number(n).toFixed(2);
const fmtINR = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// e.g. "5 Jul at 12:58 PM" — same format used in the admin History view
const fmtOrderTime = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (isNaN(d)) return null;
    const datePart = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const timePart = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${datePart} at ${timePart}`;
};"""

assert content.count(old1) == 1, "Patch 1 anchor not found or not unique"
content = content.replace(old1, new1)

# --- Patch 2: show time on every order card ---
old2 = """                                                    <span className='text-[9px] font-black bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full uppercase tracking-wider'>
                                                        {order.orderId}
                                                    </span>
                                                    <h2 className='text-sm font-bold text-white mt-2.5 leading-tight'>"""

new2 = """                                                    <span className='text-[9px] font-black bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full uppercase tracking-wider'>
                                                        {order.orderId}
                                                    </span>
                                                    {fmtOrderTime(order.createdAt) && (
                                                        <p className='text-[9px] text-slate-500 font-bold mt-1'>
                                                            🕒 {fmtOrderTime(order.createdAt)}
                                                        </p>
                                                    )}
                                                    <h2 className='text-sm font-bold text-white mt-2.5 leading-tight'>"""

assert content.count(old2) == 1, "Patch 2 anchor not found or not unique"
content = content.replace(old2, new2)

# --- Patch 3: full timestamp in Recent Deliveries list ---
old3 = """                                                <p className='font-black text-emerald-400'>{fmtINR(getDeliveryFee(order))}</p>
                                                <p className='text-[10px] text-slate-500'>
                                                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </p>"""

new3 = """                                                <p className='font-black text-emerald-400'>{fmtINR(getDeliveryFee(order))}</p>
                                                <p className='text-[10px] text-slate-500'>
                                                    {fmtOrderTime(order.deliveredAt || order.createdAt)}
                                                </p>"""

assert content.count(old3) == 1, "Patch 3 anchor not found or not unique"
content = content.replace(old3, new3)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ RiderDashboard.jsx patched successfully — order times now shown on every card.")
