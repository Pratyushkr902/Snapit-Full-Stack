import React from 'react'

const FreeDeliveryProgressBar = ({
  currentAmount = 0,
  threshold = 149,
  isSnapitPlus = false,
  isLongDistance = false,
  customMessage = '',
}) => {
  if (isSnapitPlus) {
    return (
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/15 to-amber-500/10 border border-amber-300/60 dark:border-amber-500/30 rounded-2xl p-3 mb-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-lg">👑</span>
          <div>
            <p className="text-xs font-black text-amber-900 dark:text-amber-200">
              Snapit Plus Member
            </p>
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              FREE delivery unlocked on all qualifying orders!
            </p>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-full">
          Active
        </span>
      </div>
    )
  }

  if (isLongDistance) {
    return (
      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl p-3 mb-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎓</span>
          <div>
            <p className="text-xs font-black text-blue-900 dark:text-blue-200">
              Campus / Long Distance Delivery
            </p>
            <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">
              {customMessage || 'Flat ₹12 delivery fee applied (beyond 7 km)'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const numCurrent = Number(currentAmount) || 0
  const numThreshold = Number(threshold) || 149
  const remaining = Math.max(0, numThreshold - numCurrent)
  const isUnlocked = remaining === 0
  const percent = Math.min(100, Math.round((numCurrent / numThreshold) * 100))

  return (
    <div
      className={`rounded-2xl p-3.5 mb-3 transition-all border ${
        isUnlocked
          ? 'bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700 shadow-2xs'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{isUnlocked ? '🎉' : '🚚'}</span>
          <span className="text-xs font-black text-slate-800 dark:text-slate-100">
            {isUnlocked ? (
              <span className="text-emerald-700 dark:text-emerald-400">
                Yay! You unlocked <strong className="font-black">FREE Delivery</strong>
              </span>
            ) : (
              <span>
                Add <span className="text-emerald-600 dark:text-emerald-400 font-black">₹{remaining}</span> more for{' '}
                <span className="text-emerald-600 dark:text-emerald-400 font-black">FREE Delivery</span>
              </span>
            )}
          </span>
        </div>
        <span
          className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
            isUnlocked
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          {percent}%
        </span>
      </div>

      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isUnlocked
              ? 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-xs'
              : 'bg-gradient-to-r from-amber-500 to-emerald-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {!isUnlocked && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1.5 flex items-center justify-between">
          <span>Free delivery on orders ₹{numThreshold}+</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Save ₹12–₹29 on delivery</span>
        </p>
      )}
    </div>
  )
}

export default FreeDeliveryProgressBar

