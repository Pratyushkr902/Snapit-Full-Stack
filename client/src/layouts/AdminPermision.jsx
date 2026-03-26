import React from 'react'
import { useSelector } from 'react-redux'
import isAdmin from '../utils/isAdmin'

const AdminPermision = ({children}) => {
    const user = useSelector(state => state.user)

    // DEBUG: Check what role Redux actually sees
    // console.log("Current User Role:", user.role)

  return (
    <>
        {
            isAdmin(user?.role) ? (
                children 
            ) : (
                <div className='flex flex-col items-center justify-center h-full min-h-[200px]'>
                     <p className='text-red-600 bg-red-100 p-4 rounded border border-red-200'>
                        ⚠️ Access Denied: You do not have permission to view Admin Tools.
                     </p>
                </div>
            )
        }
    </>
  )
}

export default AdminPermision