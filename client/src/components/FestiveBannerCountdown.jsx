import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Axios from '../utils/Axios'
import bannerImg from '../assets/mgd_rakhi_banner.jpg'

const FestiveBannerCountdown = () => {
  const navigate = useNavigate()
  const [offer, setOffer] = useState({
    isActive: true,
    title: 'Happy Raksha Bandhan — MGD Pizza Point Special',
    bannerImage: bannerImg,
    targetUrl: '/restaurant/6a3963a7e0dd57acb747e405',
    startsAt: '2026-08-27T18:30:00.000Z', // 28 August 00:00 IST
    endsAt: '2026-08-28T18:29:59.000Z',   // 28 August 23:59 IST
  })
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isLive: false,
    expired: false
  })

  useEffect(() => {
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
        // Countdown to launch (Raksha Bandhan 28 Aug)
        diff = Math.max(0, startTime - now)
      } else if (now >= startTime && now < endTime) {
        // Offer is live!
        diff = Math.max(0, endTime - now)
        isLive = true
      } else {
        expired = true
      }

      const totalSec = Math.floor(diff / 1000)
      const days = Math.floor(totalSec / (24 * 3600))
      const hours = Math.floor((totalSec % (24 * 3600)) / 3600)
      const minutes = Math.floor((totalSec % 3600) / 60)
      const seconds = totalSec % 60

      setTimeLeft({ days, hours, minutes, seconds, isLive, expired })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [offer])

  if (!offer.isActive || timeLeft.expired) return null

  return (
    <div className="container mx-auto px-4 mt-2 mb-4">
      <div
        onClick={() => navigate(offer.targetUrl || '/restaurant/6a3963a7e0dd57acb747e405')}
        className="rounded-2xl overflow-hidden shadow-md cursor-pointer group bg-gradient-to-r from-red-900 via-amber-800 to-red-950 border border-amber-400/40 transition-all hover:shadow-xl hover:scale-[1.006]"
      >
        {/* Sleek Festive Ribbon Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 sm:px-5 py-2.5 bg-black/40 backdrop-blur-sm border-b border-amber-400/20 text-white">
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl animate-bounce">🪢</span>
            <div>
              <span className="text-xs sm:text-sm font-black tracking-wide text-amber-300">
                Raksha Bandhan Special (28 August)
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] text-amber-100/70 font-semibold">
                • MGD Pizza Point
              </span>
            </div>
          </div>

          {/* Live Countdown Clock */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-200">
              {timeLeft.isLive ? '🔥 Offer Ends In:' : '⏳ Starts In:'}
            </span>
            <div className="flex items-center gap-1 font-mono font-black text-xs sm:text-sm">
              {timeLeft.days > 0 && (
                <>
                  <span className="bg-amber-500/20 border border-amber-400/50 text-amber-200 px-1.5 py-0.5 rounded shadow-inner">
                    {String(timeLeft.days).padStart(2, '0')}d
                  </span>
                  <span className="text-amber-400">:</span>
                </>
              )}
              <span className="bg-amber-500/20 border border-amber-400/50 text-amber-200 px-1.5 py-0.5 rounded shadow-inner">
                {String(timeLeft.hours).padStart(2, '0')}h
              </span>
              <span className="text-amber-400">:</span>
              <span className="bg-amber-500/20 border border-amber-400/50 text-amber-200 px-1.5 py-0.5 rounded shadow-inner">
                {String(timeLeft.minutes).padStart(2, '0')}m
              </span>
              <span className="text-amber-400">:</span>
              <span className="bg-amber-500/20 border border-amber-400/50 text-amber-200 px-1.5 py-0.5 rounded shadow-inner">
                {String(timeLeft.seconds).padStart(2, '0')}s
              </span>
            </div>
          </div>
        </div>

        {/* Clean, Un-obscured Creative Banner */}
        <div className="relative w-full aspect-[2/1] sm:aspect-[2.3/1] max-h-[360px] bg-stone-900 overflow-hidden">
          <img
            src={offer.bannerImage || bannerImg}
            alt="Happy Raksha Bandhan MGD Pizza Point Special"
            className="w-full h-full object-cover sm:object-contain object-center group-hover:scale-[1.01] transition-transform duration-300"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </div>
  )
}

export default FestiveBannerCountdown
