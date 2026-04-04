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
        <header className='h-28 lg:h-20 sticky top-0 z-40 flex flex-col justify-center bg-white shadow-sm border-b border-slate-100 overflow-hidden'>
            {
                !(isSearchPage && isMobile) && (
                    <div className='container mx-auto flex flex-col lg:flex-row items-center px-3 py-1 lg:justify-between gap-2 lg:gap-6'>
                        
                        {/* LEFT SECTION: LOGO & ADDRESS */}
                        <div className='flex items-center justify-between w-full lg:w-auto gap-4'>
                            <div className='flex items-center gap-2 lg:gap-6'>
                                <Link to={"/"} className='h-full flex justify-center items-center shrink-0'>
                                    <img
                                        src={logo}
                                        alt='logo'
                                        className='hidden lg:block w-32 h-auto object-contain drop-shadow-sm hover:scale-105 transition-transform duration-300'
                                    />
                                    <img
                                        src={logo}
                                        alt='logo'
                                        className='lg:hidden w-24 h-auto object-contain'
                                    />
                                </Link>

                                <div className='flex flex-col justify-center border-l-2 pl-3 border-slate-100 h-10'>
                                    <div className='flex items-center gap-1 leading-none'>
                                        <h2 className='font-black text-slate-900 text-[12px] lg:text-[14px] uppercase tracking-tighter'>
                                            Delivery in <span className='text-yellow-500'>9 MINS</span>
                                        </h2>
                                        <span className='text-sm animate-bounce'>⚡</span>
                                    </div>
                                    <div className='flex items-center gap-0.5 text-[10px] lg:text-xs text-slate-500 font-bold cursor-pointer hover:text-green-700 transition-colors'>
                                        <span className='truncate max-w-[100px] lg:max-w-[150px]'>{primaryAddress}</span>
                                        <GoTriangleDown size={12} />
                                    </div>
                                </div>
                            </div>

                            {/* MOBILE ACTIONS */}
                            <div className='flex items-center gap-3 lg:hidden'>
                                {user?._id && (
                                    <Link to="/wallet" className='flex items-center bg-green-50 px-2 py-1 rounded-lg border border-green-100 active:scale-90 transition-transform'>
                                        <span className='text-[10px] font-black text-green-700 mr-0.5'>₹</span>
                                        <span className='text-xs font-bold text-green-700'>{user?.walletBalance || 0}</span>
                                    </Link>
                                )}
                                <button className='text-slate-600 active:scale-90 transition-transform' onClick={handleMobileUser}>
                                    <FaRegCircleUser size={22} />
                                </button>
                                <button onClick={openCart} className='relative text-green-700 active:scale-90 transition-transform'>
                                    <BsCart4 size={22} />
                                    {totalQty > 0 && (
                                        <span className='absolute -top-2 -right-2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-white'>
                                            {totalQty}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* DESKTOP SEARCH BAR */}
                        <div className='hidden lg:block w-full max-w-md xl:max-w-lg'>
                            <Search />
                        </div>

                        {/* DESKTOP ACTIONS */}
                        <div className='hidden lg:flex items-center gap-6 flex-shrink-0'>
                            {
                                user?._id && (
                                    <Link to="/wallet" className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 hover:bg-green-50 hover:border-green-100 transition-all group active:scale-95">
                                        <span className='text-xl group-hover:rotate-12 transition-transform'>💰</span>
                                        <div className='flex flex-col'>
                                            <span className='font-black text-slate-500 text-[9px] uppercase leading-none'>Wallet</span>
                                            <span className='font-black text-green-700 text-sm'>{DisplayPriceInRupees(user?.walletBalance || 0)}</span>
                                        </div>
                                    </Link>
                                )
                            }

                            {
                                user?._id ? (
                                    <div className='relative'>
                                        <div onClick={() => setOpenUserMenu(preve => !preve)} className='flex select-none items-center gap-1 cursor-pointer group'>
                                            <p className='font-bold text-slate-700 group-hover:text-green-700 transition-colors'>Account</p>
                                            {openUserMenu ? <GoTriangleUp size={20} className='text-green-700' /> : <GoTriangleDown size={20} />}
                                        </div>
                                        {openUserMenu && (
                                            <div className='absolute right-0 top-12 z-50'>
                                                <div className='bg-white rounded-2xl p-4 min-w-52 shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100'>
                                                    <UserMenu close={handleCloseUserMenu} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button onClick={redirectToLoginPage} className='text-base font-bold text-slate-700 hover:text-green-700 transition-colors'>Login</button>
                                )
                            }

                            <button onClick={openCart} className='flex items-center gap-3 bg-green-700 hover:bg-green-800 px-5 py-2.5 rounded-2xl text-white shadow-[0_4px_14px_rgba(21,128,61,0.3)] active:scale-95 transition-all'>
                                <BsCart4 size={24} className={totalQty > 0 ? 'animate-bounce' : ''} />
                                <div className='font-bold text-sm text-left leading-tight'>
                                    {totalQty > 0 ? (
                                        <div>
                                            <p>{totalQty} {totalQty > 1 ? "Items" : "Item"}</p>
                                            <p className='text-[11px] font-medium opacity-80'>{DisplayPriceInRupees(totalPrice)}</p>
                                        </div>
                                    ) : <p className='text-sm'>My Cart</p>}
                                </div>
                            </button>
                        </div>
                    </div>
                )
            }

            {/* MOBILE SEARCH BAR */}
            <div className='container mx-auto px-3 lg:hidden pb-2'>
                <Search />
            </div>
        </header>
    )
}

export default Header;