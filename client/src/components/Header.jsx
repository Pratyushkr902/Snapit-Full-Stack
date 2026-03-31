import React, { useState, useEffect } from 'react'
import logo from '../assets/snapit.png'
import Search from './Search'
import { Link, useLocation,useNavigate } from 'react-router-dom'
import { FaRegCircleUser } from "react-icons/fa6";
import useMobile from '../hooks/useMobile';
import { BsCart4 } from "react-icons/bs";
import { useSelector } from 'react-redux';
import { GoTriangleDown, GoTriangleUp  } from "react-icons/go";
import UserMenu from './UserMenu';
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees';
import { useGlobalContext } from '../provider/GlobalProvider';
import DisplayCartItem from './DisplayCartItem';

const Header = () => {
    const [ isMobile ] = useMobile()
    const location = useLocation()
    const isSearchPage = location.pathname === "/search"
    const navigate = useNavigate()
    const user = useSelector((state)=> state?.user)
    const [openUserMenu,setOpenUserMenu] = useState(false)
    const cartItem = useSelector(state => state.cartItem.cart)
    const { totalPrice, totalQty} = useGlobalContext()
    const [openCartSection,setOpenCartSection] = useState(false)
 
    const redirectToLoginPage = ()=>{
        navigate("/login")
    }

    const handleCloseUserMenu = ()=>{
        setOpenUserMenu(false)
    }

    const handleMobileUser = ()=>{
        if(!user._id){
            navigate("/login")
            return
        }

        navigate("/user")
    }

  return (
    <header className='h-24 lg:h-24 lg:shadow-md sticky top-0 z-40 flex flex-col justify-center gap-1 bg-white'>
        {
            !(isSearchPage && isMobile) && (
                <div className='container mx-auto flex items-center px-2 justify-between gap-4'>
                                {/**logo - ENLARGED FOR SNAPIT BRANDING **/}
                                <div className='h-full flex-shrink-0'>
                                    <Link to={"/"} className='h-full flex justify-center items-center'>
                                        <img 
                                            src={logo}
                                            alt='logo'
                                            className='hidden lg:block w-36 h-auto object-contain drop-shadow-sm hover:scale-105 transition-transform'
                                        />
                                        <img 
                                            src={logo}
                                            alt='logo'
                                            className='lg:hidden w-28 h-auto object-contain'
                                        />
                                    </Link>
                                </div>

                                {/**Search - Balanced for desktop width **/}
                                <div className='hidden lg:block w-full max-w-xl'>
                                    <Search/>
                                </div>


                                {/**login, wallet and my cart */}
                                <div className='flex-shrink-0'>
                                    {/**user icons display in only mobile version**/}
                                    <button className='text-neutral-600 lg:hidden' onClick={handleMobileUser}>
                                        <FaRegCircleUser size={26}/>
                                    </button>

                                      {/**Desktop**/}
                                    <div className='hidden lg:flex items-center gap-8'>
                                        
                                        {/** SNAPIT WALLET LINK - Added for demo impact **/}
                                        {
                                            user?._id && (
                                                <Link to="/wallet" className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 hover:bg-slate-100 transition-all group">
                                                    <span className='text-xl group-hover:scale-110 transition-transform'>💰</span>
                                                    <span className='font-bold text-slate-700 text-sm'>Wallet</span>
                                                </Link>
                                            )
                                        }

                                        {
                                            user?._id ? (
                                                <div className='relative'>
                                                    <div onClick={()=>setOpenUserMenu(preve => !preve)} className='flex select-none items-center gap-1 cursor-pointer group'>
                                                        <p className='font-bold text-slate-700 group-hover:text-green-700 transition-colors'>Account</p>
                                                        {
                                                            openUserMenu ? (
                                                                  <GoTriangleUp size={22} className='text-slate-700'/> 
                                                            ) : (
                                                                <GoTriangleDown size={22} className='text-slate-700'/>
                                                            )
                                                        }
                                                       
                                                    </div>
                                                    {
                                                        openUserMenu && (
                                                            <div className='absolute right-0 top-12'>
                                                                <div className='bg-white rounded-xl p-4 min-w-52 shadow-2xl border border-slate-100'>
                                                                    <UserMenu close={handleCloseUserMenu}/>
                                                                </div>
                                                            </div>
                                                        )
                                                    }
                                                    
                                                </div>
                                            ) : (
                                                <button onClick={redirectToLoginPage} className='text-lg px-2 font-bold text-slate-700 hover:text-green-700 transition-colors'>Login</button>
                                            )
                                        }
                                        
                                        {/** Cart Button **/}
                                        <button onClick={()=>setOpenCartSection(true)} className='flex items-center gap-3 bg-green-700 hover:bg-green-800 px-5 py-2.5 rounded-xl text-white shadow-lg shadow-green-100 transition-all active:scale-95'>
                                            <div className='animate-bounce flex items-center justify-center'>
                                                <BsCart4 size={24}/>
                                            </div>
                                            <div className='font-bold text-sm text-left leading-tight'>
                                                {
                                                    cartItem[0] ? (
                                                        <div>
                                                            <p>{totalQty} Items</p>
                                                            <p className='text-[11px] font-medium opacity-90'>{DisplayPriceInRupees(totalPrice)}</p>
                                                        </div>
                                                    ) : (
                                                        <p>My Cart</p>
                                                    )
                                                }
                                            </div>    
                                        </button>
                                    </div>
                                </div>
                </div>
            )
        }
        
        {/** Mobile Search Bar **/}
        <div className='container mx-auto px-2 lg:hidden'>
            <Search/>
        </div>

        {
            openCartSection && (
                <DisplayCartItem close={()=>setOpenCartSection(false)}/>
            )
        }
    </header>
  )
}

export default Header