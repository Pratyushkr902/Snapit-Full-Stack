import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Axios from '../utils/Axios'
import bannerImg from '../assets/mgd_rakhi_banner.jpg'

const FestiveBannerCountdown = () => {
  const navigate = useNavigate()
  const [offer, setOffer] = useState({
    isActive: true,
    title: 'Raksha Bandhan Special — MGD Pizza Point',
    bannerImage: bannerImg,
    targetUrl: '/restaurant/6a3963a7e0dd57acb747e405',
    startsAt: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 42 * 60 * 60 * 1000).toISOString(),
  })
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isLive: false, expired: false })

  useEffect(() => {
    // Fetch live offer settings from backend
    Axios({ method: 'GET', url: '/api/festive-offer/current' })
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setOffer(res.data.data)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!offer.isActive) return

    const updateTimer = () => {
      const now = Date.now()
      const startTime = new Date(offer.startsAt).getTime()
      const endTime = new Date(offer.endsAt).getTime()

      let diff = 0
      let isLive = false
      let expired = false

      if (now < startTime) {
        // Countdown to start
        diff = Math.max(0, startTime - now)
      } else if (now >= startTime && now < endTime) {
        // Offer is live! Countdown to end
        diff = Math.max(0, endTime - now)
        isLive = true
      } else {
        // Expired
        expired = true
      }

      const totalSec = Math.floor(diff / 1000)
      const hours = Math.floor(totalSec / 3600)
      const minutes = Math.floor((totalSec % 3600) / 60)
      const seconds = totalSec % 60

      setTimeLeft({ hours, minutes, seconds, isLive, expired })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [offer])

  if (!offer.isActive || timeLeft.expired) return null

  return (
    <div className="container mx-auto px-4 mt-3 mb-2">
      <div
        onClick={() => navigate(offer.targetUrl || '/restaurant/6a3963a7e0dd57acb747e405')}
        className="relative rounded-2xl overflow-hidden shadow-md cursor-pointer group bg-stone-900 border border-amber-500/30 transition-all hover:shadow-xl hover:scale-[1.008]"
      >
        {/* Banner Graphic */}
        <img
          src={offer.bannerImage || bannerImg}
          alt="Raksha Bandhan MGD Pizza Point Offer"
          className="w-full h-48 sm:h-64 md:h-80 lg:h-96 object-cover object-center"
          loading="eager"
          decoding="async"
        />

        {/* Dynamic Countdown Header Overlay */}
        <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-10">
          <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl backdrop-blur-md bg-black/75 border border-amber-400/60 shadow-lg text-white">
            <span className="text-base sm:text-lg animate-pulse">
              {timeLeft.isLive ? '🔥' : '⏳'}
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-xs uppercase font-extrabold tracking-wider text-amber-300">
                {timeLeft.isLive ? 'LIVE 24H OFFER ENDS IN' : 'RAKHI OFFER STARTS IN'}
              </span>
              <div className="flex items-center gap-1 font-mono font-black text-xs sm:text-sm text-white">
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-amber-200">
                  {String(timeLeft.hours).padStart(2, '0')}h
                </span>
                <span>:</span>
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-amber-200">
                  {String(timeLeft.minutes).padStart(2, '0')}m
                </span>
                <span>:</span>
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-amber-200">
                  {String(timeLeft.seconds).padStart(2, '0')}s
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA Bar */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 sm:p-4 flex items-center justify-between">
          <div className="text-white">
            <p className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1.5">
              <span>🎁</span>
              <span>10% OFF Every Pizza + FREE ₹89 Margherita above ₹599</span>
            </p>
            <p className="text-[10px] sm:text-xs text-gray-200 hidden sm:block">
              Tap to order now from MGD Pizza Point & celebrate Rakhi!
            </p>
          </div>
          <button className="px-3.5 py-1.5 sm:px-5 sm:py-2 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-md group-hover:scale-105 transition-transform flex items-center gap-1.5">
            <span>ORDER NOW</span>
            <span>➔</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default FestiveBannerCountdown
