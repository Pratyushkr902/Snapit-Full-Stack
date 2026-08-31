import toast from "react-hot-toast"

const AxiosToastError = (error) => {
    const message =
        error?.rateLimitMessage ||
        error?.response?.data?.message ||
        error?.message ||
        'Unable to connect to server. Please check your internet connection and try again.'
    toast.error(message, { duration: 4500 })
}

export default AxiosToastError