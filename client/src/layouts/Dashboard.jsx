import React, { useEffect, useState } from 'react'
import UserMenu from '../components/UserMenu'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'

const Dashboard = () => {
  const user = useSelector(state => state.user)
  const navigate = useNavigate()
  const location = useLocation()
  const [isAuthChecking, setIsAuthChecking] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('accesstoken')

    if (!token) {
      navigate("/login", { state: { from: location } })
      return
    }

    if (user?._id) {
      setIsAuthChecking(false)
      return
    }

    const timeout = setTimeout(() => {
      setIsAuthChecking(false)
    }, 3000)

    return () => clearTimeout(timeout)
  }, [user?._id])

  useEffect(() => {
    if (user?._id) {
      setIsAuthChecking(false)
    }
  }, [user?._id])

  if (isAuthChecking) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-white'>
        <div className='flex flex-col items-center gap-4'>
          <div className='w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin'></div>
          <p className='text-emerald-700 font-bold animate-pulse'>Syncing Snapit Account...</p>
        </div>
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