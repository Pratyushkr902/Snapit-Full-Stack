import React, { useEffect, useState } from 'react'
import { useGlobalContext } from '../provider/GlobalProvider'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import Loading from './Loading'
import { useSelector } from 'react-redux'
import { FaMinus, FaPlus } from "react-icons/fa6";

const AddToCartButton = ({ data }) => {
    const { fetchCartItem, updateCartItem, deleteCartItem } = useGlobalContext()
    const [loading, setLoading] = useState(false)
    const cartItem = useSelector(state => state.cartItem.cart)
    const [isAvailableCart, setIsAvailableCart] = useState(false)
    const [qty, setQty] = useState(0)
    const [cartItemDetails, setCartItemsDetails] = useState()

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
        const checkingitem = cartItem.some(item => item.productId._id === data._id)
        setIsAvailableCart(checkingitem)
        const product = cartItem.find(item => item.productId._id === data._id)
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