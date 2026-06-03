import { createSlice } from "@reduxjs/toolkit"

const emptyUser = {
    _id: "", name: "", email: "", avatar: "", mobile: "",
    verify_email: "", last_login_date: "", status: "",
    address_details: [], shopping_cart: [], orderHistory: [], role: ""
}

// ✅ Read saved user instantly on app start — no timing gap
const initialValue = (() => {
    try {
        const stored = localStorage.getItem('user')
        if (stored) return JSON.parse(stored)
    } catch {
        return emptyUser
    }
    return emptyUser
})()

const userSlice = createSlice({
    name: 'user',
    initialState: initialValue,
    reducers: {
        setUserDetails: (state, action) => {
            state._id              = action.payload?._id
            state.name             = action.payload?.name
            state.email            = action.payload?.email
            state.avatar           = action.payload?.avatar
            state.mobile           = action.payload?.mobile
            state.verify_email     = action.payload?.verify_email
            state.last_login_date  = action.payload?.last_login_date
            state.status           = action.payload?.status
            state.address_details  = action.payload?.address_details
            state.shopping_cart    = action.payload?.shopping_cart
            state.orderHistory     = action.payload?.orderHistory
            state.role             = action.payload?.role

            // ✅ Save to localStorage every time user updates
            localStorage.setItem('user', JSON.stringify(action.payload))
        },
        updatedAvatar: (state, action) => {
            state.avatar = action.payload
            const stored = localStorage.getItem('user')
            if (stored) {
                const parsed = JSON.parse(stored)
                localStorage.setItem('user', JSON.stringify({ ...parsed, avatar: action.payload }))
            }
        },
        logout: (state) => {
            // ✅ Clear ALL token variants + persisted Redux state
            localStorage.removeItem('user')
            localStorage.removeItem('accesstoken')
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('refreshtoken')
            localStorage.removeItem('persist:root')  // ✅ CRITICAL FIX

            state._id             = ""
            state.name            = ""
            state.email           = ""
            state.avatar          = ""
            state.mobile          = ""
            state.verify_email    = ""
            state.last_login_date = ""
            state.status          = ""
            state.address_details = []
            state.shopping_cart   = []
            state.orderHistory    = []
            state.role            = ""
        }
    }
})

export const { setUserDetails, logout, updatedAvatar } = userSlice.actions
export default userSlice.reducer