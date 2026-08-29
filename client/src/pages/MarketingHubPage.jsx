import React from 'react'
import { useNavigate } from 'react-router-dom'
import { IoArrowBack } from 'react-icons/io5'
import AdminMarketingHub from '../components/AdminMarketingHub'
import AdminPermision from '../layouts/AdminPermision'

const MarketingHubPage = () => {
  const navigate = useNavigate()

  return (
    <AdminPermision>
      <div className='p-4 md:p-6 max-w-5xl mx-auto'>
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className='flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800 mb-4 transition-colors font-semibold'
        >
          <IoArrowBack size={18} />
          <span>Back</span>
        </button>

        <div className='mb-4'>
          <h1 className='text-2xl font-black text-slate-900'>
            📢 Marketing & Notification Command Center
          </h1>
          <p className='text-xs text-slate-500 mt-1 font-medium'>
            Automated meal-time triggers, smart cart recovery & instant all-user push broadcast
          </p>
        </div>

        <AdminMarketingHub />
      </div>
    </AdminPermision>
  )
}

export default MarketingHubPage
