import React, { useState } from 'react'
import { FaWhatsapp } from 'react-icons/fa'
import { IoClose } from 'react-icons/io5'

const WhatsAppButton = () => {
  const [showTooltip, setShowTooltip] = useState(false)

  const phoneNumber = '919472026580' // Your number with country code
  const message = encodeURIComponent('Hi! I need help with my Snapit order.')
  const whatsappURL = `https://wa.me/${phoneNumber}?text=${message}`

  return (
    <div className='fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2'>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className='bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 max-w-[200px] animate-fade-in'>
          <div className='flex items-center justify-between mb-1'>
            <p className='font-black text-slate-800 text-xs'>Need help?</p>
            <button onClick={() => setShowTooltip(false)} className='text-slate-400 hover:text-slate-600'>
              <IoClose size={14} />
            </button>
          </div>
          <p className='text-[11px] text-slate-500 leading-tight mb-2'>Chat with us on WhatsApp for instant support!</p>
          <a
            href={whatsappURL}
            target='_blank'
            rel='noreferrer'
            className='block w-full bg-green-500 hover:bg-green-600 text-white text-center text-xs font-black py-2 rounded-xl transition-all active:scale-95'
          >
            Start Chat
          </a>
        </div>
      )}

      {/* Button */}
      <button
        onClick={() => setShowTooltip(prev => !prev)}
        className='w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-95 hover:scale-110'
        aria-label='WhatsApp Support'
      >
        {showTooltip ? <IoClose size={24} /> : <FaWhatsapp size={28} />}
        {/* Pulse ring */}
        <span className='absolute w-14 h-14 rounded-full bg-green-400 animate-ping opacity-20'></span>
      </button>

    </div>
  )
}

export default WhatsAppButton