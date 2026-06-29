import { createContext, useContext, useEffect, useState } from "react";
import Axios from "../utils/Axios";
import SummaryApi from "../common/SummaryApi";
import { useDispatch, useSelector } from "react-redux";
import { handleAddItemCart } from "../store/cartProduct";
import AxiosToastError from "../utils/AxiosToastError";
import toast from "react-hot-toast";
import { pricewithDiscount } from "../utils/PriceWithDiscount";
import { handleAddAddress } from "../store/addressSlice";
import { setOrder } from "../store/orderSlice";

export const GlobalContext = createContext(null)
export const useGlobalContext = () => useContext(GlobalContext)

const GlobalProvider = ({ children }) => {
    const dispatch = useDispatch()
    const [totalPrice, setTotalPrice] = useState(0)
    const [notDiscountTotalPrice, setNotDiscountTotalPrice] = useState(0)
    const [totalQty, setTotalQty] = useState(0)
    const cartItem = useSelector(state => state.cartItem.cart)
    const user = useSelector(state => state?.user)

    const fetchCartItem = async () => {
        try {
            const response = await Axios({ ...SummaryApi.getCartItem })
            const { data: responseData } = response
            if (responseData.success) {
                dispatch(handleAddItemCart(responseData.data))
            }
        } catch (error) {
            console.log("Cart Fetch Error:", error)
        }
    }

    const updateCartItem = async (id, qty) => {
        try {
            const response = await Axios({
                ...SummaryApi.updateCartItemQty,
                data: { _id: id, qty: qty }
            })
            const { data: responseData } = response
            if (responseData.success) {
                fetchCartItem()
                return responseData
            }
        } catch (error) {
            AxiosToastError(error)
            return error
        }
    }

    const deleteCartItem = async (cartId) => {
        try {
            const response = await Axios({
                ...SummaryApi.deleteCartItem,
                data: { _id: cartId }
            })
            const { data: responseData } = response
            if (responseData.success) {
                toast.success(responseData.message)
                fetchCartItem()
            }
        } catch (error) {
            AxiosToastError(error)
        }
    }

    // Logic to calculate totals whenever cart changes
    useEffect(() => {
        // ✅ FIX: guard against cartItem being undefined/null (not just empty array),
        // which previously crashed this effect and took down the whole provider tree.
        const items = Array.isArray(cartItem) ? cartItem : []

        const qty = items.reduce((prev, curr) => prev + (curr?.quantity || 0), 0)
        setTotalQty(qty)

        const tPrice = items.reduce((prev, curr) => {
            if (!curr?.productId) return prev // skip orphaned cart items (deleted product)
            const priceAfterDiscount = pricewithDiscount(curr.productId.price, curr.productId.discount)
            return prev + (priceAfterDiscount * (curr?.quantity || 0))
        }, 0)
        setTotalPrice(tPrice)

        const notDiscountPrice = items.reduce((prev, curr) => {
            if (!curr?.productId) return prev
            return prev + ((curr.productId.price || 0) * (curr?.quantity || 0))
        }, 0)
        setNotDiscountTotalPrice(notDiscountPrice)
    }, [cartItem])

    const handleLogoutOut = () => {
        localStorage.clear()
        dispatch(handleAddItemCart([]))
    }

    const fetchAddress = async () => {
        try {
            const response = await Axios({ ...SummaryApi.getAddress })
            const { data: responseData } = response
            if (responseData.success) {
                dispatch(handleAddAddress(responseData.data))
            }
        } catch (error) {
            console.log("Address Fetch Error:", error)
        }
    }

    const fetchOrder = async () => {
        try {
            // ✅ FIXED: was SummaryApi.getOrderItems (rider endpoint — returns ALL orders)
            //           now SummaryApi.getOrderDetails (customer endpoint — filters by userId)
            const response = await Axios({ ...SummaryApi.getOrderDetails })
            const { data: responseData } = response
            if (responseData.success) {
                dispatch(setOrder(responseData.data))
            }
        } catch (error) {
            console.log("Order Fetch Error:", error)
        }
    }

    useEffect(() => {
        if (user?._id) {
            fetchCartItem()
            fetchAddress()
            fetchOrder()
        }
    }, [user?._id])

    return (
        <GlobalContext.Provider value={{
            fetchCartItem,
            updateCartItem,
            deleteCartItem,
            fetchAddress,
            handleLogoutOut,
            totalPrice,
            totalQty,
            notDiscountTotalPrice,
            fetchOrder
        }}>
            {children}
        </GlobalContext.Provider>
    )
}

export default GlobalProvider