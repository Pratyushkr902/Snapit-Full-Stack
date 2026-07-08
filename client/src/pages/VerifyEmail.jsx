import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'

const VerifyEmail = () => {
    const [searchParams] = useSearchParams()
    const code = searchParams.get('code')

    // status: "verifying" | "success" | "error"
    const [status, setStatus] = useState('verifying')
    const [message, setMessage] = useState('Verifying your email, please wait...')

    useEffect(() => {
        const verify = async () => {
            if (!code) {
                setStatus('error')
                setMessage('This verification link is invalid or missing a code.')
                return
            }

            try {
                const response = await Axios({
                    ...SummaryApi.verify_email,
                    data: { code }
                })

                if (response.data.success) {
                    setStatus('success')
                    setMessage(response.data.message || 'Your email has been verified successfully.')
                } else {
                    setStatus('error')
                    setMessage(response.data.message || 'We could not verify your email.')
                }
            } catch (error) {
                setStatus('error')
                setMessage(
                    error?.response?.data?.message ||
                    'This verification link is invalid or has expired.'
                )
            }
        }

        verify()
    }, [code])

    return (
        <section className='w-full container mx-auto px-2'>
            <div className='bg-white my-4 w-full max-w-lg mx-auto rounded p-7 text-center'>
                <p className='font-semibold text-lg mb-4'>Email Verification</p>

                {status === 'verifying' && (
                    <p className='text-gray-600'>{message}</p>
                )}

                {status === 'success' && (
                    <p className='text-green-700 font-medium'>{message}</p>
                )}

                {status === 'error' && (
                    <p className='text-red-600 font-medium'>{message}</p>
                )}

                <p className='mt-6'>
                    <Link to={"/login"} className='font-semibold text-green-700 hover:text-green-800'>
                        Go to Login
                    </Link>
                </p>
            </div>
        </section>
    )
}

export default VerifyEmail