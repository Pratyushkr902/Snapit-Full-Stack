import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useGlobalContext } from '../provider/GlobalProvider'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { FaCaretRight } from 'react-icons/fa'
import { useSelector } from 'react-redux'
import AddToCartButton from '../components/AddToCartButton'
import imageEmpty from '../assets/empty_cart.webp'
import toast from 'react-hot-toast'

const PricewithDiscount = (price, discount) => {
    const finalPrice = (Number(price) || 0) - (Number(discount) || 0);
    return finalPrice > 0 ? finalPrice : 0; 
}

const CartMobilePage = () => {
    const { notDiscountTotalPrice = 0, totalPrice = 0, totalQty = 0 } = useGlobalContext() || {}
    const cartItem = useSelector(state => state.cartItem.cart)
    const user = useSelector(state => state.user)
    const isSnapitPlus = user?.isSnapitPlusMember && new Date() < new Date(user?.snapitPlusExpiresAt)
    const navigate = useNavigate()

    const deliveryFee = totalPrice >= 399 ? 0 : (isSnapitPlus && totalPrice >= 149) ? 0 : 12;
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
            window.location.hash = '#/checkout';
            return;
        }
        
        toast.error('Please login to proceed to checkout');
    }

    return (
        <section className='bg-blue-50 min-h-screen w-full flex flex-col p-2 gap-4 pb-24'>
            <div className='bg-white p-4 shadow-sm rounded-xl flex items-center justify-between'>
                <h2 className='font-bold text-lg text-slate-800'>My Cart ({totalQty} {totalQty > 1 ? 'items' : 'item'})</h2>
                <button onClick={() => navigate(-1)} className='text-sm font-bold text-green-700 hover:text-green-800'>
                    Back
                </button>
            </div>

            <div className='flex-1 flex flex-col gap-4 overflow-y-auto'>
                {
                    cartItem && cartItem[0] ? (
                        <>
                            <div className='flex items-center justify-between px-4 py-2 bg-blue-100 text-blue-500 rounded-full text-sm font-bold shadow-sm'>
                                <p>Your total savings</p>
                                <p>{DisplayPriceInRupees(notDiscountTotalPrice - totalPrice)}</p>
                            </div>

                            <div className='bg-white rounded-xl p-4 grid gap-5 shadow-sm'>
                                {
                                    cartItem.map((item, index) => {
                                        return (
                                            <div key={item?._id || index} className='flex w-full gap-4 items-center border-b border-neutral-50 pb-3 last:border-0 last:pb-0'>
                                                <div className='w-14 h-14 min-h-14 min-w-14 bg-white border rounded-lg p-1'>
                                                    <img
                                                        src={item?.productId?.image?.[0]}
                                                        className='object-scale-down w-full h-full'
                                                        alt={item?.productId?.name || 'product'}
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

                            <div className='bg-white p-4 rounded-xl shadow-sm space-y-3 mb-4'>
                                <h3 className='font-bold text-slate-800 border-b pb-2'>Bill details</h3>
                                <div className='flex justify-between text-sm'>
                                    <p className='text-slate-500'>Items total</p>
                                    <p className='flex items-center gap-2'>
                                        <span className='line-through text-neutral-400 text-xs'>{DisplayPriceInRupees(notDiscountTotalPrice)}</span>
                                        <span className='font-bold'>{DisplayPriceInRupees(totalPrice)}</span>
                                    </p>
                                </div>
                                <div className='flex justify-between text-sm'>
                                    <p className='text-slate-500'>Quantity total</p>
                                    <p className='font-medium'>{totalQty} {totalQty > 1 ? 'items' : 'item'}</p>
                                </div>
                                <div className='flex justify-between text-sm'>
                                    <p className='text-slate-500'>Delivery Charge</p>
                                    <p className={deliveryFee === 0 ? 'text-green-600 font-black' : 'font-bold'}>
                                        {deliveryFee === 0 ? 'FREE' : DisplayPriceInRupees(deliveryFee)}
                                    </p>
                                </div>
                                {deliveryFee > 0 && (
                                    <div className='bg-orange-50 p-2 rounded-lg border border-orange-100'>
                                        <p className='text-[10px] text-orange-600 text-center font-bold uppercase tracking-tight'>
                                            Add {DisplayPriceInRupees((isSnapitPlus ? 149 : 399) - totalPrice)} more for FREE DELIVERY
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
                        <div className='bg-white flex flex-col justify-center items-center py-16 rounded-xl shadow-sm'>
                            <img
                                src={imageEmpty}
                                className='w-48 h-48 object-scale-down opacity-80'
                                alt='Empty Cart'
                            />
                            <p className='font-bold text-slate-400 mt-4'>Your cart is empty</p>
                            <button onClick={() => window.location.hash = '#/'} className='bg-green-600 px-8 py-2.5 text-white font-bold rounded-xl mt-4 active:scale-95 transition-all shadow-md text-sm'>
                                Shop Now
                            </button>
                        </div>
                    )
                }
            </div>

            {
                cartItem && cartItem[0] && (
                    <div className='p-4 bg-white border-t fixed bottom-0 left-0 right-0 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]'>
                        <button
                            type='button'
                            onClick={redirectToCheckoutPage}
                            className='w-full bg-green-700 hover:bg-green-800 text-white px-4 font-black text-base py-4 rounded-2xl flex items-center justify-between shadow-lg active:scale-[0.98] transition-all cursor-pointer'
                        >
                            <div className='flex flex-col items-start leading-none'>
                                <span className='text-[10px] uppercase opacity-80 font-normal tracking-wider mb-0.5'>Grand Total</span>
                                <span>{DisplayPriceInRupees(grandTotal)}</span>
                            </div>
                            <div className='flex items-center gap-1 uppercase tracking-widest text-sm font-bold'>
                                Proceed
                                <FaCaretRight/>
                            </div>
                        </button>
                    </div>
                )
            }
        </section>
    )
}

export default CartMobilePage;