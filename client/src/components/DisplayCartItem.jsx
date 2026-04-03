import React from 'react'
import { IoClose } from 'react-icons/io5'
import { Link, useNavigate } from 'react-router-dom'
import { useGlobalContext } from '../provider/GlobalProvider'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { FaCaretRight } from "react-icons/fa";
import { useSelector } from 'react-redux'
import AddToCartButton from './AddToCartButton'
import imageEmpty from '../assets/empty_cart.webp'
import toast from 'react-hot-toast'

// 1. Math function to handle local discount calculations
const PricewithDiscount = (price, discount) => {
    const finalPrice = (Number(price) || 0) - (Number(discount) || 0);
    return finalPrice > 0 ? finalPrice : 0; 
}

const DisplayCartItem = ({close}) => {
    const { notDiscountTotalPrice, totalPrice ,totalQty } = useGlobalContext()
    const cartItem  = useSelector(state => state.cartItem.cart)
    const user = useSelector(state => state.user)
    const navigate = useNavigate()

    // Delivery Fee Logic (Free over 399)
    const deliveryFee = totalPrice >= 399 ? 0 : 12;
    const grandTotal = totalPrice + deliveryFee;

    const redirectToCheckoutPage = ()=>{
        if(user?._id){
            navigate("/checkout")
            if(close){
                close()
            }
            return
        }
        toast.error("Please Login to proceed")
    }
    
  return (
    <section className='bg-neutral-900 fixed top-0 bottom-0 right-0 left-0 bg-opacity-70 z-50 flex justify-end'>
        <div className='bg-white w-full max-w-sm min-h-screen max-h-screen ml-auto flex flex-col'>
            
            {/* HEADER: Close logic applied to both Mobile Link and Desktop Button */}
            <div className='flex items-center p-4 shadow-md gap-3 justify-between bg-white'>
                <h2 className='font-bold text-lg'>My Cart</h2>
                <div className='flex items-center gap-2'>
                    {/* Mobile Close */}
                    <button onClick={close} className='lg:hidden p-2 hover:bg-slate-100 rounded-full transition-all'>
                        <IoClose size={25}/>
                    </button>
                    {/* Desktop Close */}
                    <button onClick={close} className='hidden lg:block p-2 hover:bg-slate-100 rounded-full transition-all'>
                        <IoClose size={25}/>
                    </button>
                </div>
            </div>

            <div className='flex-1 bg-blue-50 p-2 flex flex-col gap-4 overflow-y-auto'>
                {
                    cartItem[0] ? (
                        <>
                            {/* SAVINGS BADGE */}
                            <div className='flex items-center justify-between px-4 py-2 bg-blue-100 text-blue-500 rounded-full text-sm font-bold'>
                                    <p>Your total savings</p>
                                    <p>{DisplayPriceInRupees(notDiscountTotalPrice - totalPrice )}</p>
                            </div>

                            {/* ITEM LIST */}
                            <div className='bg-white rounded-xl p-4 grid gap-5 shadow-sm'>
                                    {
                                        cartItem.map((item,index)=>{
                                            return(
                                                <div key={item?._id+"cartItemDisplay"} className='flex w-full gap-4 items-center'>
                                                    <div className='w-14 h-14 min-h-14 min-w-14 bg-white border rounded-lg p-1'>
                                                        <img
                                                            src={item?.productId?.image[0]}
                                                            className='object-scale-down w-full h-full'
                                                            alt={item?.productId?.name}
                                                        />
                                                    </div>
                                                    <div className='flex-1 text-xs'>
                                                        <p className='text-xs font-medium text-slate-800 line-clamp-2'>{item?.productId?.name}</p>
                                                        <p className='text-neutral-400 mb-1'>{item?.productId?.unit}</p>
                                                        
                                                        <div className='flex items-center gap-2'>
                                                            <p className='font-bold text-slate-900'>
                                                                {DisplayPriceInRupees(PricewithDiscount(item?.productId?.price, item?.productId?.discount))}
                                                            </p>
                                                            {item?.productId?.discount > 0 && (
                                                                <p className='text-[10px] line-through text-neutral-400'>
                                                                    {DisplayPriceInRupees(item?.productId?.price)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className='w-20'>
                                                        <AddToCartButton data={item?.productId}/>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    }
                            </div>

                            {/* BILLING SECTION */}
                            <div className='bg-white p-4 rounded-xl shadow-sm space-y-3 mb-4'>
                                <h3 className='font-bold text-slate-800'>Bill details</h3>
                                <div className='flex justify-between text-sm'>
                                    <p className='text-slate-500'>Items total</p>
                                    <p className='flex items-center gap-2'>
                                        <span className='line-through text-neutral-400 text-xs'>{DisplayPriceInRupees(notDiscountTotalPrice)}</span>
                                        <span className='font-bold'>{DisplayPriceInRupees(totalPrice)}</span>
                                    </p>
                                </div>
                                <div className='flex justify-between text-sm'>
                                    <p className='text-slate-500'>Quantity total</p>
                                    <p className='font-medium'>{totalQty} {totalQty > 1 ? "items" : "item"}</p>
                                </div>
                                <div className='flex justify-between text-sm'>
                                    <p className='text-slate-500'>Delivery Charge</p>
                                    <p className={`${deliveryFee === 0 ? "text-green-600 font-black" : "font-bold"}`}>
                                        {deliveryFee === 0 ? "FREE" : DisplayPriceInRupees(deliveryFee)}
                                    </p>
                                </div>

                                {deliveryFee > 0 && (
                                    <div className='bg-orange-50 p-2 rounded-lg border border-orange-100'>
                                        <p className='text-[10px] text-orange-600 text-center font-bold uppercase tracking-tight'>
                                            Add {DisplayPriceInRupees(399 - totalPrice)} more for FREE DELIVERY
                                        </p>
                                    </div>
                                )}

                                <div className='font-black flex items-center justify-between border-t border-dashed pt-3 text-lg text-slate-900'>
                                    <p>Grand total</p>
                                    <p>{DisplayPriceInRupees(grandTotal)}</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className='bg-white flex flex-col justify-center items-center py-10 rounded-xl'>
                            <img
                                src={imageEmpty}
                                className='w-48 h-48 object-scale-down' 
                                alt="Empty Cart"
                            />
                            <p className='font-bold text-slate-400 mt-2'>Your cart is empty</p>
                            <button onClick={close} className='bg-green-600 px-8 py-2 text-white font-bold rounded-xl mt-4 active:scale-95 transition-all'>Shop Now</button>
                        </div>
                    )
                }
            </div>

            {
                cartItem[0] && (
                    <div className='p-4 bg-white border-t'>
                        <button 
                            onClick={redirectToCheckoutPage} 
                            className='w-full bg-green-700 hover:bg-green-800 text-white px-4 font-black text-base py-4 rounded-2xl flex items-center justify-between shadow-lg active:scale-[0.98] transition-all'
                        >
                            <div className='flex flex-col items-start leading-none'>
                                <span className='text-[10px] uppercase opacity-80'>Grand Total</span>
                                <span>{DisplayPriceInRupees(grandTotal)}</span>
                            </div>
                            <div className='flex items-center gap-1 uppercase tracking-widest text-sm'>
                                Proceed
                                <FaCaretRight/>
                            </div>
                        </button>
                    </div>
                )
            }
        </div>
    </section>
  )
}

export default DisplayCartItem