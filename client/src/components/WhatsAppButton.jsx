import React, { useState, useRef, useEffect } from 'react'
import { FaWhatsapp } from 'react-icons/fa'
import { IoClose } from 'react-icons/io5'

const WhatsAppButton = () => {
  const [showTooltip, setShowTooltip] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dragRef = useRef(null)
  const offsetRef = useRef({ x: 0, y: 0 })
  const didDragRef = useRef(false)

  const phoneNumber = '919122335358'
  const message = encodeURIComponent('Hi! I need help with my Snapit order.')
  const whatsappURL = `https://wa.me/${phoneNumber}?text=${message}`

  useEffect(() => {
    const getViewport = () => ({
      w: window.visualViewport?.width  || window.innerWidth,
      h: window.visualViewport?.height || window.innerHeight,
    })

    const place = () => {
      const { w, h } = getViewport()
      setPos(prev => ({
        x: Math.min(Math.max(0, prev.x || w - 72), w - 56),
        y: Math.min(Math.max(0, prev.y || h - 90), h - 56),
      }))
    }

    place()
    setMounted(true)

    window.addEventListener('resize', place)
    window.visualViewport?.addEventListener('resize', place)
    return () => {
      window.removeEventListener('resize', place)
      window.visualViewport?.removeEventListener('resize', place)
    }
  }, [])

  const onPointerDown = (e) => {
    didDragRef.current = false
    const rect = dragRef.current.getBoundingClientRect()
    offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e) => {
    if (!dragging) return
    didDragRef.current = true
    setShowTooltip(false)
    setPos({
      x: Math.min(Math.max(0, e.clientX - offsetRef.current.x), window.innerWidth - 56),
      y: Math.min(Math.max(0, e.clientY - offsetRef.current.y), window.innerHeight - 56)
    })
  }

  const onPointerUp = () => {
    setDragging(false)
    // Snap to nearest horizontal edge
    setPos(p => ({
      ...p,
      x: p.x < window.innerWidth / 2 ? 12 : window.innerWidth - 68
    }))
    setTimeout(() => { didDragRef.current = false }, 100)
  }

  const handleClick = () => {
    if (didDragRef.current) return
    setShowTooltip(prev => !prev)
  }

  if (!mounted) return null

  const isLeft = pos.x < window.innerWidth / 2

  return (
    <>
      {/* Tooltip */}
      {showTooltip && (
        <div
          className='fixed z-50'
          style={{
            left: isLeft ? pos.x + 68 : pos.x - 218,
            top: Math.min(pos.y, window.innerHeight - 200),
          }}
        >
          <div className='bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 w-52'>
            <div className='flex items-center justify-between mb-2'>
              <div className='flex items-center gap-2'>
                <div className='w-7 h-7 bg-green-500 rounded-full flex items-center justify-center'>
                  <FaWhatsapp size={14} className='text-white' />
                </div>
                <p className='font-black text-slate-800 text-xs'>Snapit Support</p>
              </div>
              <button onClick={() => setShowTooltip(false)} className='text-slate-300 hover:text-slate-500'>
                <IoClose size={16} />
              </button>
            </div>
            <p className='text-[11px] text-slate-500 leading-snug mb-3'>
              Need help with your order? Chat with us instantly on WhatsApp!
            </p>
            <a
              href={whatsappURL}
              target='_blank'
              rel='noreferrer'
              onClick={() => setShowTooltip(false)}
              className='flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white text-xs font-black py-2.5 rounded-xl transition-all active:scale-95'
            >
              <FaWhatsapp size={14} /> Chat Now
            </a>
            <p className='text-[9px] text-slate-300 text-center mt-2'>Usually replies in 5 mins</p>
          </div>
        </div>
      )}

      {/* Button */}
      <div
        ref={dragRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={handleClick}
        className='fixed z-50 select-none'
        style={{
          left: pos.x,
          top: pos.y,
          cursor: dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          transition: dragging ? 'none' : 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        <div className={`relative w-14 h-14 bg-green-500 rounded-full shadow-2xl shadow-green-200 flex items-center justify-center transition-transform ${dragging ? 'scale-110 shadow-green-300' : 'hover:scale-110'}`}>
          {showTooltip
            ? <IoClose size={22} className='text-white' />
            : <FaWhatsapp size={26} className='text-white' />
          }
          {!dragging && !showTooltip && (
            <span className='absolute inset-0 rounded-full bg-green-400 animate-ping opacity-25'></span>
          )}
        </div>
      </div>
    </>
  )
}

export default WhatsAppButton