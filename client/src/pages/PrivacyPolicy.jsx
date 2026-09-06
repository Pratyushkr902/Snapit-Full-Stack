import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaShieldAlt, FaMapMarkerAlt, FaLock, FaUserSecret, FaEnvelope } from 'react-icons/fa'

const PrivacyPolicy = () => {
  const navigate = useNavigate()

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors pb-16'>
      {/* Top Header Bar */}
      <div className='sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 flex items-center gap-3'>
        <button
          onClick={() => navigate(-1)}
          className='w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-95 transition'
          aria-label='Go Back'
        >
          <FaArrowLeft className='text-sm' />
        </button>
        <div>
          <h1 className='text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2'>
            <FaShieldAlt className='text-amber-500' /> Privacy Policy
          </h1>
          <p className='text-[11px] text-slate-500 dark:text-slate-400'>Last updated: September 2026</p>
        </div>
      </div>

      {/* Main Content Container */}
      <div className='max-w-3xl mx-auto px-4 py-6 space-y-6'>
        {/* Intro Card */}
        <div className='p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm'>
          <p className='text-sm leading-relaxed text-slate-700 dark:text-slate-300'>
            This Privacy Policy describes how <strong>Snapit</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, uses, and protects your information when you use our mobile applications (Android &amp; iOS) and website. By using Snapit, you agree to the collection and use of information in accordance with this policy.
          </p>
        </div>

        {/* Section 1 */}
        <div className='p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3'>
          <h2 className='text-base font-bold text-slate-900 dark:text-white flex items-center gap-2'>
            <span className='w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-center font-black'>1</span>
            Information We Collect
          </h2>
          <ul className='text-xs sm:text-sm space-y-2 text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed'>
            <li><strong>Personal Information:</strong> Name, mobile phone number, email address, and delivery addresses entered during registration, address creation, or checkout.</li>
            <li><strong>Location Data:</strong> With your permission, we collect precise GPS coordinates to show serviceable restaurants/grocery stores and guide delivery riders to your doorstep.</li>
            <li><strong>Order History:</strong> Details of grocery and restaurant orders, delivery timestamps, item lists, and transaction amounts.</li>
            <li><strong>Device &amp; App Diagnostics:</strong> Device type, operating system version (Android/iOS), app version, and crash logs to maintain app reliability.</li>
          </ul>
        </div>

        {/* Section 2 */}
        <div className='p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3'>
          <h2 className='text-base font-bold text-slate-900 dark:text-white flex items-center gap-2'>
            <span className='w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-center font-black'>2</span>
            How We Use Your Information
          </h2>
          <ul className='text-xs sm:text-sm space-y-2 text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed'>
            <li>To process, pack, and fulfill 10-minute grocery and restaurant orders.</li>
            <li>To provide live GPS rider tracking and accurate ETA estimates.</li>
            <li>To send real-time order updates, delivery milestones, and security OTPs via SMS and push notifications.</li>
            <li>To provide customer support and process refunds.</li>
            <li>To prevent fraudulent transactions and maintain platform security.</li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className='p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3'>
          <h2 className='text-base font-bold text-slate-900 dark:text-white flex items-center gap-2'>
            <span className='w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-center font-black'>3</span>
            Location Data &amp; Permissions
          </h2>
          <div className='flex items-start gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed'>
            <FaMapMarkerAlt className='text-red-500 text-lg flex-shrink-0 mt-1' />
            <p>
              Snapit accesses your device&apos;s location only when you grant permission. We use this data to pin your delivery address accurately, compute delivery distance, and allow dispatchers/riders to navigate to your building. We never track your location in the background when the app is closed unless an order is actively out for delivery.
            </p>
          </div>
        </div>

        {/* Section 4 */}
        <div className='p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3'>
          <h2 className='text-base font-bold text-slate-900 dark:text-white flex items-center gap-2'>
            <span className='w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-center font-black'>4</span>
            Data Sharing &amp; Third Parties
          </h2>
          <p className='text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed'>
            We never sell or rent your personal information. Data is strictly shared with authorized partners essential to delivering your order:
          </p>
          <ul className='text-xs sm:text-sm space-y-2 text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed'>
            <li><strong>Delivery Riders:</strong> Receive only your delivery address, name, phone number, and delivery instructions for active orders.</li>
            <li><strong>Payment Gateways (Razorpay / UPI):</strong> Handle payment processing securely under PCI-DSS compliance. Snapit never stores card numbers or CVVs.</li>
            <li><strong>Firebase / Cloud Services:</strong> Cloud messaging tokens to deliver order notifications.</li>
          </ul>
        </div>

        {/* Section 5 */}
        <div className='p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3'>
          <h2 className='text-base font-bold text-slate-900 dark:text-white flex items-center gap-2'>
            <span className='w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-center font-black'>5</span>
            Security &amp; Data Protection
          </h2>
          <div className='flex items-start gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed'>
            <FaLock className='text-emerald-500 text-lg flex-shrink-0 mt-1' />
            <p>
              We implement industry-standard encryption (TLS/HTTPS), encrypted database storage, strict JWT session authentication, and role-based access control to protect your data against unauthorized access, alteration, or disclosure.
            </p>
          </div>
        </div>

        {/* Section 6 */}
        <div className='p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3'>
          <h2 className='text-base font-bold text-slate-900 dark:text-white flex items-center gap-2'>
            <span className='w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-center font-black'>6</span>
            Your Rights &amp; Account Deletion
          </h2>
          <div className='flex items-start gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed'>
            <FaUserSecret className='text-blue-500 text-lg flex-shrink-0 mt-1' />
            <p>
              You have the right to view, update, or request the deletion of your account and personal information at any time. You can manage your saved addresses and profile from the app or request data deletion by contacting us at <strong>snapitxpress@gmail.com</strong>.
            </p>
          </div>
        </div>

        {/* Section 7 */}
        <div className='p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3'>
          <h2 className='text-base font-bold text-slate-900 dark:text-white flex items-center gap-2'>
            <span className='w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-center font-black'>7</span>
            Contact Us
          </h2>
          <div className='flex items-start gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed'>
            <FaEnvelope className='text-amber-500 text-lg flex-shrink-0 mt-1' />
            <div>
              <p>For questions or concerns regarding this Privacy Policy:</p>
              <p className='mt-1 font-semibold text-slate-800 dark:text-slate-100'>Snapit Technologies</p>
              <p>Paliganj, Patna, Bihar — 801110</p>
              <p className='text-amber-600 dark:text-amber-400 font-medium'>Email: snapitxpress@gmail.com</p>
              <p className='text-amber-600 dark:text-amber-400 font-medium'>Website: https://snapit.pages.dev</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy

