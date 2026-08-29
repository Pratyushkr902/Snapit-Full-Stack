import React from 'react'
import { useNavigate } from 'react-router-dom'
import { IoArrowBack, IoMegaphone } from 'react-icons/io5'
import AdminMarketingHub from '../components/AdminMarketingHub'
import AdminPermision from '../layouts/AdminPermision'

const MarketingHubPage = () => {
  const navigate = useNavigate()

  return (
    <AdminPermision>
      <div className='min-h-screen bg-slate-50/50 pt-safe pt-12 sm:pt-6 pb-24 px-3 sm:px-6 max-w-5xl mx-auto'>
        {/* Mobile-Friendly Top Navigation */}
        <div className='flex items-center gap-3 mb-4'>
          <button
            onClick={() => navigate(-1)}
            className='flex items-center justify-center w-9 h-9 bg-white border border-slate-200 rounded-xl shadow-xs text-slate-700 hover:bg-slate-100 active:scale-95 transition-all'
            aria-label="Back"
          >
            <IoArrowBack size={18} />
          </button>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-lg sm:text-2xl font-black text-slate-900 leading-tight'>
                Marketing & Push Command Center
              </h1>
            </div>
            <p className='text-[11px] sm:text-xs text-slate-500 font-medium'>
              Automated meal triggers, cart recovery & 1-click broadcasts
            </p>
          </div>
        </div>

        <AdminMarketingHub />
      </div>
    </AdminPermision>
  )
}

export default MarketingHubPage
