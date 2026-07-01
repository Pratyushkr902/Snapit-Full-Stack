import React, { useState, useEffect } from 'react'

const getISTHour = () => {
  const now   = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  const istMs = utcMs + 5.5 * 3600000
  return new Date(istMs).getHours()
}

const isAdminOrDashboardRoute = () => {
  const path = window.location.hash.toLowerCase()
  return path.includes('dashboard') || path.includes('rider-panel')
}

const isStoreOpen = () => {
  if (isAdminOrDashboardRoute()) return true

  const h = getISTHour()
  return h >= 8 && h < 21
}

const getCountdown = () => {
  const now    = new Date()
  const utcMs  = now.getTime() + now.getTimezoneOffset() * 60000
  const istNow = new Date(utcMs + 5.5 * 3600000)
  const open   = new Date(istNow)
  open.setHours(8, 0, 0, 0)
  if (istNow.getHours() >= 8) open.setDate(open.getDate() + 1)
  const diffMs = open - istNow
  const h = Math.floor(diffMs / 3600000)
  const m = Math.floor((diffMs % 3600000) / 60000)
  const s = Math.floor((diffMs % 60000) / 1000)
  return { h, m, s }
}

const StoreClosedOverlay = () => {
  const [open, setOpen]           = useState(isStoreOpen())
  const [countdown, setCountdown] = useState(getCountdown())

  useEffect(() => {
    const t = setInterval(() => {
      setOpen(isStoreOpen())
      setCountdown(getCountdown())
    }, 1000)
    return () => clearInterval(t)
  }, [])

  if (open) return null

  const { h, m, s } = countdown

  return (
    <>
      <div className='sticky top-0 z-50 w-full bg-[#1C1C2E] border-b border-white/5'>
        <div className='max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3'>

          <div className='flex items-center gap-2.5 min-w-0'>
            <div className='w-8 h-8 rounded-full bg-yellow-400/10 flex items-center justify-center shrink-0'>
              <span className='text-base'>🌙</span>
            </div>
            <div className='min-w-0'>
              <p className='text-white text-[13px] font-bold leading-tight'>
                Snapit is currently closed
              </p>
              <p className='text-gray-400 text-[11px] leading-tight truncate'>
                Opens at <span className='text-yellow-400 font-semibold'>8:00 AM</span> · ordering disabled
              </p>
            </div>
          </div>

          <div className='flex items-center gap-1 shrink-0'>
            {[
              { val: String(h).padStart(2,'0'), label: 'hr' },
              { val: String(m).padStart(2,'0'), label: 'min' },
              { val: String(s).padStart(2,'0'), label: 'sec' },
            ].map((unit, i) => (
              <React.Fragment key={unit.label}>
                {i > 0 && <span className='text-gray-500 text-xs font-bold'>:</span>}
                <div className='flex flex-col items-center bg-white/10 rounded-lg px-2 py-1 min-w-[36px]'>
                  <span className='text-white text-sm font-mono font-bold leading-none'>{unit.val}</span>
                  <span className='text-gray-500 text-[8px] font-medium uppercase leading-none mt-0.5'>{unit.label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>

        </div>

        <div className='h-[2px] bg-white/5 w-full'>
          <div
            className='h-full bg-yellow-400 transition-all duration-1000'
            style={{ width: `${Math.min(100, 100 - ((h * 3600 + m * 60 + s) / (13 * 3600)) * 100)}%` }}
          />
        </div>
      </div>
    </>
  )
}

export { isStoreOpen }
export default StoreClosedOverlay