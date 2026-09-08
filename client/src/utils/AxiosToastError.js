import toast from "react-hot-toast"

const AxiosToastError = (error) => {
    let message =
        error?.rateLimitMessage ||
        error?.response?.data?.message ||
        error?.message ||
        'Unable to connect to server. Please check your internet connection and try again.'

    if (typeof message === 'string') {
        if (message.toLowerCase().includes('network error')) {
            message = 'Unable to reach server. Please check your internet connection and try again.'
        } else if (message.toLowerCase().includes('timeout') || error?.code === 'ECONNABORTED') {
            message = 'Request timed out. Please check your internet connection.'
        }
    }

    toast.error(message, { duration: 4500 })
}

export default AxiosToastError