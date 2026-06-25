import React, { useEffect, useState } from 'react'
import { useGlobalContext } from '../provider/GlobalProvider'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import Loading from './Loading'
import { useSelector } from 'react-redux'
import { FaMinus, FaPlus } from "react-icons/fa6"

const STORE_OPEN_HOUR  = 8
const STORE_CLOSE_HOUR = 21

const isStoreClosed = () => {
    const now = new Date()
    const istOffsetMs = (5 * 60 + 30) * 60 * 1000
    const istTime = new Date(now.getTime() + istOffsetMs)
    const hour = istTime.getUTCHours()
    return hour < STORE_OPEN_HOUR || hour >= STORE_CLOSE_HOUR
}

const AddToCartButton = ({ data }) => {
    const { fetchCartItem, updateCartItem, deleteCartItem } = useGlobalContext()
    const [loading, setLoading]                             = useState(false)
    const cartItem                                          = useSelector(state => state.cartItem.cart)
    const [isAvailableCart, setIsAvailableCart]             = useState(false)
    const [qty, setQty]                                     = useState(0)
    const [cartItemDetails, setCartItemsDetails]            = useState()
    const storeClosed                                       = isStoreClosed()

    const handleADDTocart = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        try {
            setLoading(true)
            const response = await Axios({
                ...SummaryApi.addTocart,
                data: { productId: data?._id }
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

    useEffect(() => {
        // Guard against cart items whose linked product was deleted
        // (productId comes back as null from the API in that case).
        const validCartItems = Array.isArray(cartItem)
            ? cartItem.filter(item => item?.productId)
            : []

        const checkingitem = validCartItems.some(item => item.productId._id === data?._id)
        setIsAvailableCart(checkingitem)
        const product = validCartItems.find(item => item.productId._id === data?._id)
        setQty(product?.quantity)
        setCartItemsDetails(product)
    }, [data, cartItem])

    const increaseQty = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        const response = await updateCartItem(cartItemDetails?._id, qty + 1)
        if (response.success) toast.success("Item added")
    }

    const decreaseQty = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (qty === 1) {
            deleteCartItem(cartItemDetails?._id)
        } else {
            const response = await updateCartItem(cartItemDetails?._id, qty - 1)
            if (response.success) toast.success("Item removed")
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

export default AddToCartButton