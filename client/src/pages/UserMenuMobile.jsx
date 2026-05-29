import React from 'react'
import { Link } from 'react-router-dom'

const UserMenuMobile = () => {
  return (
    <>
      <Link
        to="/snapit-plus"
        className='flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-green-50 transition-colors group'
      >
        <span className='text-xl'>⭐</span>
        <div>
          <p className='font-semibold text-gray-800 text-sm'>Snapit Plus</p>
          <p className='text-xs text-gray-400'>Membership & benefits</p>
        </div>
      </Link>

      <Link
        to="/streak"
        className='flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-orange-50 transition-colors group'
      >
        <span className='text-xl'>🔥</span>
        <div>
          <p className='font-semibold text-gray-800 text-sm'>Daily Streak</p>
          <p className='text-xs text-gray-400'>Order daily, earn rewards</p>
        </div>
      </Link>

      <Link
        to="/subscriptions"
        className='flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors group'
      >
        <span className='text-xl'>📦</span>
        <div>
          <p className='font-semibold text-gray-800 text-sm'>My Subscriptions</p>
          <p className='text-xs text-gray-400'>Manage recurring orders</p>
        </div>
      </Link>
    </>
  )
}

export default UserMenuMobile  // ← this is what was missing