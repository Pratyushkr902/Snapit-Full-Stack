import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const Register = () => {
    const [searchParams] = useSearchParams()
    const refCode = searchParams.get('ref') || ''
    const navigate = useNavigate()

    useEffect(() => {
        navigate(refCode ? `/login?ref=${refCode}` : '/login', { replace: true })
    }, [refCode, navigate])

    return null
}

export default Register
