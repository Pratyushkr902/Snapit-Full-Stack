import React, { useState } from 'react'
import { 
  IoShieldCheckmarkOutline, 
  IoCashOutline, 
  IoReceiptOutline, 
  IoPeopleOutline,
  IoCopyOutline,
  IoCheckmarkCircle,
  IoInformationCircleOutline,
  IoTrendingUpOutline,
  IoWalletOutline
} from 'react-icons/io5'
import toast from 'react-hot-toast'

const AdminVerifiedAuditWidget = ({ liveDeliveredGMV, liveDeliveredCount }) => {
  const [copied, setCopied] = useState(false)
  const [showEnglishText, setShowEnglishText] = useState(false)

  // Verified all-time business figures
  const AUDIT = {
    gmv: 54708,
    deliveredOrders: 206,
    grossDemand: 98416,
    totalOrders: 292,
    codAmount: 48898,
    codOrders: 186,
    codPct: 89.4,
    upiAmount: 5810,
    upiOrders: 20,
    upiPct: 10.6,
    totalUsers: 542,
    activeUsers: 526,
    monthly: [
      { month: 'June', amount: 20370, orders: 71, pct: 37.2, highlight: false },
      { month: 'July', amount: 14261, orders: 61, pct: 26.1, highlight: true, note: 'Single-month screenshot' },
      { month: 'September', amount: 5428, orders: 18, pct: 9.9, highlight: false },
      { month: 'August', amount: 4761, orders: 8, pct: 8.7, highlight: false },
      { month: 'March – May', amount: 9888, orders: 48, pct: 18.1, highlight: false, note: 'Ramp-up' },
    ]
  }

  const englishSummary = `Snapit Platform — Verified Business Performance & Valuation Audit:

1. Total Fulfilled Sales (GMV): ₹54,708 across 206 delivered orders
2. Total Orders Placed (Gross Demand): ₹98,416 across 292 orders
3. Payment Collection Split:
   • Cash on Delivery (COD): ₹48,898 (89% of orders, collected at doorstep)
   • Online UPI / Prepaid: ₹5,810 (11% of orders)
4. Verified Customer Base: 542 registered users (526 active)

Month-by-Month Delivered Sales Breakdown:
• June: ₹20,370 (71 orders)
• July: ₹14,261 (61 orders)
• September: ₹5,428 (18 orders)
• August: ₹4,761 (8 orders)
• March – May: ₹9,888 (48 orders)
Total Delivered GMV = ₹54,708 across 206 orders`

  const handleCopy = () => {
    navigator.clipboard.writeText(englishSummary)
    setCopied(true)
    toast.success('Official Valuation Summary copied to clipboard!')
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-4 sm:p-6 text-slate-100 shadow-xl backdrop-blur-md">
      {/* Header Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <IoShieldCheckmarkOutline className="text-2xl" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-wide text-white uppercase">
                Verified Business Performance & Valuation Audit
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-300 border border-emerald-500/40">
                <IoCheckmarkCircle className="text-xs" /> CERTIFIED AUDIT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive all-time platform sales, gross customer demand & doorstep cash reconciliation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setShowEnglishText(!showEnglishText)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-all"
          >
            <IoInformationCircleOutline className="text-sm" />
            {showEnglishText ? 'Hide Note' : 'View Negotiation Note'}
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-900/40 transition-all"
          >
            {copied ? <IoCheckmarkCircle className="text-sm" /> : <IoCopyOutline className="text-sm" />}
            {copied ? 'Copied!' : 'Copy Summary'}
          </button>
        </div>
      </div>

      {/* Expandable English Summary for Client Negotiation */}
      {showEnglishText && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-mono text-emerald-300/90 whitespace-pre-wrap leading-relaxed animate-fadeIn">
          {englishSummary}
        </div>
      )}

      {/* 4 Core Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5">
        {/* Fulfilled GMV */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Fulfilled Sales (GMV)</span>
            <IoTrendingUpOutline className="text-emerald-400 text-base" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
            ₹{AUDIT.gmv.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>{AUDIT.deliveredOrders} delivered orders</span>
            <span className="text-emerald-400/90 font-bold">100% verified</span>
          </div>
        </div>

        {/* Gross Demand */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Gross Orders Placed (Demand)</span>
            <IoReceiptOutline className="text-blue-400 text-base" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-blue-400 tracking-tight">
            ₹{AUDIT.grossDemand.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>{AUDIT.totalOrders} total orders placed</span>
            <span className="text-blue-400/90 font-bold">70.5% delivered</span>
          </div>
        </div>

        {/* COD Cash Collected */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Doorstep COD Cash Collected</span>
            <IoCashOutline className="text-amber-400 text-base" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
            ₹{AUDIT.codAmount.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>{AUDIT.codOrders} orders in cash</span>
            <span className="text-amber-400/90 font-bold">89.4% of sales</span>
          </div>
        </div>

        {/* Registered Users */}
        <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Registered Customers</span>
            <IoPeopleOutline className="text-purple-400 text-base" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-purple-400 tracking-tight">
            {AUDIT.totalUsers} Users
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>{AUDIT.activeUsers} active accounts</span>
            <span className="text-purple-400/90 font-bold">97% active</span>
          </div>
        </div>
      </div>

      {/* Detailed Analysis: Payment Channel Split & Monthly Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        {/* Left: Payment Channels & Doorstep COD Explanation */}
        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <IoWalletOutline className="text-emerald-400 text-sm" />
                Revenue Collection Channel Split
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                89% Cash on Delivery
              </span>
            </div>

            {/* Split Progress Bar */}
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex mb-2">
              <div 
                className="bg-amber-500 h-full transition-all" 
                style={{ width: `${AUDIT.codPct}%` }}
                title={`COD: ${AUDIT.codPct}%`}
              />
              <div 
                className="bg-emerald-500 h-full transition-all" 
                style={{ width: `${AUDIT.upiPct}%` }}
                title={`Online UPI: ${AUDIT.upiPct}%`}
              />
            </div>

            <div className="flex items-center justify-between text-xs mb-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span className="text-slate-300 font-semibold">COD (Doorstep Cash):</span>
                <span className="text-amber-400 font-bold">₹{AUDIT.codAmount.toLocaleString('en-IN')}</span>
                <span className="text-slate-500 text-[11px]">({AUDIT.codOrders} orders)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-slate-300 font-semibold">Online UPI:</span>
                <span className="text-emerald-400 font-bold">₹{AUDIT.upiAmount.toLocaleString('en-IN')}</span>
                <span className="text-slate-500 text-[11px]">({AUDIT.upiOrders} orders)</span>
              </div>
            </div>
          </div>

          {/* Doorstep Explanation Card for Client */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-3 mt-2">
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">Operating Context:</strong> In our local hyper-local operating zone, <strong className="text-amber-300">89% of customers prefer Cash on Delivery (COD)</strong> collected directly at their doorstep upon handover.
            </p>
            <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Doorstep Cash Collected:</span>
              <span className="text-white font-mono font-bold">₹48,898</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
              <span>Online UPI Payments:</span>
              <span className="text-white font-mono font-bold">₹5,810</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold flex items-center justify-between mt-1">
              <span>Total Fulfilled Sales:</span>
              <span className="text-emerald-400 font-mono font-bold">₹54,708</span>
            </div>
          </div>
        </div>

        {/* Right: Month-by-Month Delivered Sales Table */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <IoReceiptOutline className="text-blue-400 text-sm" />
              Month-by-Month Delivered Sales Breakdown
            </h3>
            <span className="text-[10px] text-slate-400">
              Total Delivered: <strong className="text-emerald-400">₹{AUDIT.gmv.toLocaleString('en-IN')}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="pb-2 font-semibold">Operating Period</th>
                  <th className="pb-2 font-semibold">Delivered Revenue</th>
                  <th className="pb-2 font-semibold">Delivered Orders</th>
                  <th className="pb-2 font-semibold">% of All-Time</th>
                  <th className="pb-2 font-semibold text-right">Performance Bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {AUDIT.monthly.map((row) => (
                  <tr 
                    key={row.month} 
                    className={`hover:bg-slate-900/60 transition-colors ${
                      row.highlight ? 'bg-emerald-950/20 font-medium' : ''
                    }`}
                  >
                    <td className="py-2.5 text-white font-medium flex items-center gap-2">
                      <span>{row.month}</span>
                      {row.highlight && (
                        <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                          Screenshot Window
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 font-bold font-mono text-emerald-400">
                      ₹{row.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 text-slate-300">
                      {row.orders} orders
                    </td>
                    <td className="py-2.5 text-slate-400 font-mono">
                      {row.pct}%
                    </td>
                    <td className="py-2.5 text-right w-28">
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden inline-block align-middle">
                        <div 
                          className={`h-full rounded-full ${row.highlight ? 'bg-emerald-400' : 'bg-emerald-500/70'}`}
                          style={{ width: `${(row.amount / 20370) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-700 font-bold text-slate-200">
                  <td className="pt-3 uppercase tracking-wide text-white">
                    Total Delivered Sales
                  </td>
                  <td className="pt-3 font-mono text-emerald-400 text-sm">
                    ₹{AUDIT.gmv.toLocaleString('en-IN')}
                  </td>
                  <td className="pt-3 text-slate-200">
                    206 delivered orders
                  </td>
                  <td className="pt-3 font-mono text-slate-200">
                    100.0%
                  </td>
                  <td className="pt-3 text-right text-[10px] text-emerald-400 font-bold uppercase">
                    100% Reconciled
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>* Single-month reports (e.g. July ₹14,261) reflect 30-day views. All-time GMV is ₹54,708.</span>
            <span className="font-semibold text-slate-300">Snapit Certified Audit</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminVerifiedAuditWidget
