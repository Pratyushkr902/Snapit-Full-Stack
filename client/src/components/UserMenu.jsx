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
import isAdmin from '../utils/isAdmin'

const UserMenu = ({close}) => {
   const user = useSelector((state)=> state.user)
   const dispatch = useDispatch()
   const navigate = useNavigate()

   const handleLogout = async()=>{
        try {
          const response = await Axios({
             ...SummaryApi.logout
          })
          if(response.data.success){
            if(close){
              close()
            }
            dispatch(logout())
            localStorage.clear()
            toast.success(response.data.message)
            navigate("/")
          }
        } catch (error) {
          AxiosToastError(error)
        }
   }

   const handleClose = ()=>{
      if(close){
        close()
      }
   }
  return (
    <div>
        <div className='font-semibold'>My Account</div>
        <div className='text-sm flex items-center gap-2'>
          <span className='max-w-52 text-ellipsis line-clamp-1'>
            {user?.name || user?.mobile} 
            <span className='ml-1 font-medium text-red-600'>
                {user?.role === "ADMIN" ? "(Admin)" : user?.role === "RIDER" ? "(Rider)" : user?.role === "SELLER" ? "(Seller)" : "" }
            </span>
          </span>
          <Link onClick={handleClose} to={"/dashboard/profile"} className='hover:text-primary-200'>
            <HiOutlineExternalLink size={15}/>
          </Link>
        </div>

        <Divider/>

        <div className='text-sm grid gap-1'>
            {/* ADMIN ONLY LINKS */}
            {
              user?.role === "ADMIN" && (
                <>
                  <Link onClick={handleClose} to={"/dashboard/admin-summary"} className='px-2 hover:bg-orange-200 py-1 font-bold text-secondary-100'>Admin Dashboard</Link>
                  <Link onClick={handleClose} to={"/dashboard/category"} className='px-2 hover:bg-orange-200 py-1'>Category</Link>
                  <Link onClick={handleClose} to={"/dashboard/subcategory"} className='px-2 hover:bg-orange-200 py-1'>Sub Category</Link>
                  <Link onClick={handleClose} to={"/dashboard/upload-product"} className='px-2 hover:bg-orange-200 py-1'>Upload Product</Link>
                  <Link onClick={handleClose} to={"/dashboard/product"} className='px-2 hover:bg-orange-200 py-1'>Product</Link>
                </>
              )
            }

            {/* RIDER ACCESS: Only Riders and Admins can see this */}
            {
              (user?.role === "RIDER" || user?.role === "ADMIN") && (
                <Link 
                  onClick={handleClose} 
                  to={"/rider-panel"} 
                  className='px-2 bg-blue-50 hover:bg-blue-100 py-1 font-bold text-blue-700 border-l-4 border-blue-600 mb-1'
                >
                  Rider Panel
                </Link>
              )
            }

            {/* SELLER ACCESS: Only Sellers and Admins can see this */}
            {
              (user?.role === "SELLER" || user?.role === "ADMIN") && (
                <Link 
                  onClick={handleClose} 
                  to={"/dashboard/store-orders"} 
                  className='px-2 bg-orange-50 hover:bg-orange-100 py-1 font-bold text-orange-700 border-l-4 border-orange-600 mb-1'
                >
                  Store Orders (Pack Items)
                </Link>
              )
            }

            {/* COMMON LINKS FOR ALL LOGGED IN USERS */}
            <Link onClick={handleClose} to={"/dashboard/myorders"} className='px-2 hover:bg-orange-200 py-1'>My Orders</Link>
            <Link onClick={handleClose} to={"/dashboard/address"} className='px-2 hover:bg-orange-200 py-1'>Save Address</Link>
            <button onClick={handleLogout} className='text-left px-2 hover:bg-orange-200 py-1'>Log Out</button>

        </div>
    </div>
  )
}

export default UserMenu