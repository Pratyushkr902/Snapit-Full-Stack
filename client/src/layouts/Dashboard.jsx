import React from 'react'
import UserMenu from '../components/UserMenu'
import { Outlet, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

const Dashboard = () => {
  const user = useSelector(state => state.user)

  // Wait for user to load — don't redirect while loading
  if (user?._id === '') {
    // User state is still initializing (empty string is default)
    // Show nothing briefly while auth loads
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin'></div>
      </div>
    )
  }

  return (
    <section className='bg-white'>
      <div className='container mx-auto p-3 grid lg:grid-cols-[250px,1fr]'>
        {/* Left sidebar — desktop only */}
        <div className='py-4 sticky top-24 max-h-[calc(100vh-96px)] overflow-y-auto hidden lg:block border-r'>
          <UserMenu />
        </div>
        {/* Right content */}
        <div className='bg-white min-h-[75vh]'>
          <Outlet />
        </div>
      </div>
    </section>
  )
}

export default Dashboard