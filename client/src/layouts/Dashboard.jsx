import React from 'react'
import UserMenu from '../components/UserMenu'
import UserMenuMobile from '../components/UserMenuMobile'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'

const Dashboard = () => {
  const user = useSelector(state => state.user)
  const location = useLocation()

  // FIX: standardized to single key — matches the token helper in SummaryApi.js
  const token = localStorage.getItem('accessToken')

  // No token — redirect to login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // These routes need full-screen layout — no sidebar, no container padding
  const isFullScreen =
    location.pathname.includes('seller-dashboard') ||
    location.pathname.includes('rider-panel')      ||
    location.pathname.includes('resto-dashboard')

  if (isFullScreen) {
    return <Outlet />
  }

  return (
    <section className='bg-white'>
      <div className='container mx-auto p-3 grid lg:grid-cols-[250px,1fr]'>

        {/* Desktop sidebar */}
        <div className='py-4 sticky top-24 max-h-[calc(100vh-96px)] overflow-y-auto hidden lg:block border-r'>
          <UserMenu />
        </div>

        {/* Mobile nav — visible only below lg, sits above the page content */}
        <div className='lg:hidden border-b pb-3 mb-3'>
          <UserMenuMobile />
        </div>

        <div className='bg-white min-h-[75vh]'>
          <Outlet />
        </div>

      </div>
    </section>
  )
}

export default Dashboard