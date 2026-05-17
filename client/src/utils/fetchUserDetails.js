import Axios from './Axios'
import SummaryApi from '../common/SummaryApi'

const fetchUserDetails = async () => {
    // ✅ Guard: don't call the API if there's no token
    // This prevents the 401 on app load when user is not logged in
    const token = localStorage.getItem('accesstoken') || localStorage.getItem('accessToken')
    if (!token) return null

    try {
        const response = await Axios({
            ...SummaryApi.userDetails
        })
        return response.data
    } catch (error) {
        // Silently fail — user is simply not logged in
        return null
    }
}

export default fetchUserDetails