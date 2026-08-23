import React, { useMemo } from 'react'
import { useGlobalContext } from '../provider/GlobalProvider'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import Loading from './Loading'
import { useSelector } from 'react-redux'
import { FaMinus, FaPlus } from "react-icons/fa6"
import { useState } from 'react'

import { isStoreOpen } from './StoreClosedOverlay'

    const { fetchCartItem, updateCartItem, deleteCartItem } = useGlobalContext() || {}
    const [loading, setLoading] = useState(false)
    const productId = data?._id
    const user = useSelector(state => state.user)
    const storeClosed = !isStoreOpen(user?.role)

    // FIX: select only the specific cart item by looking it up directly
    const cartItemDetails = useSelector(state => {
        if (!productId) return undefined
        return state.cartItem.cart.find(
            i => i?.productId?._id === productId || i?.productId === productId
        )
    })

    // FIX: qty and isAvailableCart are derived from cartItemDetails — no
    // separate useState + useEffect sync needed. That sync was a second
    // render per cart update (setState schedules another render after the

    // FIX: compute out-of-stock as a plain flag instead of an early return,
    // so we can decide the UI *after* we know whether it's already in cart.
    const isOutOfStock = !data?.stock || data.stock <= 0

    const handleADDTocart = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        try {
            setLoading(true)
            const response = await Axios({
                ...SummaryApi.addTocart,
                data: { productId }
            })
            const { data: responseData } = response
            if (responseData.success) {
                toast.success(responseData.message)
                if (fetchCartItem) fetchCartItem()
            }
        } catch (error) {
            AxiosToastError(error)
        } finally {
            setLoading(false)
        }
    }

    const increaseQty = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        // FIX: block increasing quantity on an out-of-stock item, but this
        // button only renders when the item is already in the cart, so
        // decrease/remove is never blocked.
        if (isOutOfStock) return
        if (!updateCartItem) return
        const response = await updateCartItem(cartItemDetails?._id, qty + 1)
        if (response?.success) toast.success("Item added")
    }

    const decreaseQty = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!updateCartItem || !deleteCartItem) return
        if (qty === 1) {
            deleteCartItem(cartItemDetails?._id)
        } else {
            const response = await updateCartItem(cartItemDetails?._id, qty - 1)
            if (response?.success) toast.success("Item removed")
        }
    }

    if (storeClosed) {
        return (
            <div className='w-full'>
                <div className='border border-gray-200 bg-gray-50 px-1 py-1.5 rounded text-center'>
                    <p className='text-gray-400 text-[7px] lg:text-[9px] font-black uppercase leading-none'>
                        Store<br />Closed
                    </p>
                </div>
            </div>
        )
    }

    // FIX: only show the blocking "Out of stock" badge (no controls at all)
    // when the item is NOT already in the cart. If it IS in the cart, fall
    // through to the stepper below so the '−' button stays available to
    // remove it — that's the only way out once stock hits 0 after add.
    if (isOutOfStock && !isAvailableCart) {
        return (
            <div className='w-full'>
                <div className='border border-red-100 bg-red-50 px-1 py-1.5 rounded text-center'>
                    <p className='text-red-500 text-[7px] lg:text-[9px] font-black uppercase leading-none'>
                        Out of<br />stock
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className='w-full'>
            {isAvailableCart ? (
                <div className='flex flex-col w-full gap-0.5'>
                    <div className='flex w-full h-7 lg:h-8'>
                        <button
                            onClick={decreaseQty}
                            className='bg-green-600 hover:bg-green-700 text-white w-7 lg:w-8 h-full rounded flex items-center justify-center flex-shrink-0'
                        >
                            <FaMinus size={10} />
                        </button>
                        <p className='flex-1 font-semibold text-xs lg:text-sm flex items-center justify-center'>
                            {qty}
                        </p>
                        <button
                            onClick={increaseQty}
                            disabled={isOutOfStock}
                            className={`text-white w-7 lg:w-8 h-full rounded flex items-center justify-center flex-shrink-0 ${
                                isOutOfStock
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700'
                            }`}
                        >
                            <FaPlus size={10} />
                        </button>
                    </div>
                    {isOutOfStock && (
                        <p className='text-red-500 text-[7px] lg:text-[8px] font-black uppercase text-center leading-none'>
                            Out of stock
                        </p>
                    )}
                </div>
            ) : (
                <button
                    onClick={handleADDTocart}
                    className='bg-green-600 hover:bg-green-700 text-white text-xs lg:text-sm font-bold px-3 lg:px-4 py-1.5 rounded w-full'
                >
                    {loading ? <Loading /> : "Add"}
                </button>
            )}
        </div>
    )
}

export default React.memo(AddToCartButton)