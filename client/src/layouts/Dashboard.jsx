import React, { useEffect, useState } from 'react'
import UserMenu from '../components/UserMenu'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'

const Dashboard = () => {
  const user = useSelector(state => state.user)
  const navigate = useNavigate()
  const location = useLocation()
  const token = localStorage.getItem('accessToken') || localStorage.getItem('accesstoken')

  // No token at all — redirect immediately without waiting
  if (!token) {
    navigate("/login", { state: { from: location } })
    return null
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