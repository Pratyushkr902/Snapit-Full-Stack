import React, { useEffect, useState } from 'react'
import UserMenu from '../components/UserMenu'
import { Outlet, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

const Dashboard = () => {
  const user = useSelector(state => state.user)
  const navigate = useNavigate()
  // Start with loading true to prevent "flash" of login screen
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('accesstoken')
    
    // 1. STRIKE ONE: No token means definitely not logged in.
    if (!token) {
      console.log("No token found, redirecting to login...")
      navigate("/login")
      return
    }

    // 2. TOKEN EXISTS: Even if user._id isn't here yet, we STAY on the page.
    // We only stop the loading spinner once the user object arrives.
    if (user?._id) {
      setLoading(false)
    } else {
      // Safety: If after 4 seconds the user state still hasn't loaded 
      // but the token exists, we show the page anyway to let GlobalProvider 
      // retries happen, or handle the error gracefully.
      const timeout = setTimeout(() => {
        setLoading(false)
      }, 4000)
      return () => clearTimeout(timeout)
    }
  }, [user?._id, navigate])

  // Show spinner ONLY while we are waiting for the very first user load
  if (loading && !user?._id) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center bg-white gap-4'>
        <div className='w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin'></div>
        <p className='text-slate-500 font-medium animate-pulse'>Loading your dashboard...</p>
      </div>
    )
  }

  return (
    <section className='bg-white'>
      <div className='container mx-auto p-3 grid lg:grid-cols-[250px,1fr]'>
        {/* Sidebar - Hidden on mobile, visible on Large screens */}
        <div className='py-4 sticky top-24 max-h-[calc(100vh-96px)] overflow-y-auto hidden lg:block border-r'>
          <UserMenu />
        </div>
        
        {/* Main Content Area */}
        <div className='bg-white min-h-[75vh]'>
          <Outlet />
        </div>
      </div>
    </section>
  )
}

export default Dashboard