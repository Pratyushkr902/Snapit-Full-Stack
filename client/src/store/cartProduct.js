import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    cart : []
}

const cartSlice = createSlice({
    name : "cartItem",
    initialState : initialState,
    reducers : {
        handleAddItemCart : (state, action) => {
            // ✅ FIXED: Guard rail guarantees the spread operator never spreads null/undefined
            if (action.payload && Array.isArray(action.payload)) {
                state.cart = [...action.payload]
            } else if (!action.payload) {
                state.cart = []
            }
        },
        // ✅ NEW: Explicit clean modifier to handle user logouts or completed checkouts safely
        clearCart : (state) => {
            state.cart = []
        }
    }
})

export const { handleAddItemCart, clearCart } = cartSlice.actions

export default cartSlice.reducer