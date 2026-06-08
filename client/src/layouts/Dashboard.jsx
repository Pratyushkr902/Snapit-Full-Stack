import React from 'react'
import UserMenu from '../components/UserMenu'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'

const Dashboard = () => {
  const user = useSelector(state => state.user)
  const location = useLocation()
  const token = localStorage.getItem('accessToken') || localStorage.getItem('accesstoken')

  // No token — redirect to login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // ✅ FIX: These routes need full-screen layout — no sidebar, no container padding
  const isFullScreen = location.pathname.includes('seller-dashboard') || 
                       location.pathname.includes('rider-panel')

  if (isFullScreen) {
    return <Outlet />
  }

  return (
    <section className='bg-white'>
      <div className='container mx-auto p-3 grid lg:grid-cols-[250px,1fr]'>
        <div className='py-4 sticky top-24 max-h-[calc(100vh-96px)] overflow-y-auto hidden lg:block border-r'>
          <UserMenu />
        </div>
        <div className='bg-white min-h-[75vh]'>
          <Outlet />
        </div>
      </div>
    </section>
  )
}

export default Dashboard