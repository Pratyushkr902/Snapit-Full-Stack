import React, { useState } from 'react'
import logo from '../assets/snapit.png'
import Search from './Search'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FaRegCircleUser } from "react-icons/fa6"
import useMobile from '../hooks/useMobile'
import { BsCart4 } from "react-icons/bs"
import { useSelector } from 'react-redux'
import { GoTriangleUp } from "react-icons/go"
import UserMenu from './UserMenu'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { useGlobalContext } from '../provider/GlobalProvider'



const Header = ({ openCart }) => {
  const [isMobile] = useMobile()
  const location = useLocation()
  const isSearchPage = location.pathname === "/search"
  const navigate = useNavigate()
  const user = useSelector((state) => state?.user)
  const [openUserMenu, setOpenUserMenu] = useState(false)

  const { totalPrice, totalQty } = useGlobalContext()

  const handleMobileUser = () => {
    navigate(user?._id ? "/user" : "/login")
  }

  return (
    <header className='lg:h-24 lg:shadow-md sticky top-0 z-40 flex flex-col justify-center gap-1 bg-white shadow-sm'>
      {!(isSearchPage && isMobile) && (
        <div className='container mx-auto flex flex-col lg:flex-row items-center px-3 py-2 lg:justify-between gap-2 lg:gap-4'>

          <div className='flex items-center justify-between w-full lg:w-auto gap-4'>
            <div className='flex items-center gap-2'>
              {/* Logo */}
              <Link to="/" className='h-full flex justify-center items-center shrink-0'>
                <img
                  src={logo}
                  alt='Snapit'
                  // ─── IMPROVED: Single img tag with responsive classes ─────
                  className='w-24 lg:w-36 h-auto object-contain hover:scale-105 transition-transform'
                />
              </Link>


            </div>

            {/* Mobile right actions */}
            <div className='flex items-center gap-5 lg:hidden'>
              <button
                className='text-neutral-600 active:scale-90 transition-transform'
                onClick={handleMobileUser}
                aria-label="Account"
              >
                <FaRegCircleUser size={24} />
              </button>
              <button
                onClick={openCart}
                className='relative text-green-700 active:scale-90 transition-transform'
                aria-label={`Cart, ${totalQty} items`}
              >
                <BsCart4 size={24} />
                {totalQty > 0 && (
                  <span className='absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 rounded-full ring-2 ring-white'>
                    {totalQty}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Desktop search */}
          <div className='hidden lg:block w-full max-w-xl'>
            <Search />
          </div>

          {/* Desktop right actions */}
          <div className='hidden lg:flex items-center gap-6 flex-shrink-0'>
            {user?._id && (
              <Link
                to="/wallet"
                className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 hover:bg-slate-100 transition-all group shadow-sm active:scale-95"
              >
                <span className='text-xl group-hover:scale-110 transition-transform'>💰</span>
                <div className='flex flex-col'>
                  <span className='font-black text-slate-700 text-[10px] uppercase leading-none'>Balance</span>
                  <span className='font-bold text-green-700 text-sm'>{DisplayPriceInRupees(user?.walletBalance || 0)}</span>
                </div>
              </Link>
            )}

            {user?._id ? (
              <div className='relative'>
                <div
                  onClick={() => setOpenUserMenu(p => !p)}
                  className='flex select-none items-center gap-1 cursor-pointer group'
                >
                  <p className='font-bold text-slate-700 group-hover:text-green-700 transition-colors'>Account</p>
                  {openUserMenu ? <GoTriangleUp size={22} /> : <GoTriangleDown size={22} />}
                </div>
                {openUserMenu && (
                  <div className='absolute right-0 top-12 z-50'>
                    <div className='bg-white rounded-xl p-4 min-w-52 shadow-2xl border border-slate-100'>
                      <UserMenu close={() => setOpenUserMenu(false)} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className='text-lg px-2 font-bold text-slate-700 hover:text-green-700 transition-colors'
              >
                Login
              </button>
            )}

            <button
              onClick={openCart}
              className='flex items-center gap-3 bg-green-700 hover:bg-green-800 px-5 py-2.5 rounded-xl text-white shadow-lg active:scale-95 transition-all'
              aria-label="Open cart"
            >
              <BsCart4 size={24} className={totalQty > 0 ? 'animate-bounce' : ''} />
              <div className='font-bold text-sm text-left leading-tight'>
                {totalQty > 0 ? (
                  <div>
                    <p>{totalQty} Items</p>
                    <p className='text-[11px] font-medium opacity-90'>{DisplayPriceInRupees(totalPrice)}</p>
                  </div>
                ) : (
                  <p>My Cart</p>
                )}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Mobile search */}
      <div className='container mx-auto px-3 lg:hidden pb-2'>
        <Search />
      </div>
    </header>
  )
}

export default Header