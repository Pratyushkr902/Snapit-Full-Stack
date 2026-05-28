import Axios from './Axios'
import SummaryApi from '../common/SummaryApi'

const fetchUserDetails = async () => {
    try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('accesstoken')
        if (!token) return null

        const response = await Axios({
            ...SummaryApi.userDetails
        })
        return response.data
    } catch (error) {
        return null
    }
}

export default fetchUserDetails
