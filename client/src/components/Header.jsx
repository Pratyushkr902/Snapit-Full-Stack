import React, { useState, useEffect, useRef } from 'react'
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
    const menuRef = useRef(null)

    const { totalPrice, totalQty, fetchUser, fetchAddress } = useGlobalContext()
    const addressList = useSelector(state => state.addresses.addressList)
    const primaryAddress = addressList?.[0]?.address_line || "Select Address"

    useEffect(() => {
        if (user?._id) {
            if (fetchUser) fetchUser()
            if (fetchAddress) fetchAddress()
        }
    }, [user?._id])

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenUserMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleMobileUser = () => {
        navigate(user?._id ? "/user" : "/login")
    }

    return (
        <header className='sticky top-0 z-40 bg-white shadow-sm'>

            {/* ════════════════════════════════
                DESKTOP HEADER  (lg and above)
            ════════════════════════════════ */}
            <div className='hidden lg:flex container mx-auto items-center px-4 py-3 gap-6 justify-between h-24'>

                {/* Logo + delivery */}
                <div className='flex items-center gap-3 flex-shrink-0'>
                    <Link to="/">
                        <img src={logo} alt='logo' className='w-36 h-auto object-contain drop-shadow-sm hover:scale-105 transition-transform' />
                    </Link>
                    <div className='flex flex-col justify-center border-l-2 pl-3 border-slate-100 h-10'>
                        <div className='flex items-center gap-1'>
                            <h2 className='font-black text-slate-900 text-[15px] uppercase tracking-tighter'>
                                Delivery in <span className='text-yellow-500 animate-pulse'>10 MINS</span>
                            </h2>
                            <span className='text-lg'>⚡</span>
                        </div>
                        <div className='flex items-center gap-0.5 text-xs text-slate-500 font-semibold cursor-pointer'>
                            <span className='truncate max-w-[150px]'>📍 {primaryAddress}</span>
                            <GoTriangleDown size={12} />
                        </div>
                    </div>
                </div>

                {/* Search — grows to fill space */}
                <div className='flex-1 max-w-xl'>
                    <Search />
                </div>

                {/* Right actions */}
                <div className='flex items-center gap-4 flex-shrink-0'>
                    {user?._id && (
                        <Link to="/wallet" className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 hover:bg-slate-100 transition-all group shadow-sm">
                            <span className='text-xl group-hover:scale-110 transition-transform'>💰</span>
                            <div className='flex flex-col'>
                                <span className='font-black text-slate-700 text-[10px] uppercase leading-none'>Balance</span>
                                <span className='font-bold text-green-700 text-sm'>{DisplayPriceInRupees(user?.walletBalance || 0)}</span>
                            </div>
                        </Link>
                    )}

                    {user?._id ? (
                        <div className='relative' ref={menuRef}>
                            <div onClick={() => setOpenUserMenu(p => !p)} className='flex select-none items-center gap-1 cursor-pointer group'>
                                <p className='font-bold text-slate-700 group-hover:text-green-700 transition-colors'>Account</p>
                                {openUserMenu ? <GoTriangleUp size={22} /> : <GoTriangleDown size={22} />}
                            </div>
                            {openUserMenu && (
                                <div className='absolute right-0 top-10 z-50'>
                                    <div className='bg-white rounded-xl p-4 min-w-52 shadow-2xl border border-slate-100'>
                                        <UserMenu close={() => setOpenUserMenu(false)} />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button onClick={() => navigate('/login')} className='text-lg px-2 font-bold text-slate-700 hover:text-green-700 transition-colors'>Login</button>
                    )}

                    <button onClick={openCart} className='flex items-center gap-3 bg-green-700 hover:bg-green-800 px-5 py-2.5 rounded-xl text-white shadow-lg active:scale-95 transition-all'>
                        <BsCart4 size={24} className={totalQty > 0 ? 'animate-bounce' : ''} />
                        <div className='font-bold text-sm text-left leading-tight'>
                            {totalQty > 0 ? (
                                <>
                                    <p>{totalQty} Items</p>
                                    <p className='text-[11px] font-medium opacity-90'>{DisplayPriceInRupees(totalPrice)}</p>
                                </>
                            ) : <p>My Cart</p>}
                        </div>
                    </button>
                </div>
            </div>

            {/* ════════════════════════════════
                MOBILE HEADER  (below lg)
            ════════════════════════════════ */}
            <div className='lg:hidden flex flex-col'>

                {/* Row 1 — always visible on mobile */}
                <div className='flex items-center justify-between px-3 pt-2 pb-1'>
                    {/* Left: logo + delivery */}
                    <div className='flex items-center gap-2 min-w-0 flex-1'>
                        <Link to="/" className='flex-shrink-0'>
                            <img src={logo} alt='logo' className='w-20 h-auto object-contain' />
                        </Link>
                        <div className='flex flex-col justify-center border-l-2 pl-2 border-slate-100 min-w-0'>
                            <div className='flex items-center gap-0.5'>
                                <span className='font-black text-slate-900 text-[11px] uppercase tracking-tighter whitespace-nowrap'>
                                    in <span className='text-yellow-500 animate-pulse'>9 MINS</span> ⚡
                                </span>
                            </div>
                            <div className='flex items-center gap-0.5 text-[10px] text-slate-500 font-semibold min-w-0'>
                                <span className='truncate max-w-[90px]'>📍 {primaryAddress}</span>
                                <GoTriangleDown size={10} className='flex-shrink-0' />
                            </div>
                        </div>
                    </div>

                    {/* Right: user + cart icons */}
                    <div className='flex items-center gap-4 flex-shrink-0 ml-2'>
                        <Link to='/wallet' className='flex flex-col items-center text-green-700 active:scale-90 transition-transform'><span className='text-lg'>💰</span><span className='text-[9px] font-bold'>Wallet</span></Link>
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

                {/* Search bar */}
                <div className='px-3 pb-2'>
                    <Search />
                </div>

            </div>

        </header>
    )
}

export default Header