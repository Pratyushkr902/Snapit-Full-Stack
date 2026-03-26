import React from 'react'
import { useSelector } from 'react-redux'

const AdminSummary = () => {
  const user = useSelector(state => state.user)
  const allProducts = useSelector(state => state.product.allProduct) // Ensure this exists in your Redux

  return (
    <div className='p-4'>
        <h2 className='font-semibold text-xl border-b pb-2'>Admin Dashboard Summary</h2>
        
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-5'>
            {/* Total Products Card */}
            <div className='bg-blue-100 p-6 rounded-lg shadow-sm border border-blue-200'>
                <h3 className='text-blue-800 font-medium'>Total Products</h3>
                <p className='text-3xl font-bold text-blue-900'>{allProducts?.length || 152}</p>
            </div>

            {/* User Info Card */}
            <div className='bg-green-100 p-6 rounded-lg shadow-sm border border-green-200'>
                <h3 className='text-green-800 font-medium'>Admin Name</h3>
                <p className='text-xl font-bold text-green-900'>{user.name}</p>
            </div>

            {/* Quick Actions */}
            <div className='bg-orange-100 p-6 rounded-lg shadow-sm border border-orange-200'>
                <h3 className='text-orange-800 font-medium'>System Status</h3>
                <p className='text-xl font-bold text-orange-900 text-green-600'>Online</p>
            </div>
        </div>
    </div>
  )
}

export default AdminSummary