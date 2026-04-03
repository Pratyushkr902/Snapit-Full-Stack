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
import DisplayCartItem from './DisplayCartItem';

const Header = () => {
    const [isMobile] = useMobile()
    const location = useLocation()
    const isSearchPage = location.pathname === "/search"
    const navigate = useNavigate()
    const user = useSelector((state) => state?.user)
    const [openUserMenu, setOpenUserMenu] = useState(false)
    const cartItem = useSelector(state => state.cartItem.cart)
    
    // --- UPDATED: Destructure fetch functions for sync ---
    const { totalPrice, totalQty, fetchUser, fetchAddress } = useGlobalContext()

    // --- NEW: Pulling address for Zepto-style Header ---
    const addressList = useSelector(state => state.addresses.addressList)
    const primaryAddress = addressList?.[0]?.address_line || "Select Address"

    // --- SYNC LOGIC: Refresh data when user ID is found ---
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
        if (!user._id) {
            navigate("/login")
            return
        }
        navigate("/user")
    }

    return (
        <header className='h-28 lg:h-24 lg:shadow-md sticky top-0 z-40 flex flex-col justify-center gap-1 bg-white shadow-sm'>
            {
                !(isSearchPage && isMobile) && (
                    <div className='container mx-auto flex flex-col lg:flex-row items-center px-3 py-2 lg:justify-between gap-2 lg:gap-4'>
                        
                        {/* TOP ROW: Logo + Delivery Badge + Mobile Icons */}
                        <div className='flex items-center justify-between w-full lg:w-auto gap-4'>
                            <div className='flex items-center gap-2'>
                                <Link to={"/"} className='h-full flex justify-center items-center shrink-0'>
                                    <img
                                        src={logo}
                                        alt='logo'
                                        className='hidden lg:block w-36 h-auto object-contain drop-shadow-sm hover:scale-105 transition-transform'
                                    />
                                    <img
                                        src={logo}
                                        alt='logo'
                                        className='lg:hidden w-24 h-auto object-contain'
                                    />
                                </Link>

                                {/** ZEPTO-STYLE DELIVERY BADGE - Mobile & Desktop Responsive **/}
                                <div className='flex flex-col justify-center border-l-2 pl-3 border-slate-100 h-10'>
                                    <div className='flex items-center gap-1'>
                                        <h2 className='font-black text-slate-900 text-[13px] lg:text-[15px] uppercase tracking-tighter'>
                                            Delivery in <span className='text-yellow-500 animate-pulse'>9 MINS</span>
                                        </h2>
                                        <span className='text-base lg:text-lg'>⚡</span>
                                    </div>
                                    <div className='flex items-center gap-0.5 text-[10px] lg:text-xs text-slate-500 font-semibold cursor-pointer truncate max-w-[120px] lg:max-w-[150px]'>
                                        <span className='truncate'>{primaryAddress}</span>
                                        <GoTriangleDown size={12} />
                                    </div>
                                </div>
                            </div>

                            {/* Mobile-only Icons (User/Cart) for Native feel */}
                            <div className='flex items-center gap-5 lg:hidden'>
                                <button className='text-neutral-600' onClick={handleMobileUser}>
                                    <FaRegCircleUser size={24} />
                                </button>
                                <button onClick={() => setOpenCartSection(true)} className='relative text-green-700'>
                                    <BsCart4 size={24} />
                                    {totalQty > 0 && (
                                        <span className='absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 rounded-full'>
                                            {totalQty}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/** Desktop Search Bar **/}
                        <div className='hidden lg:block w-full max-w-xl'>
                            <Search />
                        </div>

                        {/** Desktop Right Menu */}
                        <div className='hidden lg:flex items-center gap-8 flex-shrink-0'>
                            {
                                user?._id && (
                                    <Link to="/wallet" className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 hover:bg-slate-100 transition-all group shadow-sm active:scale-95">
                                        <span className='text-xl group-hover:scale-110 transition-transform'>💰</span>
                                        <div className='flex flex-col'>
                                            <span className='font-black text-slate-700 text-[10px] uppercase leading-none'>Balance</span>
                                            {/* SYNCED BALANCE */}
                                            <span className='font-bold text-green-700 text-sm'>{DisplayPriceInRupees(user?.walletBalance || 0)}</span>
                                        </div>
                                    </Link>
                                )
                            }

                            {
                                user?._id ? (
                                    <div className='relative'>
                                        <div onClick={() => setOpenUserMenu(preve => !preve)} className='flex select-none items-center gap-1 cursor-pointer group'>
                                            <p className='font-bold text-slate-700 group-hover:text-green-700 transition-colors'>Account</p>
                                            {openUserMenu ? <GoTriangleUp size={22} /> : <GoTriangleDown size={22} />}
                                        </div>
                                        {openUserMenu && (
                                            <div className='absolute right-0 top-12'>
                                                <div className='bg-white rounded-xl p-4 min-w-52 shadow-2xl border border-slate-100'>
                                                    <UserMenu close={handleCloseUserMenu} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button onClick={redirectToLoginPage} className='text-lg px-2 font-bold text-slate-700 hover:text-green-700'>Login</button>
                                )
                            }

                            <button onClick={() => setOpenCartSection(true)} className='flex items-center gap-3 bg-green-700 hover:bg-green-800 px-5 py-2.5 rounded-xl text-white shadow-lg active:scale-95 transition-all'>
                                <div className='animate-bounce'><BsCart4 size={24} /></div>
                                <div className='font-bold text-sm text-left leading-tight'>
                                    {cartItem[0] ? (
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

            {/** MOBILE SEARCH BAR (Second Tier) **/}
            <div className='container mx-auto px-3 lg:hidden pb-2'>
                <Search />
            </div>

            {openCartSection && <DisplayCartItem close={() => setOpenCartSection(false)} />}
        </header>
    )
}

export default Header