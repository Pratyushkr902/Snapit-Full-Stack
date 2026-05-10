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
    const checkAuth = () => {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('accesstoken')
      
      if (!token) {
        navigate("/login", { state: { from: location } })
        return
      }

      // If token exists, we give the app 5 seconds to load the user profile
      // If it doesn't load by then, we assume the token is invalid/expired
      if (user?._id) {
        setIsAuthChecking(false)
      }
    }

    checkAuth()

    const timeout = setTimeout(() => {
      if (!user?._id) {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('accesstoken')
        if (!token) navigate("/login")
        else setIsAuthChecking(false) // Let the page render anyway
      }
    }, 5000)

    return () => clearTimeout(timeout)
  }, [user?._id, navigate, location])

  if (isAuthChecking && !user?._id) {
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