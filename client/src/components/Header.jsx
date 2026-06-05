import React, { useState, useEffect } from 'react'
import logo from '../assets/snapit.png'
import Search from './Search'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FaRegCircleUser } from "react-icons/fa6";
import useMobile from '../hooks/useMobile';
import { BsCart4 } from "react-icons/bs";
import { useSelector } from 'react-redux';
import { GoTriangleDown, GoTriangleUp } from "react-icons/go";
import UserMenu from './UserMenu';
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees';
import { useGlobalContext } from '../provider/GlobalProvider';


const Header = ({ openCart }) => {
    const [isMobile] = useMobile()
    const location = useLocation()
    const isSearchPage = location.pathname === "/search"
    const navigate = useNavigate()
    const user = useSelector((state) => state?.user)
    const [openUserMenu, setOpenUserMenu] = useState(false)
    const cartItem = useSelector(state => state.cartItem.cart)
    
    const { totalPrice, totalQty, fetchUser, fetchAddress } = useGlobalContext()

    const addressList = useSelector(state => state.addresses.addressList)
    const primaryAddress = addressList?.[0]?.address_line || "Select Address"

    useEffect(() => {
        if (user?._id) {
            if (fetchUser) fetchUser();
            if (fetchAddress) fetchAddress();
        }
    }, [user?._id])

    const redirectToLoginPage = () => {
        navigate("/login")
    }

    const handleCloseUserMenu = () => {
        setOpenUserMenu(false)
    }

    const handleMobileUser = () => {
        if (!user?._id) {
            navigate("/login")
            return
        }
        navigate("/user")
    }

    return (
        <header className='lg:h-24 lg:shadow-md sticky top-0 z-40 flex flex-col justify-center gap-1 bg-white shadow-sm'>

            {
                !(isSearchPage && isMobile) && (
                    <div className='container mx-auto flex flex-col lg:flex-row items-center px-3 pt-2 pb-0 lg:py-2 lg:justify-between gap-2 lg:gap-4'>
                        
                        {/* ── Top row: logo + delivery + mobile actions ── */}
                        <div className='flex items-center justify-between w-full lg:w-auto gap-2'>
                            <div className='flex items-center gap-2 min-w-0'>
                                {/* Logo — fixed width so search can never overlap it */}
                                <Link to={"/"} className='flex-shrink-0 flex justify-center items-center'>
                                    <img
                                        src={logo}
                                        alt='logo'
                                        className='hidden lg:block w-36 h-auto object-contain drop-shadow-sm hover:scale-105 transition-transform'
                                    />
                                    <img
                                        src={logo}
                                        alt='logo'
                                        className='lg:hidden w-24 h-auto object-contain flex-shrink-0'
                                    />
                                </Link>

                                {/* Desktop delivery info */}
                                <div className='hidden lg:flex flex-col justify-center border-l-2 pl-3 border-slate-100 h-10'>
                                    <div className='flex items-center gap-1 leading-none'>
                                        <h2 className='font-black text-slate-900 text-[13px] lg:text-[15px] uppercase tracking-tighter'>
                                            Delivery in <span className='text-yellow-500 animate-pulse'>10 MINS</span>
                                        </h2>
                                        <span className='text-base lg:text-lg'>⚡</span>
                                    </div>
                                    <div className='flex items-center gap-0.5 text-[10px] lg:text-xs text-slate-500 font-semibold cursor-pointer truncate max-w-[120px] lg:max-w-[150px]'>
                                        <span className='truncate'>📍 {primaryAddress}</span>
                                        <GoTriangleDown size={12} />
                                    </div>
                                </div>

                                {/* Mobile delivery info — truncates cleanly */}
                                <div className='flex lg:hidden flex-col justify-center border-l-2 pl-2 border-slate-100 h-10 min-w-0'>
                                    <div className='flex items-center gap-0.5 leading-none'>
                                        <h2 className='font-black text-slate-900 text-[12px] uppercase tracking-tighter whitespace-nowrap'>
                                            in <span className='text-yellow-500 animate-pulse'>9 MINS</span>
                                        </h2>
                                        <span className='text-sm'>⚡</span>
                                    </div>
                                    <div className='flex items-center gap-0.5 text-[10px] text-slate-500 font-semibold cursor-pointer min-w-0'>
                                        <span className='truncate max-w-[80px]'>📍 {primaryAddress}</span>
                                        <GoTriangleDown size={10} className='flex-shrink-0' />
                                    </div>
                                </div>
                            </div>

                            {/* Mobile: user + cart icons — pushed to right */}
                            <div className='flex items-center gap-4 lg:hidden flex-shrink-0'>
                                <button className='text-neutral-600 active:scale-90 transition-transform' onClick={handleMobileUser}>
                                    <FaRegCircleUser size={22} />
                                </button>
                                <button onClick={openCart} className='relative text-green-700 active:scale-90 transition-transform'>
                                    <BsCart4 size={22} />
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
                        <div className='hidden lg:flex items-center gap-8 flex-shrink-0'>

                            {user?._id && (
                                <div className='flex items-center gap-2'>
                                    <Link
                                        to="/snapit-plus"
                                        className='flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 hover:bg-green-100 transition-all text-sm font-bold text-green-800 active:scale-95'
                                    >
                                        ⭐ Plus
                                    </Link>
                                    <Link
                                        to="/streak"
                                        className='flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 hover:bg-orange-100 transition-all text-sm font-bold text-orange-700 active:scale-95'
                                    >
                                        🔥 Streak
                                    </Link>
                                </div>
                            )}

                            {user?._id && (
                                <Link to="/wallet" className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 hover:bg-slate-100 transition-all group shadow-sm active:scale-95">
                                    <span className='text-xl group-hover:scale-110 transition-transform'>💰</span>
                                    <div className='flex flex-col'>
                                        <span className='font-black text-slate-700 text-[10px] uppercase leading-none'>Balance</span>
                                        <span className='font-bold text-green-700 text-sm'>{DisplayPriceInRupees(user?.walletBalance || 0)}</span>
                                    </div>
                                </Link>
                            )}

                            {
                                user?._id ? (
                                    <div className='relative'>
                                        <div onClick={() => setOpenUserMenu(preve => !preve)} className='flex select-none items-center gap-1 cursor-pointer group'>
                                            <p className='font-bold text-slate-700 group-hover:text-green-700 transition-colors'>Account</p>
                                            {openUserMenu ? <GoTriangleUp size={22} /> : <GoTriangleDown size={22} />}
                                        </div>
                                        {openUserMenu && (
                                            <div className='absolute right-0 top-12 z-50'>
                                                <div className='bg-white rounded-xl p-4 min-w-52 shadow-2xl border border-slate-100'>
                                                    <UserMenu close={handleCloseUserMenu} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button onClick={redirectToLoginPage} className='text-lg px-2 font-bold text-slate-700 hover:text-green-700 transition-colors'>Login</button>
                                )
                            }

                            <button onClick={openCart} className='flex items-center gap-3 bg-green-700 hover:bg-green-800 px-5 py-2.5 rounded-xl text-white shadow-lg active:scale-95 transition-all'>
                                <BsCart4 size={24} className={totalQty > 0 ? 'animate-bounce' : ''} />
                                <div className='font-bold text-sm text-left leading-tight'>
                                    {totalQty > 0 ? (
                                        <div>
                                            <p>{totalQty} Items</p>
                                            <p className='text-[11px] font-medium opacity-90'>{DisplayPriceInRupees(totalPrice)}</p>
                                        </div>
                                    ) : <p>My Cart</p>}
                                </div>
                            </button>
                        </div>
                    </div>
                )
            }

            {/* ── Mobile search row — full width, properly separated ── */}
            <div className='container mx-auto px-3 pb-2 lg:hidden'>
                <Search />
            </div>

        </header>
    )
}

export default Header