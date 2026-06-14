import Axios from './Axios'
import SummaryApi from '../common/SummaryApi'

// ─── SECURITY FIX: Do NOT read the token here ──────────────────────────────
// OLD (insecure):
//   const token = localStorage.getItem('accessToken') || localStorage.getItem('accesstoken')
//   if (!token) return null
//
// The Axios request interceptor in Axios.js already injects the Authorization
// header from localStorage.  Reading it again here is redundant and creates
// a second place where the token key name must be kept in sync.
//
// More importantly, this check was a client-side auth gate — it prevented the
// /user-details call if the localStorage token was missing.  But if the server
// uses httpOnly cookie auth (the goal), there is no client-readable token at
// all, so this guard would always return null even for logged-in users.
//
// The correct pattern: always call /user-details; let the server's 401 response
// be the authoritative signal that the user is not authenticated.

const fetchUserDetails = async () => {
    try {
        const response = await Axios({
            ...SummaryApi.userDetails,
        })
        return response.data
    } catch (error) {
        // 401 = not logged in — expected, not an error
        if (error?.response?.status === 401) return null
        console.error('[fetchUserDetails]', error?.message)
        return null
    }
}

export default fetchUserDetails