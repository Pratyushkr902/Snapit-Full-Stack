import { useState, useEffect } from "react";
import Axios from "../utils/Axios.js";

const MILESTONES = [
  { days: 3,  coins: 20,  icon: "🌱", label: "Sprout"   },
  { days: 7,  coins: 50,  icon: "🔥", label: "On Fire"  },
  { days: 14, coins: 120, icon: "⚡", label: "Electric" },
  { days: 30, coins: 300, icon: "👑", label: "Legend"   },
];

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StreakTracker() {
  const [streak, setStreak]               = useState(0);
  const [claimedRewards, setClaimedRewards] = useState([]);
  const [orderedToday, setOrderedToday]   = useState(false);
  const [streakAlive, setStreakAlive]     = useState(false);
  const [loading, setLoading]             = useState(true);
  const [claiming, setClaiming]           = useState(null);

  useEffect(() => {
    Axios({ url: '/api/streak/me', method: 'get' })
      .then(res => {
        if (res.data.success) {
          const d = res.data.data;
          setStreak(d.currentStreak || 0);
          setClaimedRewards(d.claimedMilestones || []);
          setOrderedToday(d.orderedToday || false);
          setStreakAlive(d.streakAlive || false);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const nextMilestone  = MILESTONES.find(m => m.days > streak);
  const claimable      = MILESTONES.filter(m => m.days <= streak && !claimedRewards.includes(m.days));
  const progressPct    = nextMilestone
    ? Math.min(100, Math.round((streak / nextMilestone.days) * 100))
    : 100;

  const handleClaim = async (days) => {
    try {
      setClaiming(days);
      const res = await Axios({ url: '/api/streak/claim', method: 'post', data: { milestone: days } });
      if (res.data.success) {
        setClaimedRewards(prev => [...prev, days]);
        const coins = MILESTONES.find(m => m.days === days)?.coins || 0;
        alert(`🎉 ${coins} coins added to your Snapit Wallet!`);
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to claim reward");
    } finally {
      setClaiming(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-10">
      <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-400 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">Daily Streak</p>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black text-white leading-none">{streak}</span>
              <span className="text-white/80 font-bold text-sm mb-1">day{streak !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-white/70 text-xs mt-1">
              {streakAlive
                ? orderedToday
                  ? "✅ Ordered today — streak safe!"
                  : "⚠️ Order today to keep streak alive"
                : "Order today to start your streak"}
            </p>
          </div>
          <div className="text-6xl">{streakAlive ? '🔥' : '💤'}</div>
        </div>

        {/* Progress to next milestone */}
        {nextMilestone && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-white/80 font-bold mb-1">
              <span>{streak} days</span>
              <span>🎯 {nextMilestone.days} days → +{nextMilestone.coins} coins</span>
            </div>
            <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-white/70 text-[10px] mt-1 text-right">
              {nextMilestone.days - streak} more day{nextMilestone.days - streak !== 1 ? 's' : ''} to next reward
            </p>
          </div>
        )}
      </div>

      {/* ── Weekly dots ── */}
      <div className="px-5 py-4 border-b border-slate-50">
        <div className="flex justify-between">
          {DAYS_SHORT.map((day, i) => {
            const filled = streak >= 7 ? true : i < (streak % 7);
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  filled ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'bg-slate-100 text-slate-300'
                }`}>
                  {filled ? '✓' : ''}
                </div>
                <span className={`text-[9px] font-bold ${filled ? 'text-orange-500' : 'text-slate-300'}`}>
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Claimable rewards ── */}
      {claimable.length > 0 && (
        <div className="mx-4 my-3 bg-amber-50 border border-amber-200 rounded-2xl p-3">
          <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-2">🎁 Ready to Claim!</p>
          {claimable.map(m => (
            <div key={m.days} className="flex items-center gap-3 py-2">
              <span className="text-2xl">{m.icon}</span>
              <div className="flex-1">
                <p className="font-black text-slate-800 text-sm">{m.coins} Coins</p>
                <p className="text-[10px] text-slate-500">{m.days}-day milestone · {m.label}</p>
              </div>
              <button
                onClick={() => handleClaim(m.days)}
                disabled={claiming === m.days}
                className="px-4 py-2 bg-orange-500 text-white text-xs font-black rounded-xl hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-60"
              >
                {claiming === m.days ? '...' : 'CLAIM'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── All Milestones ── */}
      <div className="px-4 pb-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 mt-2">All Milestones</p>
        <div className="flex flex-col gap-2">
          {MILESTONES.map(m => {
            const achieved = streak >= m.days;
            const claimed  = claimedRewards.includes(m.days);
            return (
              <div key={m.days} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                claimed  ? 'bg-green-50 border-green-200' :
                achieved ? 'bg-orange-50 border-orange-200' :
                           'bg-slate-50 border-slate-100'
              }`}>
                <span className="text-xl">{m.icon}</span>
                <div className="flex-1">
                  <p className={`font-black text-sm ${achieved ? 'text-slate-800' : 'text-slate-400'}`}>
                    {m.days} Days · {m.label}
                  </p>
                  <p className={`text-[11px] font-bold ${achieved ? 'text-orange-600' : 'text-slate-400'}`}>
                    +{m.coins} coins to wallet
                  </p>
                </div>
                <span className={`text-[11px] font-black px-2 py-1 rounded-lg ${
                  claimed  ? 'bg-green-500 text-white' :
                  achieved ? 'bg-orange-100 text-orange-700' :
                             'bg-slate-100 text-slate-400'
                }`}>
                  {claimed ? '✅ Done' : achieved ? '🎁 Claim' : `🔒 ${m.days - streak}d`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Coins note */}
        <p className="text-[10px] text-slate-400 text-center mt-4 font-medium">
          🪙 Coins are added to your Snapit Wallet automatically
        </p>
      </div>
    </div>
  );
}