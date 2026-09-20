import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const Register = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    useEffect(() => {
        const params = new URLSearchParams(searchParams)
        params.set('mode', 'register')
        navigate(`/login?${params.toString()}`, { replace: true })
    }, [searchParams, navigate])

    return null
}

export default Register
