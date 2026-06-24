import React, { useState, useEffect } from 'react'

// Returns current IST hour (0-23)
const getISTHour = () => {
  const now   = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  const istMs = utcMs + 5.5 * 3600000
  return new Date(istMs).getHours()
}

const isStoreOpen = () => {
  const h = getISTHour()
  return h >= 8 && h < 21
}

// Countdown to 8 AM IST
const getCountdown = () => {
  const now    = new Date()
  const utcMs  = now.getTime() + now.getTimezoneOffset() * 60000
  const istNow = new Date(utcMs + 5.5 * 3600000)

  const open = new Date(istNow)
  open.setHours(8, 0, 0, 0)
  if (istNow.getHours() >= 8) open.setDate(open.getDate() + 1)

  const diffMs = open - istNow
  const h = Math.floor(diffMs / 3600000)
  const m = Math.floor((diffMs % 3600000) / 60000)
  const s = Math.floor((diffMs % 60000) / 1000)
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

const StoreClosedOverlay = () => {
  const [open, setOpen]         = useState(isStoreOpen())
  const [countdown, setCountdown] = useState(getCountdown())
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setOpen(isStoreOpen())
      setCountdown(getCountdown())
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Store is open or user dismissed — don't show
  if (open || dismissed) return null

  return (
    <div className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-sm px-6'>
      {/* Moon animation */}
      <div className='text-7xl mb-4 animate-bounce'>🌙</div>

      <h1 className='text-white text-2xl font-bold text-center mb-1'>
        Snapit is Closed
      </h1>
      <p className='text-gray-300 text-sm text-center mb-6'>
        We're resting for the night. Come back at{' '}
        <span className='text-yellow-400 font-bold'>8:00 AM</span> — fresh & ready!
      </p>

      {/* Countdown */}
      <div className='bg-white/10 border border-white/20 rounded-2xl px-8 py-4 mb-6 text-center'>
        <p className='text-gray-400 text-xs font-medium mb-1'>Opens in</p>
        <p className='text-white text-3xl font-mono font-bold tracking-widest'>{countdown}</p>
      </div>

      {/* Store hours card */}
      <div className='bg-white/10 border border-white/20 rounded-2xl px-6 py-3 mb-8 flex items-center gap-4'>
        <div className='text-center'>
          <p className='text-gray-400 text-[10px] font-medium'>Opens</p>
          <p className='text-white font-bold text-sm'>8:00 AM</p>
        </div>
        <div className='h-8 w-px bg-white/20' />
        <div className='text-center'>
          <p className='text-gray-400 text-[10px] font-medium'>Closes</p>
          <p className='text-white font-bold text-sm'>9:00 PM</p>
        </div>
        <div className='h-8 w-px bg-white/20' />
        <div className='text-center'>
          <p className='text-gray-400 text-[10px] font-medium'>Days</p>
          <p className='text-white font-bold text-sm'>Mon–Sun</p>
        </div>
      </div>

      {/* Browse anyway */}
      <button
        onClick={() => setDismissed(true)}
        className='text-gray-400 text-sm underline underline-offset-2 active:text-white transition'
      >
        Browse products (ordering disabled)
      </button>
    </div>
  )
}

export { isStoreOpen }
export default StoreClosedOverlay