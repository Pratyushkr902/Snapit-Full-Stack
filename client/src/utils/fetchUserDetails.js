import Axios from './Axios'
import SummaryApi from '../common/SummaryApi'
import { Preferences } from '@capacitor/preferences' // 🚀 Native persistent storage plugin

const fetchUserDetails = async () => {
    try {
        // Read directly from secure native Android SharedPreferences
        const { value: token } = await Preferences.get({ 
            key: 'accessToken' 
        })
        
        // If there's no native token recorded, abort instantly to stop 401 errors
        if (!token) return null

        const response = await Axios({
            ...SummaryApi.userDetails
        })
        return response.data
    } catch (error) {
        // Silently fail if session expires or network is dropped
        return null
    }
}

export default fetchUserDetails