import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SuperAdminPermision from '../layouts/SuperAdminPermision'
import Axios from '../utils/Axios'
import AxiosToastError from '../utils/AxiosToastError'
import toast from 'react-hot-toast'
import bannerImg from '../assets/mgd_rakhi_banner.jpg'

const AdminBannerOffers = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [offer, setOffer] = useState({
    title: 'Raksha Bandhan Special — MGD Pizza Point',
    subtitle: '10% OFF on all pizzas + FREE Margherita Pizza on orders above ₹599!',
    bannerImage: '/mgd_rakhi_banner.jpg',
    targetUrl: '/restaurant/6a3963a7e0dd57acb747e405',
    isActive: true,
    startsAt: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString().slice(0, 16),
    endsAt: new Date(Date.now() + 42 * 60 * 60 * 1000).toISOString().slice(0, 16),
    minOrderForFreebie: 599,
    freebieName: 'Margherita Pizza (Worth ₹99)',
    discountPercentage: 10,
  })

  useEffect(() => {
    fetchOffer()
  }, [])

  const fetchOffer = async () => {
    try {
      setLoading(true)
      const res = await Axios({ method: 'GET', url: '/api/festive-offer/current' })
      if (res.data?.success && res.data?.data) {
        const d = res.data.data
        setOffer({
          ...d,
          startsAt: d.startsAt ? new Date(d.startsAt).toISOString().slice(0, 16) : '',
          endsAt: d.endsAt ? new Date(d.endsAt).toISOString().slice(0, 16) : '',
        })
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    try {
      setSaving(true)
      const res = await Axios({
        method: 'POST',
        url: '/api/festive-offer/update',
        data: offer,
      })
      if (res.data?.success) {
        toast.success('Festive offer settings saved successfully! 🎉')
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setSaving(false)
    }
  }

  const setGoLiveNow = () => {
    const now = new Date()
    const ends = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    setOffer(prev => ({
      ...prev,
      isActive: true,
      startsAt: now.toISOString().slice(0, 16),
      endsAt: ends.toISOString().slice(0, 16),
    }))
    toast.success('Timer set to LIVE NOW for the next 24 hours!')
  }

  const setCountdownFromNow = () => {
    const now = new Date()
    const starts = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const ends = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    setOffer(prev => ({
      ...prev,
      isActive: true,
      startsAt: starts.toISOString().slice(0, 16),
      endsAt: ends.toISOString().slice(0, 16),
    }))
    toast.success('Countdown configured to start in 24 hours!')
  }

  return (
    <SuperAdminPermision>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/dashboard/super-admin')}
              className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1 mb-1"
            >
              ← Back to Super Admin
            </button>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <span>🎁</span> Festive Banners & Offers Control
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Manage user access, live countdown timers, and festive perks in real time
            </p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center animate-pulse">
            <p className="text-sm font-semibold text-gray-400">Loading festive offer settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Live Banner Preview */}
            <div className="bg-stone-900 rounded-2xl p-4 sm:p-5 border border-amber-500/30 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                  Live Banner Preview
                </span>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${offer.isActive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                  {offer.isActive ? '🟢 Active & Visible' : '🔴 Disabled'}
                </span>
              </div>
              <div className="relative rounded-xl overflow-hidden max-h-56">
                <img
                  src={offer.bannerImage || bannerImg}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                <span>⚡</span> Quick Timing Actions
              </h3>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={setGoLiveNow}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  🔥 Make Offer Live Now (24 Hours)
                </button>
                <button
                  type="button"
                  onClick={setCountdownFromNow}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  ⏳ Set 24h Countdown (Starts Tomorrow)
                </button>
                <button
                  type="button"
                  onClick={() => setOffer(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className={`px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${
                    offer.isActive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {offer.isActive ? '🚫 Deactivate Banner' : '✅ Activate Banner'}
                </button>
              </div>
            </div>

            {/* Config Fields */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Offer Configuration</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Offer Title</label>
                  <input
                    type="text"
                    value={offer.title}
                    onChange={e => setOffer({ ...offer, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Target URL</label>
                  <input
                    type="text"
                    value={offer.targetUrl}
                    onChange={e => setOffer({ ...offer, targetUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Countdown Ends / Offer Starts (Date & Time)
                  </label>
                  <input
                    type="datetime-local"
                    value={offer.startsAt}
                    onChange={e => setOffer({ ...offer, startsAt: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    24h Offer Expires (Date & Time)
                  </label>
                  <input
                    type="datetime-local"
                    value={offer.endsAt}
                    onChange={e => setOffer({ ...offer, endsAt: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Min Order for Freebie (₹)
                  </label>
                  <input
                    type="number"
                    value={offer.minOrderForFreebie}
                    onChange={e => setOffer({ ...offer, minOrderForFreebie: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Freebie Item Name
                  </label>
                  <input
                    type="text"
                    value={offer.freebieName}
                    onChange={e => setOffer({ ...offer, freebieName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Discount %
                  </label>
                  <input
                    type="number"
                    value={offer.discountPercentage}
                    onChange={e => setOffer({ ...offer, discountPercentage: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={fetchOffer}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl"
              >
                Reset Changes
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                {saving ? 'Saving...' : '💾 Save Offer Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </SuperAdminPermision>
  )
}

export default AdminBannerOffers
