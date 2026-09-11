import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useGlobalContext } from '../provider/GlobalProvider'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { FaCaretRight } from 'react-icons/fa'
import { IoArrowBack } from 'react-icons/io5'
import { useSelector } from 'react-redux'
import AddToCartButton from '../components/AddToCartButton'
import imageEmpty from '../assets/empty_cart.webp'
import toast from 'react-hot-toast'
import { getDeliveryInfo } from '../utils/getDeliveryInfo'
import { getEffectiveAddressCoords } from '../utils/serviceArea'
import { useFullCart } from '../utils/foodCartStore'

const PricewithDiscount = (price, discount) => {
    const finalPrice = (Number(price) || 0) - (Number(discount) || 0);
    return finalPrice > 0 ? finalPrice : 0; 
}

const CartMobilePage = () => {
    const { notDiscountTotalPrice = 0, totalPrice = 0, totalQty = 0 } = useGlobalContext() || {}
    const cartItem = useSelector(state => state.cartItem.cart)
    const user = useSelector(state => state.user)
    const addressList = useSelector(state => state.addresses.addressList)
    const isSnapitPlus = user?.isSnapitPlusMember && new Date() < new Date(user?.snapitPlusExpiresAt)
    const navigate = useNavigate()
    const { grandCount: foodGrandCount, grandTotal: foodGrandTotal } = useFullCart()

    const defaultAddress = addressList?.[0]
    const effectiveCoords = getEffectiveAddressCoords(defaultAddress)
    const deliveryInfo = (effectiveCoords?.lat && effectiveCoords?.lng)
        ? getDeliveryInfo(effectiveCoords.lat, effectiveCoords.lng, totalPrice, isSnapitPlus)
        : null

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
            navigate('/checkout');
            return;
        }
        
        toast('Please login to complete your order', { icon: '🔐' });
        navigate('/login?redirect=/checkout');
    }

    return (
        <section className='bg-slate-50 dark:bg-slate-950 min-h-[100dvh] w-full flex flex-col p-3 gap-3 pb-36 pt-safe-header max-w-lg mx-auto transition-colors'>
            {/* Header */}
            <div className='sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3.5 shadow-sm rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800 transition-colors'>
                <div className='flex items-center gap-3'>
                    <button
                        onClick={() => navigate(-1)}
                        className='p-2 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 rounded-full text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all'
                    >
                        <IoArrowBack size={18} />
                    </button>
                    <div>
                        <h2 className='font-black text-base text-slate-800 dark:text-white leading-tight'>My Cart</h2>
                        <p className='text-[11px] text-slate-500 dark:text-slate-400 font-semibold'>{totalQty} {totalQty > 1 ? 'items' : 'item'}</p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/')}
                    className='text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60 px-3 py-1.5 rounded-full transition-colors'
                >
                    + Add more
                </button>
            </div>

            <div className='flex flex-col gap-3'>
                {
                    cartItem && cartItem[0] ? (
                        <>
                            {foodGrandCount > 0 && (
                                <div 
                                    onClick={() => navigate('/food-checkout')}
                                    className='bg-gradient-to-r from-orange-500 to-amber-500 text-white p-3 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer active:scale-[0.98] transition-all'
                                >
                                    <div className='flex items-center gap-2.5'>
                                        <span className='text-xl'>🍔</span>
                                        <div>
                                            <p className='text-xs font-black leading-tight'>Also have {foodGrandCount} Food item{foodGrandCount !== 1 ? 's' : ''} in cart</p>
                                            <p className='text-[10px] opacity-90'>{DisplayPriceInRupees(foodGrandTotal)} from Paliganj restaurants</p>
                                        </div>
                                    </div>
                                    <span className='text-[11px] font-black underline bg-white/20 px-2 py-1 rounded-lg'>Go to Food &rarr;</span>
                                </div>
                            )}

                            <div className='flex items-center justify-between px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs font-bold shadow-sm'>
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
                                                        src={item?.productId?.image?.[0]}
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

                            <div className='bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm space-y-3 mb-4 border border-slate-100 dark:border-slate-800 transition-colors'>
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
                                {deliveryInfo?.amountNeededForFreeDelivery > 0 && (
                                    <div className='bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60'>
                                        <p className='text-[11px] text-emerald-800 dark:text-emerald-300 font-bold text-center'>
                                            ⚡ Add items worth <span className='font-black'>₹{deliveryInfo.amountNeededForFreeDelivery}</span> more for <span className='font-black text-emerald-600 dark:text-emerald-400'>FREE Delivery</span> (Within 5 km)!
                                        </p>
                                    </div>
                                )}
                                {deliveryFee > 0 && !isEstimate && !isSnapitPlus && !deliveryInfo?.amountNeededForFreeDelivery && (
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
                        <div className='flex-1 flex flex-col justify-center items-center py-16 px-4 text-center my-auto'>
                            <div className='w-48 h-48 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center p-4 border border-slate-100 dark:border-slate-800 shadow-sm'>
                                <img
                                    src={imageEmpty}
                                    className='w-36 h-36 object-contain'
                                    alt='Empty Cart'
                                />
                            </div>
                            <h3 className='font-black text-slate-800 dark:text-white text-lg mt-4'>Your grocery cart is empty</h3>
                            <p className='text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs'>
                                Add items to your cart and enjoy superfast 9-minute doorstep delivery!
                            </p>

                            {foodGrandCount > 0 ? (
                                <div className='w-full max-w-xs bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 rounded-2xl p-4 mt-5 flex flex-col items-center text-center shadow-sm'>
                                    <span className='text-3xl mb-1'>🍔</span>
                                    <h4 className='font-black text-orange-950 dark:text-orange-200 text-sm'>
                                        You have {foodGrandCount} item{foodGrandCount !== 1 ? 's' : ''} in your Food Cart!
                                    </h4>
                                    <p className='text-xs text-orange-800/80 dark:text-orange-300/80 mt-0.5 mb-3'>
                                        Total: {DisplayPriceInRupees(foodGrandTotal)} from restaurants
                                    </p>
                                    <button
                                        onClick={() => navigate('/food-checkout')}
                                        className='w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-orange-500/30 transition-all'
                                    >
                                        <span>Proceed to Food Checkout</span>
                                        <FaCaretRight size={14} />
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => navigate('/')} 
                                    className='bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm px-8 py-3 rounded-2xl mt-5 active:scale-95 shadow-md shadow-emerald-600/30 transition-all'
                                >
                                    Start Shopping
                                </button>
                            )}
                        </div>
                    )
                }
            </div>

            {
                cartItem && cartItem[0] && (
                    <div className='p-3.5 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 fixed bottom-0 left-0 right-0 z-50 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] transition-colors'>
                        <div className='max-w-lg mx-auto'>
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
                    </div>
                )
            }
        </section>
    )
}

export default CartMobilePage;