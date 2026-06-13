import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import Divider from './Divider'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { logout } from '../store/userSlice'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import { HiOutlineExternalLink } from "react-icons/hi";

const UserMenu = ({close}) => {
   const user = useSelector((state) => state.user)
   const role = user?.role?.replace(/['"]/g, '').trim().toUpperCase()
   const dispatch = useDispatch()
   const navigate = useNavigate()

   const handleLogout = async () => {
        try {
          const response = await Axios({ ...SummaryApi.logout })
          if (response.data.success) {
            if (close) close()
            dispatch(logout())
            localStorage.clear()
            toast.success(response.data.message)
            navigate("/")
          }
        } catch (error) {
          AxiosToastError(error)
        }
   }

   const handleClose = () => {
      if (close) close()
   }

  return (
    <div>
        <div className='font-semibold'>My Account</div>
        <div className='text-sm flex items-center gap-2'>
          <span className='max-w-52 text-ellipsis line-clamp-1'>
            {user?.name || user?.mobile}
            <span className='ml-1 font-medium text-red-600'>
              {role === "ADMIN"        ? "(Admin)"      :
               role === "RIDER"        ? "(Rider)"      :
               role === "SELLER"       ? "(Seller)"     :
               role === "RESTO_SELLER" ? "(Restaurant)" : ""}
            </span>
          </span>
          <Link onClick={handleClose} to={"/dashboard/profile"} className='hover:text-primary-200'>
            <HiOutlineExternalLink size={15}/>
          </Link>
        </div>

        <Divider/>

        <div className='text-sm grid gap-1'>

            {/* ADMIN ONLY LINKS */}
            {role === "ADMIN" && (
              <>
                <Link onClick={handleClose} to={"/dashboard/admin-summary"} className='px-2 hover:bg-orange-200 py-1 font-bold text-secondary-100'>Admin Dashboard</Link>
                <Link onClick={handleClose} to={"/dashboard/category"} className='px-2 hover:bg-orange-200 py-1'>Category</Link>
                <Link onClick={handleClose} to={"/dashboard/subcategory"} className='px-2 hover:bg-orange-200 py-1'>Sub Category</Link>
                <Link onClick={handleClose} to={"/dashboard/upload-product"} className='px-2 hover:bg-orange-200 py-1'>Upload Product</Link>
                <Link onClick={handleClose} to={"/dashboard/product"} className='px-2 hover:bg-orange-200 py-1'>Product</Link>
                {/* Admin can also manage restaurants */}
                <Link onClick={handleClose} to={"/dashboard/restaurant-admin"}
                  className='px-2 bg-orange-50 hover:bg-orange-100 py-1 font-bold text-orange-700 border-l-4 border-orange-500'>
                  🍔 Restaurant Admin
                </Link>
              </>
            )}

            {/* RIDER ACCESS */}
            {(role === "RIDER" || role === "ADMIN") && (
              <Link onClick={handleClose} to={"/rider-panel"}
                className='px-2 bg-blue-50 hover:bg-blue-100 py-1 font-bold text-blue-700 border-l-4 border-blue-600 mb-1'>
                Rider Panel
              </Link>
            )}

            {/* SELLER ACCESS */}
            {(role === "SELLER" || role === "ADMIN") && (
              <Link onClick={handleClose} to={"/dashboard/seller-dashboard"}
                className='px-2 bg-orange-50 hover:bg-orange-100 py-1 font-bold text-orange-700 border-l-4 border-orange-600 mb-1'>
                🏪 Store Panel
              </Link>
            )}

            {/* RESTO SELLER ACCESS */}
            {role === "RESTO_SELLER" && (
              <Link onClick={handleClose} to={"/dashboard/resto-dashboard"}
                className='px-2 bg-red-50 hover:bg-red-100 py-1 font-bold text-red-700 border-l-4 border-red-500 mb-1'>
                🍽️ My Restaurant
              </Link>
            )}

            {/* COMMON LINKS */}
            <Link onClick={handleClose} to={"/dashboard/myorders"} className='px-2 hover:bg-orange-200 py-1'>My Orders</Link>
            <Link onClick={handleClose} to={"/wishlist"} className='px-2 hover:bg-red-50 py-1 flex items-center gap-1.5'>
              <span>❤️</span> My Wishlist
            </Link>
            <Link onClick={handleClose} to={"/dashboard/address"} className='px-2 hover:bg-orange-200 py-1'>Save Address</Link>

            <Divider/>

            <Link onClick={handleClose} to={"/snapit-plus"} className='px-2 hover:bg-green-50 py-1 flex items-center gap-2 font-semibold text-green-800'>
              <span>⭐</span>
              <div>
                <p className='leading-none'>Snapit Plus</p>
                <p className='text-[10px] text-gray-400 font-normal'>Membership & benefits</p>
              </div>
            </Link>
            <Link onClick={handleClose} to={"/streak"} className='px-2 hover:bg-orange-50 py-1 flex items-center gap-2 font-semibold text-orange-700'>
              <span>🔥</span>
              <div>
                <p className='leading-none'>Daily Streak</p>
                <p className='text-[10px] text-gray-400 font-normal'>Order daily, earn rewards</p>
              </div>
            </Link>
            <Link onClick={handleClose} to={"/subscriptions"} className='px-2 hover:bg-blue-50 py-1 flex items-center gap-2 font-semibold text-blue-700'>
              <span>📦</span>
              <div>
                <p className='leading-none'>My Subscriptions</p>
                <p className='text-[10px] text-gray-400 font-normal'>Manage recurring orders</p>
              </div>
            </Link>

            <Divider/>

            <a href="https://snapit.pages.dev/privacy-policy.html" target="_blank" rel="noreferrer"
              className='px-2 hover:bg-gray-100 py-1 flex items-center gap-1.5 text-gray-600'
              onClick={handleClose}>
              🔒 Privacy Policy
            </a>

            <button onClick={handleLogout} className='text-left px-2 hover:bg-orange-200 py-1'>Log Out</button>

        </div>
    </div>
  )
}

export default UserMenu