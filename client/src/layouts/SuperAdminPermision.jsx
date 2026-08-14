/* eslint-disable react/prop-types */
import { useSelector } from 'react-redux'

const SuperAdminPermision = ({ children }) => {
    const user = useSelector(state => state.user)
    const role = user?.role?.replace(/['"]/g, '').trim().toUpperCase()
    const hasAccess = role === 'SUPER_ADMIN'

    return (
        <>
            {hasAccess ? (
                children
            ) : (
                <div className='flex flex-col items-center justify-center h-full min-h-[300px] gap-2'>
                    <span style={{ fontSize: 40 }}>🔒</span>
                    <p className='text-red-600 bg-red-100 p-4 rounded border border-red-200 font-bold text-center'>
                        ⚠️ Access Denied: This section is restricted to Super Admins only.
                    </p>
                </div>
            )}
        </>
    )
}

export default SuperAdminPermision
