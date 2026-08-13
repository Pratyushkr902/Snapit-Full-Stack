import React from 'react'
import { useSelector } from 'react-redux'
const SellerPermission = ({ children }) => {
    const user = useSelector(state => state.user)
    const role = user?.role
    // ✅ RESTO_SELLER included so accounts operating both a grocery store
    // and a restaurant (e.g. Monginis) can access the grocery dashboard too.
    const hasAccess = role === 'SELLER' || role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'RESTO_SELLER'
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
export default SellerPermission
