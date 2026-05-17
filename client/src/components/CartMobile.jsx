import React from 'react'
import { useGlobalContext } from '../provider/GlobalProvider'
import { FaCartShopping } from 'react-icons/fa6'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { Link } from 'react-router-dom'
import { FaCaretRight } from "react-icons/fa"
import { useSelector } from 'react-redux'

// ─── FIXED: Was merged with CardLoading in one file (parse error) ─────────────
// ─── FIXED: sticky → fixed so it stays anchored during scroll ────────────────
// ─── IMPROVED: Better visual treatment — pill shape, safe-area padding ────────

const CartMobileLink = () => {
  const { totalPrice, totalQty } = useGlobalContext()
  const cartItem = useSelector(state => state.cartItem.cart)

  if (!cartItem[0]) return null

  return (
    // ─── FIXED: fixed positioning + pb-safe for iOS home indicator ───────────
    <div className='fixed bottom-0 left-0 right-0 z-50 px-3 pb-4 pb-[env(safe-area-inset-bottom)] lg:hidden'>
      <Link
        to="/cart"
        className='flex items-center justify-between bg-green-600 active:bg-green-700 px-4 py-3 rounded-2xl shadow-2xl shadow-green-900/30 transition-all active:scale-[0.98]'
      >
        <div className='flex items-center gap-3'>
          {/* ─── IMPROVED: Item count badge ──────────────────────────────── */}
          <div className='bg-green-500 rounded-xl px-2 py-1.5 flex items-center gap-1.5'>
            <FaCartShopping className='text-white' size={15} />
            <span className='text-white text-xs font-bold'>{totalQty}</span>
          </div>
          <div className='text-white'>
            <p className='text-xs font-semibold leading-none'>{totalQty} item{totalQty > 1 ? 's' : ''} in cart</p>
            <p className='text-[11px] opacity-80 mt-0.5'>{DisplayPriceInRupees(totalPrice)}</p>
          </div>
        </div>

        <div className='flex items-center gap-1 text-white'>
          <span className='text-sm font-bold'>View Cart</span>
          <FaCaretRight size={14} />
        </div>
      </Link>
    </div>
  )
}

export default CartMobileLink