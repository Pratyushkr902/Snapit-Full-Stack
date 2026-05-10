import React, { useEffect, useState } from 'react'
import UserMenu from '../components/UserMenu'
import { Outlet, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

const Dashboard = () => {
  const user = useSelector(state => state.user)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('accesstoken')
    
    // 1. If no token exists at all, go to login
    if (!token) {
      navigate("/login")
      return
    }

    // 2. If token exists, wait for user state to hydrate
    if (user?._id) {
      setLoading(false)
    } else {
      // Small timeout to prevent infinite spin if fetching fails
      const timeout = setTimeout(() => setLoading(false), 2000)
      return () => clearTimeout(timeout)
    }
  }, [user?._id, navigate])

  if (loading && !user?._id) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-white'>
        <div className='w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin'></div>
      </div>
    )
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