import { createSlice } from "@reduxjs/toolkit"

// ─── SECURITY FIX: What is and is NOT stored in localStorage ────────────────
//
// STORED   ✅ — non-sensitive display data: name, email, avatar, mobile,
//               address_details, shopping_cart, orderHistory, store_name,
//               restaurantId, verify_email, last_login_date, status.
//
// NOT STORED ❌ — role is NOT persisted to localStorage.
//   Reason: a user who opens DevTools and sets
//     localStorage.user = '{"role":"ADMIN"}'
//   would unlock admin UI components if the frontend trusts localStorage.
//   Role is a server-controlled attribute.  We receive it from the server in
//   the authenticated /api/user/user-details response and keep it only in
//   Redux in-memory state.  On a page refresh it is re-fetched from the
//   server — never reconstructed from localStorage.
//
// TOKENS ❌ — accessToken / refreshToken are NOT in this slice.
//   The logout action below removes them from localStorage as cleanup.
//   Ideally tokens live in httpOnly cookies set by the server so JS never
//   touches them at all.

const emptyUser = {
    _id:             "",
    name:            "",
    email:           "",
    avatar:          "",
    mobile:          "",
    verify_email:    "",
    last_login_date: "",
    status:          "",
    address_details: [],
    shopping_cart:   [],
    orderHistory:    [],
    role:            "",   // in-memory only — never written to localStorage
    store_name:      "",
    restaurantId:    null,
}

// Load non-sensitive display fields from localStorage on startup.
// Role is intentionally excluded — it will be populated by the first
// /api/user/user-details call after mount.
const initialValue = (() => {
    try {
        const stored = localStorage.getItem('user')
        if (stored) {
            const parsed = JSON.parse(stored)
            // Strip role from any previously-stored value as a migration step
            const { role: _ignored, ...safeFields } = parsed
            return { ...emptyUser, ...safeFields, role: "" }
        }
    } catch {
        return emptyUser
    }
    return emptyUser
})()

// Fields that are safe to persist (role is explicitly excluded)
const persistUser = (payload) => {
    const {
        role: _ignored,      // never persist role
        ...safeFields
    } = payload || {}
    localStorage.setItem('user', JSON.stringify(safeFields))
}

const userSlice = createSlice({
    name: 'user',
    initialState: initialValue,
    reducers: {
        setUserDetails: (state, action) => {
            const p = action.payload || {}
            state._id             = p._id
            state.name            = p.name
            state.email           = p.email
            state.avatar          = p.avatar
            state.mobile          = p.mobile
            state.verify_email    = p.verify_email
            state.last_login_date = p.last_login_date
            state.status          = p.status
            state.address_details = p.address_details
            state.shopping_cart   = p.shopping_cart
            state.orderHistory    = p.orderHistory
            state.role            = p.role   // in Redux memory only
            state.store_name      = p.store_name
            state.restaurantId    = p.restaurantId ?? null

            // SECURITY FIX: persist display fields but NOT role
            persistUser(p)
        },

        updatedAvatar: (state, action) => {
            state.avatar = action.payload
            try {
                const stored = localStorage.getItem('user')
                if (stored) {
                    const parsed = JSON.parse(stored)
                    // role is not in stored object, so this is safe
                    localStorage.setItem('user', JSON.stringify({ ...parsed, avatar: action.payload }))
                }
            } catch { /* ignore */ }
        },

        logout: (state) => {
            // Clear localStorage auth artifacts
            localStorage.removeItem('user')
            // SECURITY FIX: single canonical key names (no dual-key aliases)
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('persist:root')

            // Reset Redux state
            return { ...emptyUser }
        },
    },
})

export const { setUserDetails, logout, updatedAvatar } = userSlice.actions
export default userSlice.reducer