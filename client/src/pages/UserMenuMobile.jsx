import React, { useEffect } from 'react'
import UserMenu from '../components/UserMenu'
import { IoClose } from "react-icons/io5";
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const UserMenuMobile = () => {
  const user = useSelector(state => state.user)
  const navigate = useNavigate()

  useEffect(() => {
    // FAST CHECK: Check localStorage immediately
    const token = localStorage.getItem('accessToken') || localStorage.getItem('accesstoken')
    
    if (!token) {
      // Only redirect if there is absolutely no token
      navigate("/login")
    }
  }, [navigate])

  // If user state is still loading but token exists, we still show the menu
  // rather than redirecting to login.
  return (
    <section className='bg-white h-full w-full py-2'>
        <button 
          onClick={() => window.history.back()} 
          className='text-neutral-800 block w-fit ml-auto p-4 active:scale-95 transition-transform'
        >
          <IoClose size={25}/>
        </button>
        
        <div className='container mx-auto px-3 pb-8'>
           {/* If user is still loading, you could show a small spinner here, 
               but UserMenu usually handles its own internal state */}
           <UserMenu />
        </div>
    </section>
  )
}

export default UserMenuMobile