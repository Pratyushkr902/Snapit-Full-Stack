import React from 'react'
import { useGlobalContext } from '../provider/GlobalProvider'
import { FaCartShopping } from 'react-icons/fa6'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { FaCaretRight } from 'react-icons/fa'
import { useSelector } from 'react-redux'

const CartMobile = () => {
    const { totalPrice, totalQty } = useGlobalContext()
    const cartItem = useSelector(state => state.cartItem.cart)

    const handleViewCartClick = (e) => {
        e.preventDefault();
        window.location.hash = '#/cart';
    }

    return (
        <>
            {
                cartItem && cartItem[0] && (
                    <div className='sticky bottom-4 p-2 z-40'>
                        <div className='bg-green-600 px-2 py-1 rounded text-neutral-100 text-sm flex items-center justify-between gap-3 lg:hidden shadow-lg'>
                            <div className='flex items-center gap-2'>
                                <div className='p-2 bg-green-500 rounded w-fit'>
                                    <FaCartShopping/>
                                </div>
                                <div className='text-xs'>
                                    <p>{totalQty} {totalQty > 1 ? 'items' : 'item'}</p>
                                    <p>{DisplayPriceInRupees(totalPrice)}</p>
                                </div>
                            </div>

                            <button 
                                onClick={handleViewCartClick} 
                                className='flex items-center gap-1 bg-transparent border-none text-neutral-100 font-bold active:scale-95 transition-all cursor-pointer'
                            >
                                <span className='text-sm'>View Cart</span>
                                <FaCaretRight/>
                            </button>
                        </div>
                    </div>
                )
            }
        </>
    )
}

export default CartMobile;