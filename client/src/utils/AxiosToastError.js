import toast from "react-hot-toast"
import axios from "axios"

let lastNetworkToastTime = 0
const NETWORK_TOAST_THROTTLE_MS = 8000 // At most 1 network alert per 8 seconds

const AxiosToastError = (error) => {
    // 1. Silently ignore canceled or aborted requests (navigation / search debouncing)
    if (
        axios.isCancel(error) ||
        error?.name === 'CanceledError' ||
        error?.code === 'ERR_CANCELED' ||
        error?.message === 'canceled'
    ) {
        return
    }

    let rawMessage =
        error?.rateLimitMessage ||
        error?.response?.data?.message ||
        error?.message ||
        ''

    const isNetworkError =
        !error?.response ||
        (typeof rawMessage === 'string' && rawMessage.toLowerCase().includes('network error')) ||
        error?.code === 'ECONNABORTED' ||
        error?.code === 'ERR_NETWORK'

    // 2. Throttle duplicate network errors
    if (isNetworkError) {
        const now = Date.now()
        if (now - lastNetworkToastTime < NETWORK_TOAST_THROTTLE_MS) {
            return // Skip duplicate
        }
        lastNetworkToastTime = now

        toast.error('Weak signal. Reconnecting...', {
            id: 'network-status-toast',
            duration: 3500,
            icon: '📶'
        })
        return
    }

    // 3. User action or API-specific error
    const displayMessage = rawMessage || 'Something went wrong. Please try again.'
    toast.error(displayMessage, { duration: 4000 })
}

export default AxiosToastError