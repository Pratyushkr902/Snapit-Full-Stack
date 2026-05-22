import React from 'react'
import { useNavigate } from 'react-router-dom'
import DisplayCartItem from '../components/DisplayCartItem'

const CartMobile = () => {
  const navigate = useNavigate()
  return (
    <DisplayCartItem close={() => navigate(-1)} />
  )
}

export default CartMobile