import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import {
  FaMotorcycle,
  FaBicycle,
  FaBolt,
  FaMoneyBillWave,
  FaClock,
  FaShieldAlt,
  FaCheckCircle,
  FaWhatsapp,
  FaPhoneAlt,
  FaArrowLeft,
  FaUserCheck,
  FaMapMarkerAlt
} from 'react-icons/fa'
import { IoCheckmarkDoneCircle, IoSparkles } from 'react-icons/io5'

export default function RiderJoinPage() {
  const navigate = useNavigate()
  const user = useSelector((state) => state?.user)

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    vehicleType: 'BIKE',
    vehicleNumber: '',
    licenseNumber: '',
    preferredHours: 'FULL_TIME',
    area: 'Paliganj'
  })

  const [submitting, setSubmitting] = useState(false)
  const [submittedApp, setSubmittedApp] = useState(null)

  // Auto-fill from logged-in user profile if available
  useEffect(() => {
    if (user?._id) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        mobile: prev.mobile || (user.mobile ? String(user.mobile) : ''),
        email: prev.email || user.email || ''
      }))
    }
  }, [user])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'mobile') {
      let digits = value.replace(/\D/g, '')
      if (digits.length === 12 && digits.startsWith('91')) {
        digits = digits.slice(2)
      } else if (digits.length > 10 && digits.startsWith('91')) {
        digits = digits.slice(2)
      }
      if (digits.length > 10) {
        digits = digits.slice(-10)
      }
      setFormData((prev) => ({ ...prev, mobile: digits }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Please enter your full name')
      return
    }

    let cleanMobile = formData.mobile.replace(/\D/g, '')
    if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
      cleanMobile = cleanMobile.slice(2)
    }
    if (cleanMobile.length > 10) {
      cleanMobile = cleanMobile.slice(-10)
    }
    if (cleanMobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }

    setSubmitting(true)
    try {
      const response = await Axios({
        ...SummaryApi.applyRider,
        data: {
          ...formData,
          mobile: cleanMobile
        }
      })

      if (response.data.success) {
        toast.success(response.data.message || 'Application submitted successfully!')
        setSubmittedApp(response.data.data || { ...formData, status: 'PENDING' })
      } else {
        toast.error(response.data.message || 'Failed to submit application')
      }
    } catch (error) {
      console.error('Rider application error:', error)
      toast.error(error?.response?.data?.message || 'Failed to submit application. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // If user is already active RIDER
  const isAlreadyRider = user?.role === 'RIDER'

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1)
              } else {
                navigate('/')
              }
            }}
            className="flex items-center gap-2 text-slate-300 hover:text-white text-sm font-semibold transition active:scale-95"
          >
            <FaArrowLeft className="text-base" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl">🛵</span>
            <span className="font-extrabold tracking-wide text-green-400">
              Snapit Fleet
            </span>
          </div>

          <a
            href="https://wa.me/919472026580?text=Hi%20Snapit,%20I%20want%20to%20join%20as%20a%20delivery%20partner%20in%20Paliganj"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-emerald-700/60 hover:bg-emerald-600 text-emerald-100 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-500/40 transition"
          >
            <FaWhatsapp className="text-sm text-emerald-300" />
            <span>Help</span>
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-8">
        {/* Already a Rider Banner */}
        {isAlreadyRider && (
          <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FaUserCheck className="text-2xl text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-emerald-200">You are already an Active Rider!</p>
                <p className="text-xs text-emerald-400/80">
                  Your account is authorized to accept delivery orders and track earnings.
                </p>
              </div>
            </div>
            <Link
              to="/rider-panel"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 whitespace-nowrap"
            >
              Open Rider Panel →
            </Link>
          </div>
        )}

        {/* Hero Section */}
        <section className="text-center space-y-4 pt-2">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/20 via-green-500/10 to-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            <IoSparkles className="text-emerald-400 text-sm animate-pulse" />
            <span>Hiring Delivery Partners in Paliganj</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Deliver with <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">Snapit</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto font-medium">
            Earn <span className="text-white font-bold">₹7,000 – ₹15,000+ / month</span> delivering grocery & essentials in your local town. Same app, instant joining, daily UPI payouts!
          </p>

          {/* Quick Stat Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 text-center">
              <FaMoneyBillWave className="text-emerald-400 text-lg mx-auto mb-1" />
              <p className="text-xs text-slate-400 font-medium">Payouts</p>
              <p className="text-sm font-bold text-white">Daily UPI</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 text-center">
              <FaClock className="text-amber-400 text-lg mx-auto mb-1" />
              <p className="text-xs text-slate-400 font-medium">Working Hours</p>
              <p className="text-sm font-bold text-white">100% Flexible</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 text-center">
              <FaMapMarkerAlt className="text-rose-400 text-lg mx-auto mb-1" />
              <p className="text-xs text-slate-400 font-medium">Delivery Area</p>
              <p className="text-sm font-bold text-white">Local Paliganj</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 text-center">
              <FaShieldAlt className="text-cyan-400 text-lg mx-auto mb-1" />
              <p className="text-xs text-slate-400 font-medium">Joining Fee</p>
              <p className="text-sm font-bold text-emerald-400">₹0 Free</p>
            </div>
          </div>
        </section>

        {/* Success Modal / State */}
        {submittedApp ? (
          <section className="bg-slate-800/90 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl shadow-emerald-500/10">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-3xl">
              <IoCheckmarkDoneCircle />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Application Received! 🎉</h2>
              <p className="text-slate-300 text-sm max-w-md mx-auto">
                Thank you, <span className="text-emerald-400 font-bold">{submittedApp.name}</span>! Your application for mobile <span className="text-white font-mono font-bold">{submittedApp.mobile}</span> is received and currently under review.
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 text-left text-xs space-y-2.5 max-w-md mx-auto">
              <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800">
                <span>Application Status:</span>
                <span className="bg-amber-500/20 text-amber-300 font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  {submittedApp.status || 'PENDING'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Vehicle:</span>
                <span className="text-slate-200 font-semibold">{submittedApp.vehicleType}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Shift:</span>
                <span className="text-slate-200 font-semibold">{submittedApp.preferredHours}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Location:</span>
                <span className="text-slate-200 font-semibold">{submittedApp.area || 'Paliganj'}</span>
              </div>
            </div>

            {/* Next Steps Card */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 text-left space-y-2">
              <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">What happens next?</p>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                <li>Our admin team will review your application today.</li>
                <li>Once approved, your role in the Snapit app will change to <span className="text-emerald-300 font-bold">RIDER</span>.</li>
                <li>Simply log into this app with your mobile number to start accepting orders!</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={`https://wa.me/919472026580?text=${encodeURIComponent(`Hi Snapit Admin, I have submitted my rider application. Name: ${submittedApp.name}, Mobile: ${submittedApp.mobile}. Please review and approve my account.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition shadow-lg shadow-emerald-600/30"
              >
                <FaWhatsapp className="text-lg" />
                <span>Contact Admin on WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-3 px-4 rounded-xl text-sm transition"
              >
                Go to Snapit Home
              </button>
            </div>
          </section>
        ) : (
          /* Application Form Card */
          <section className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="border-b border-slate-700/60 pb-4">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>Rider Application Form</span>
                <span className="text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30 px-2.5 py-0.5 rounded-full">
                  1 Min Form
                </span>
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Fill your basic details below. No documents or joining fees required upfront!
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Kumar"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500 transition"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  10-Digit Mobile Number (Used for Login) <span className="text-rose-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-xs font-bold text-slate-400 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="98765 43210"
                    maxLength={10}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500 transition font-mono tracking-wider"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Once approved, you will log into Snapit with this phone number.
                </p>
              </div>

              {/* Email (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address <span className="text-slate-500">(Optional)</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. yourname@gmail.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500 transition"
                />
              </div>

              {/* Vehicle Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Vehicle You Will Use <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'BIKE', label: 'Motorbike', icon: <FaMotorcycle className="text-xl text-green-400" /> },
                    { id: 'SCOOTER', label: 'Scooter', icon: <FaMotorcycle className="text-xl text-emerald-400" /> },
                    { id: 'EV', label: 'Electric EV', icon: <FaBolt className="text-xl text-amber-400" /> },
                    { id: 'BICYCLE', label: 'Bicycle', icon: <FaBicycle className="text-xl text-sky-400" /> }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, vehicleType: item.id }))}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                        formData.vehicleType === item.id
                          ? 'bg-green-600/20 border-green-500 text-white shadow-lg shadow-green-500/10'
                          : 'bg-slate-900/60 border-slate-700/80 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="mb-1.5">{item.icon}</div>
                      <span className="text-xs font-bold">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Vehicle Number & License (Optional for Bicycle) */}
              {formData.vehicleType !== 'BICYCLE' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Vehicle Number <span className="text-slate-500">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      name="vehicleNumber"
                      value={formData.vehicleNumber}
                      onChange={handleChange}
                      placeholder="e.g. BR 01 AB 1234"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 uppercase focus:outline-none focus:border-green-500 transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Driving License <span className="text-slate-500">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      placeholder="e.g. DL-XXXXXXXXXXXX"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 uppercase focus:outline-none focus:border-green-500 transition font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Shift Preference */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Preferred Shift / Working Hours
                </label>
                <select
                  name="preferredHours"
                  value={formData.preferredHours}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500 transition"
                >
                  <option value="FULL_TIME">Full Time (8 - 10 Hours / Day) — Highest Earnings</option>
                  <option value="MORNING">Morning Shift (7:00 AM - 2:00 PM)</option>
                  <option value="EVENING">Evening Shift (2:00 PM - 10:00 PM)</option>
                  <option value="WEEKEND">Weekend Only (Saturday & Sunday)</option>
                </select>
              </div>

              {/* Town / Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Operating Town / Area
                </label>
                <input
                  type="text"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  placeholder="Paliganj, Bihar"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500 transition"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 disabled:opacity-50 text-slate-950 font-black py-3.5 px-6 rounded-2xl text-base tracking-wide shadow-xl shadow-green-500/20 transition flex items-center justify-center gap-2 mt-4"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                    Submitting Application...
                  </span>
                ) : (
                  <>
                    <span>Submit Rider Application</span>
                    <FaCheckCircle className="text-slate-950" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-slate-400 pt-1">
                By submitting, you agree to receive onboarding updates via SMS/WhatsApp from Snapit.
              </p>
            </form>
          </section>
        )}

        {/* 4-Step Process Explanation */}
        <section className="bg-slate-800/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="text-green-400">⚡</span>
            <span>How Rider Onboarding Works</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <span className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 font-black flex items-center justify-center text-xs shrink-0">
                1
              </span>
              <div>
                <p className="text-xs font-bold text-white">Submit Form</p>
                <p className="text-[11px] text-slate-400">
                  Fill your name, mobile number, and vehicle choice in under 1 minute.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <span className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 font-black flex items-center justify-center text-xs shrink-0">
                2
              </span>
              <div>
                <p className="text-xs font-bold text-white">Instant Admin Approval</p>
                <p className="text-[11px] text-slate-400">
                  Snapit admin verifies your application and unlocks your Rider account.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <span className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 font-black flex items-center justify-center text-xs shrink-0">
                3
              </span>
              <div>
                <p className="text-xs font-bold text-white">Same Single App</p>
                <p className="text-[11px] text-slate-400">
                  No separate app needed! The same Snapit app turns into your Rider Panel.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <span className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 font-black flex items-center justify-center text-xs shrink-0">
                4
              </span>
              <div>
                <p className="text-xs font-bold text-white">Deliver & Earn Daily</p>
                <p className="text-[11px] text-slate-400">
                  Accept delivery orders, navigate with GPS, and receive daily UPI payments.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Support & Contact Footer */}
        <footer className="text-center space-y-3 pt-2">
          <p className="text-xs text-slate-400">
            Have questions before joining? Speak directly to our local fleet manager:
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a
              href="tel:9472026580"
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl border border-slate-700 transition"
            >
              <FaPhoneAlt className="text-green-400 text-xs" />
              <span>Call: +91 94720 26580</span>
            </a>
            <a
              href="https://wa.me/919472026580?text=Hi%20Snapit,%20I%20have%20questions%20about%20joining%20as%20a%20rider"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 text-xs font-bold px-4 py-2 rounded-xl border border-emerald-500/40 transition"
            >
              <FaWhatsapp className="text-emerald-400 text-sm" />
              <span>WhatsApp Support</span>
            </a>
          </div>
          <p className="text-[10px] text-slate-500 pt-2">
            Snapit Grocery & Essentials Fleet • Paliganj, Patna, Bihar
          </p>
        </footer>
      </main>
    </div>
  )
}

