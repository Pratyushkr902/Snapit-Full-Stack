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

const STORE_OPEN_HOUR  = 8
const STORE_CLOSE_HOUR = 21

// Moved outside component — stable reference, never recreated
const isStoreClosed = () => {
    const now = new Date()
    const istOffsetMs = (5 * 60 + 30) * 60 * 1000
    const istTime = new Date(now.getTime() + istOffsetMs)
    const hour = istTime.getUTCHours()
    return hour < STORE_OPEN_HOUR || hour >= STORE_CLOSE_HOUR
}

// FIX: stable store-closed value computed once per render cycle, not per card
const storeClosed = isStoreClosed()

const AddToCartButton = ({ data }) => {
    const { fetchCartItem, updateCartItem, deleteCartItem } = useGlobalContext() || {}
    const [loading, setLoading] = useState(false)
    const productId = data?._id

    // FIX: instead of .filter() (returns new array every time → always triggers
    // re-render even with custom equality), select only the specific cart item
    // by looking it up directly. useSelector re-renders only when the returned
    // value changes by reference or value.
    //
    // The old selector did:
    //   state.cartItem.cart.filter(i => i?.productId?._id === data?._id ...)
    // .filter() always returns a NEW array, so even a perfectly written
    // equality function gets called on every Redux state change for every
    // mounted card — with 20 cards that's 20 equality checks per action.
    // And if any other cart item changes quantity, all 20 cards re-render.
    const cartItemDetails = useSelector(state => {
        if (!productId) return undefined
        return state.cartItem.cart.find(
            i => i?.productId?._id === productId || i?.productId === productId
        )
    })

    // FIX: qty and isAvailableCart are derived from cartItemDetails — no
    // separate useState + useEffect sync needed. That sync was a second
    // render per cart update (setState schedules another render after the
    // selector already triggered one).
    const isAvailableCart = Boolean(cartItemDetails?.productId)
    const qty             = cartItemDetails?.quantity ?? 0

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

    // ADDED: out-of-stock guard, centralized here so every caller is protected
    if (!data?.stock || data.stock <= 0) {
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
                        className='bg-green-600 hover:bg-green-700 text-white w-7 lg:w-8 h-full rounded flex items-center justify-center flex-shrink-0'
                    >
                        <FaPlus size={10} />
                    </button>
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