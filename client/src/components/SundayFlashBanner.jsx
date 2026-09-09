import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Axios from '../utils/Axios';

const SundayFlashBanner = ({ onStatusChange }) => {
  const navigate = useNavigate();
  const [flashData, setFlashData] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const fetchStatus = async () => {
    try {
      const res = await Axios({
        method: 'GET',
        url: '/api/sunday-flash/status',
      });
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        setFlashData(data);
        setSecondsLeft(data.remainingSeconds || 0);
        if (onStatusChange) onStatusChange(data);
      }
    } catch (e) {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchStatus();
    const pollInterval = setInterval(fetchStatus, 15000);
    return () => clearInterval(pollInterval);
  }, []);

  // Per-second countdown ticker
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const ticker = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(ticker);
          fetchStatus(); // Refresh status when reaching 0
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(ticker);
  }, [secondsLeft]);

  if (!flashData?.isLive || secondsLeft <= 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white p-3.5 sm:p-4 shadow-md mb-3 border border-orange-300/40">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase text-yellow-300 border border-yellow-400/30">
                🔥 SUNDAY FLASH OFFER
              </span>
              <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[11px] font-bold text-white uppercase">
                ⏰ EVERY SUNDAY AT {flashData?.formattedScheduleTime || '5:00 PM'}
              </span>
              <span className="inline-flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-yellow-200">
                ⚡ 5 MINS WINDOW
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white leading-tight">
              Food up to ₹149 is 100% FREE! (₹0 Food Cost)
            </h3>
            <p className="text-xs text-yellow-100 font-medium mt-0.5">
              Only delivery charge is taken: 🚴 0–3 km: ₹29 • 3–14 km: ₹9/km • 1 user = 1 order
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-center">
              <span className="text-[10px] text-yellow-300 font-bold block uppercase tracking-wider">Window</span>
              <span className="text-sm font-black text-white font-mono">5 Mins</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-white p-4 shadow-xl mb-4 border border-orange-400/40">
      {/* Background Animated Pulse Glow */}
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-yellow-300/20 rounded-full blur-2xl pointer-events-none animate-pulse" />
      <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-red-900/30 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Headline & Offer Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider uppercase text-yellow-300 border border-yellow-400/30">
              <span className="animate-bounce">🔥</span> SUNDAY FLASH OFFER
            </span>
            <span className="inline-flex items-center gap-1 bg-red-950/60 px-2.5 py-0.5 rounded-full text-xs font-bold text-white/90">
              ⚡ 5 MINUTES ONLY
            </span>
          </div>

          <h3 className="text-lg md:text-xl font-black mt-1.5 tracking-tight text-white leading-snug">
            ₹149 FOOD = ₹0 FOOD COST!
          </h3>

          <p className="text-xs md:text-sm text-yellow-100/90 mt-0.5 font-medium">
            Order food worth up to <span className="font-bold underline decoration-yellow-300">₹149 100% FREE</span>!
          </p>

          <div className="flex items-center gap-3 mt-2 text-[11px] md:text-xs text-white/80 font-medium">
            <span className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-md">
              🚴 0–3 km: <strong className="text-white">₹29</strong> | 3–14 km: <strong className="text-white">₹9/km</strong>
            </span>
            <span className="hidden sm:inline bg-black/20 px-2 py-0.5 rounded-md text-yellow-200">
              Max Food: ₹149 • 1 Order/User
            </span>
          </div>
        </div>

        {/* Right: Live Countdown Timer & Action */}
        <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t border-white/10 md:border-t-0">
          <div className="text-center bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-yellow-400/30 shadow-inner">
            <div className="text-[10px] uppercase font-bold text-yellow-300 tracking-wider">
              ⏰ Ends In
            </div>
            <div className="text-xl md:text-2xl font-black tracking-widest font-mono text-white">
              {timeFormatted}
            </div>
          </div>

          {flashData.alreadyClaimed ? (
            <div className="bg-emerald-600/90 text-white text-xs font-bold px-3 py-2 rounded-xl text-center">
              ✅ Offer Claimed!
            </div>
          ) : (
            <button
              onClick={() => navigate('/food')}
              className="bg-yellow-400 hover:bg-yellow-300 active:scale-95 transition-all text-gray-950 font-black text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-lg hover:shadow-yellow-400/30 flex items-center gap-1"
            >
              Order Food FREE ➔
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SundayFlashBanner;

