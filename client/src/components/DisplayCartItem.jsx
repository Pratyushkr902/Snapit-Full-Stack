import React from 'react'
import { IoClose } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'
import { useGlobalContext } from '../provider/GlobalProvider'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { FaCaretRight } from 'react-icons/fa'
import { useSelector } from 'react-redux'
import AddToCartButton from './AddToCartButton'
import imageEmpty from '../assets/empty_cart.webp'
import toast from 'react-hot-toast'
import { optimizeImage } from '../utils/optimizeImage'
import { getDeliveryInfo } from '../utils/getDeliveryInfo'

const PricewithDiscount = (price, discount) => {
    const finalPrice = (Number(price) || 0) - (Number(discount) || 0);
    return finalPrice > 0 ? finalPrice : 0; 
}

const DisplayCartItem = ({close}) => {
    const { notDiscountTotalPrice = 0, totalPrice = 0, totalQty = 0 } = useGlobalContext() || {}
    const cartItem = useSelector(state => state.cartItem.cart)
    const user = useSelector(state => state.user)
    const addressList = useSelector(state => state.addresses.addressList)
    const isSnapitPlus = user?.isSnapitPlusMember && new Date() < new Date(user?.snapitPlusExpiresAt)
    const navigate = useNavigate()

    // Use the customer's default/first saved address for a real distance-based
    // estimate — matches what CheckoutPage will actually charge. Previously
    // this was a hardcoded flat ₹12 regardless of distance, which didn't match
    // the checkout price for anyone outside the 0-4km slab.
    const defaultAddress = addressList?.[0]
    const deliveryInfo = (defaultAddress?.lat && defaultAddress?.lng)
        ? getDeliveryInfo(defaultAddress.lat, defaultAddress.lng, totalPrice, isSnapitPlus)
        : null

    // Fallback flat ₹12 only when we have no address/coords to estimate from —
    // marked "Estimated" in the UI so it's not read as a locked-in price.
    const deliveryFee = deliveryInfo
        ? deliveryInfo.charge
        : (isSnapitPlus ? 0 : 12)
    const isEstimate = !deliveryInfo
    const grandTotal = totalPrice + deliveryFee;

    const redirectToCheckoutPage = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const token = localStorage.getItem('accesstoken') || 
                      localStorage.getItem('accessToken') || 
                      localStorage.getItem('token');
                      
        if (token) {
            if (close) close();
            navigate('/checkout');
            return;
        }
        
        toast.error('Please login to proceed to checkout');
    }

    return (
        <section 
            className='bg-black/60 backdrop-blur-xs fixed inset-0 z-50 flex items-end sm:items-stretch justify-center sm:justify-end transition-opacity' 
            onClick={close}
        >
            <div
                className='bg-white dark:bg-slate-950 w-full max-w-md max-h-[88dvh] sm:max-h-[100dvh] sm:h-[100dvh] rounded-t-[28px] sm:rounded-none ml-auto flex flex-col shadow-2xl overflow-hidden transition-all'
                onClick={e => e.stopPropagation()}
            >
                {/* Mobile Pull Handle (Zepto/Blinkit/Zomato style) */}
                <div className='w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden flex-shrink-0'></div>
                
                {/* Drawer Top Header */}
                <div className='flex items-center px-4 pb-3.5 pt-2 sm:pt-4 border-b border-slate-100 dark:border-slate-800 gap-3 justify-between bg-white dark:bg-slate-900 flex-shrink-0 shadow-xs'>
                    <div className='flex items-center gap-2.5'>
                        <h2 className='font-black text-lg text-slate-800 dark:text-white tracking-tight'>My Cart</h2>
                        <span className='bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800/40'>
                            {totalQty} {totalQty > 1 ? 'items' : 'item'}
                        </span>
                    </div>
                    <button 
                        onClick={close} 
                        className='p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 rounded-full text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 transition-all'
                        aria-label='Close Cart'
                    >
                        <IoClose size={20}/>
                    </button>
                </div>

                {/* Scrollable Cart Content */}
                <div className='flex-1 min-h-0 bg-slate-50 dark:bg-slate-950 p-3 flex flex-col gap-3 overflow-y-auto overscroll-contain'>
                    {
                        cartItem && cartItem[0] ? (
                            <>
                                <div className='flex items-center justify-between px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs font-bold shadow-sm flex-shrink-0'>
                                    <p className='flex items-center gap-1.5'><span>🎉</span> Your total savings</p>
                                    <p className='text-emerald-700 dark:text-emerald-400 font-extrabold text-sm'>{DisplayPriceInRupees(notDiscountTotalPrice - totalPrice)}</p>
                                </div>

                                <div className='bg-white dark:bg-slate-900 rounded-2xl p-3.5 divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors'>
                                    {
                                        cartItem.filter(item => item?.productId).map((item, index) => {
                                            return (
                                                <div key={item?._id || index} className='flex w-full gap-3 items-center py-3 first:pt-0 last:pb-0'>
                                                    <div className='w-14 h-14 min-h-14 min-w-14 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-xl p-1 flex items-center justify-center flex-shrink-0'>
                                                        <img
                                                            src={optimizeImage(item?.productId?.image?.[0], 150)}
                                                            className='object-contain w-full h-full'
                                                            alt={item?.productId?.name || 'product'}
                                                        />
                                                    </div>
                                                    <div className='flex-1 min-w-0 text-xs'>
                                                        <p className='text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug'>{item?.productId?.name}</p>
                                                        <p className='text-slate-400 dark:text-slate-500 text-[10px] mt-0.5'>{item?.productId?.unit}</p>
                                                        <div className='flex items-center gap-2 mt-1'>
                                                            <p className='font-black text-slate-900 dark:text-white text-sm'>
                                                                {DisplayPriceInRupees(PricewithDiscount(item?.productId?.price, item?.productId?.discount))}
                                                            </p>
                                                            {item?.productId?.discount > 0 && (
                                                                <p className='text-[10px] line-through text-slate-400 dark:text-slate-500'>
                                                                    {DisplayPriceInRupees(item?.productId?.price)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className='w-20 flex-shrink-0'>
                                                        <AddToCartButton data={item?.productId}/>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    }
                                </div>

                                <div className='bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm space-y-3 mb-2 border border-slate-100 dark:border-slate-800 transition-colors'>
                                    <h3 className='font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 text-sm'>Bill details</h3>
                                    <div className='flex justify-between text-xs sm:text-sm'>
                                        <p className='text-slate-500 dark:text-slate-400'>Items total</p>
                                        <p className='flex items-center gap-2'>
                                            <span className='line-through text-slate-400 dark:text-slate-500 text-xs'>{DisplayPriceInRupees(notDiscountTotalPrice)}</span>
                                            <span className='font-bold text-slate-800 dark:text-slate-200'>{DisplayPriceInRupees(totalPrice)}</span>
                                        </p>
                                    </div>
                                    <div className='flex justify-between text-xs sm:text-sm'>
                                        <p className='text-slate-500 dark:text-slate-400'>Quantity total</p>
                                        <p className='font-medium text-slate-700 dark:text-slate-300'>{totalQty} {totalQty > 1 ? 'items' : 'item'}</p>
                                    </div>
                                    <div className='flex justify-between text-xs sm:text-sm'>
                                        <p className='text-slate-500 dark:text-slate-400'>
                                            Delivery Charge{isEstimate ? ' (est.)' : ''}
                                        </p>
                                        <p className={deliveryFee === 0 ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'font-bold text-slate-800 dark:text-slate-200'}>
                                            {deliveryFee === 0 ? 'FREE' : DisplayPriceInRupees(deliveryFee)}
                                        </p>
                                    </div>
                                    {deliveryFee > 0 && !isEstimate && !isSnapitPlus && (
                                        <div className='bg-purple-50 dark:bg-purple-950/40 p-2 rounded-xl border border-purple-100 dark:border-purple-800/60'>
                                            <p className='text-[10px] text-purple-600 dark:text-purple-300 text-center font-bold uppercase tracking-tight'>
                                                Join Snapit Plus for FREE DELIVERY on every order
                                            </p>
                                        </div>
                                    )}
                                    {isEstimate && (
                                        <p className='text-[10px] text-slate-400 dark:text-slate-500 text-center'>
                                            Final delivery charge is confirmed at checkout based on your address.
                                        </p>
                                    )}
                                    <div className='font-black flex items-center justify-between border-t border-dashed border-slate-200 dark:border-slate-700 pt-3 text-base text-slate-900 dark:text-white'>
                                        <p>Grand total</p>
                                        <p>{DisplayPriceInRupees(grandTotal)}</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className='flex-1 flex flex-col justify-center items-center py-12 px-4 text-center my-auto'>
                                <div className='w-44 h-44 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center p-4 border border-slate-100 dark:border-slate-800 shadow-sm'>
                                    <img
                                        src={imageEmpty}
                                        className='w-36 h-36 object-contain'
                                        alt='Empty Cart'
                                    />
                                </div>
                                <h3 className='font-black text-slate-800 dark:text-white text-lg mt-4'>Your cart is empty</h3>
                                <p className='text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs'>
                                    Add items to your cart and enjoy superfast 9-minute doorstep delivery!
                                </p>
                                <button 
                                    onClick={() => {
                                        if (close) close();
                                        navigate('/');
                                    }} 
                                    className='bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm px-8 py-3 rounded-2xl mt-5 active:scale-95 shadow-md shadow-emerald-600/30 transition-all'
                                >
                                    Start Shopping
                                </button>
                            </div>
                        )
                    }
                </div>

                {/* Fixed Bottom Checkout Action Bar */}
                {
                    cartItem && cartItem[0] && (
                        <div className='p-3.5 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex-shrink-0 shadow-lg transition-colors'>
                            <button
                                type='button'
                                onClick={redirectToCheckoutPage}
                                className='w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 font-black text-base py-3.5 rounded-2xl flex items-center justify-between shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all cursor-pointer'
                            >
                                <div className='flex flex-col items-start leading-none'>
                                    <span className='text-[10px] uppercase opacity-80 font-semibold tracking-wider mb-0.5'>Grand Total</span>
                                    <span className='text-lg font-black'>{DisplayPriceInRupees(grandTotal)}</span>
                                </div>
                                <div className='flex items-center gap-1.5 uppercase tracking-widest text-xs font-black bg-emerald-700/60 px-3 py-1.5 rounded-xl'>
                                    Proceed to Checkout
                                    <FaCaretRight size={14}/>
                                </div>
                            </button>
                        </div>
                    )
                }
            </div>
        </section>
    )
}

export default DisplayCartItem;