import React from 'react'
import { useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import isAdmin from '../utils/isAdmin'

const AdminPermision = ({ children }) => {
    const user = useSelector(state => state.user)
    const location = useLocation()
    const role = user?.role?.replace(/['"]/g, '').trim().toUpperCase()

    // SELLER gets access to store-orders only
    const isSellerRoute = location.pathname.includes('/dashboard/store-orders')
    const isSeller = role === 'SELLER'

    // RIDER gets access to rider-panel only
    const isRiderRoute = location.pathname.includes('/rider-panel')
    const isRider = role === 'RIDER'

    // RESTO_SELLER gets access to resto-dashboard only
    const isRestoSellerRoute = location.pathname.includes('/dashboard/resto-dashboard')
    const isRestoSeller = role === 'RESTO_SELLER'

    const hasAccess = isAdmin(user?.role)
        || (isSeller      && isSellerRoute)
        || (isRider       && isRiderRoute)
        || (isRestoSeller && isRestoSellerRoute)

    return (
        <>
            {hasAccess ? (
                children
            ) : (
                <div className='flex flex-col items-center justify-center h-full min-h-[200px]'>
                    <p className='text-red-600 bg-red-100 p-4 rounded border border-red-200'>
                        ⚠️ Access Denied: You do not have permission to view this page.
                    </p>
                </div>
            )}
        </>
    )
}

export default AdminPermision