import React, { useState } from 'react'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'

// Your UPI ID — change this to your actual UPI ID
const SNAPIT_UPI_ID = "00pr1199@oksbi"
const SNAPIT_NAME = "Snapit Grocery"

const CollectPayment = ({ order, onSuccess }) => {
    const [method, setMethod] = useState(null) // 'cash' | 'upi'
    const [cashReceived, setCashReceived] = useState('')
    const [confirming, setConfirming] = useState(false)
    const [upiConfirmed, setUpiConfirmed] = useState(false)

    const amount = order?.totalAmt || 0
    const change = cashReceived ? Math.max(0, Number(cashReceived) - amount) : 0

    // Generate UPI deep link + QR
    const upiLink = `upi://pay?pa=${SNAPIT_UPI_ID}&pn=${encodeURIComponent(SNAPIT_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Order ' + order?.orderId?.slice(-6))}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`

    const handleConfirmPayment = async () => {
        try {
            setConfirming(true)
            const response = await Axios({
                ...SummaryApi.updateOrderStatus,
                data: {
                    orderId: order._id,
                    delivery_status: 'Delivered',
                    payment_status: method === 'upi' ? 'UPI' : 'CASH ON DELIVERY',
                    isSettled: method === 'upi' // UPI is instantly settled, cash needs manual settle
                }
            })
            if (response.data.success) {
                toast.success(method === 'upi' ? '✅ UPI Payment Confirmed!' : '✅ Cash Collected!')
                if (onSuccess) onSuccess()
            }
        } catch (error) {
            toast.error('Failed to update order')
        } finally {
            setConfirming(false)
        }
    }

    if (!order) return null

    return (
        <div className='fixed inset-0 bg-black/60 z-50 flex items-end lg:items-center justify-center p-4'>
            <div className='bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto'>

                {/* Header */}
                <div className='p-5 border-b border-slate-100'>
                    <p className='text-[11px] font-bold text-slate-400 uppercase tracking-widest'>Collect Payment</p>
                    <p className='text-2xl font-black text-slate-900 mt-1'>{DisplayPriceInRupees(amount)}</p>
                    <p className='text-xs text-slate-400 font-mono mt-0.5'>Order #{order?.orderId?.slice(-8)}</p>
                </div>

                {/* Payment Method Selection */}
                {!method && (
                    <div className='p-5 flex flex-col gap-3'>
                        <p className='text-sm font-bold text-slate-600 mb-1'>Choose payment method:</p>

                        {/* UPI Option */}
                        <button
                            onClick={() => setMethod('upi')}
                            className='flex items-center gap-4 p-4 border-2 border-blue-100 bg-blue-50 rounded-2xl hover:border-blue-400 transition-all active:scale-95'
                        >
                            <div className='w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-black'>₹</div>
                            <div className='text-left'>
                                <p className='font-black text-slate-800'>UPI / QR Code</p>
                                <p className='text-xs text-slate-500'>Show QR to customer for instant payment</p>
                            </div>
                            <span className='ml-auto text-blue-500 text-lg'>›</span>
                        </button>

                        {/* Cash Option */}
                        <button
                            onClick={() => setMethod('cash')}
                            className='flex items-center gap-4 p-4 border-2 border-green-100 bg-green-50 rounded-2xl hover:border-green-400 transition-all active:scale-95'
                        >
                            <div className='w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-2xl'>💵</div>
                            <div className='text-left'>
                                <p className='font-black text-slate-800'>Cash on Delivery</p>
                                <p className='text-xs text-slate-500'>Collect cash and calculate change</p>
                            </div>
                            <span className='ml-auto text-green-500 text-lg'>›</span>
                        </button>
                    </div>
                )}

                {/* UPI QR Screen */}
                {method === 'upi' && (
                    <div className='p-5 flex flex-col items-center gap-4'>
                        <div className='bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-sm'>
                            <img src={qrUrl} alt='UPI QR Code' className='w-52 h-52' />
                        </div>

                        <div className='text-center'>
                            <p className='font-black text-slate-800 text-lg'>{DisplayPriceInRupees(amount)}</p>
                            <p className='text-xs text-slate-400 mt-1'>Scan with any UPI app</p>
                            <div className='flex gap-2 justify-center mt-2'>
                                {['PhonePe', 'GPay', 'Paytm', 'BHIM'].map(app => (
                                    <span key={app} className='text-[10px] bg-slate-100 px-2 py-1 rounded-full font-bold text-slate-500'>{app}</span>
                                ))}
                            </div>
                        </div>

                        <div className='w-full bg-slate-50 rounded-xl p-3 flex items-center gap-2'>
                            <span className='text-xs text-slate-500 font-mono flex-1 truncate'>{SNAPIT_UPI_ID}</span>
                            <button
                                onClick={() => { navigator.clipboard.writeText(SNAPIT_UPI_ID); toast.success('UPI ID copied!') }}
                                className='text-xs font-bold text-blue-600 flex-shrink-0'
                            >
                                Copy
                            </button>
                        </div>

                        {/* Open in UPI App */}
                        <a
                            href={upiLink}
                            className='w-full bg-blue-600 text-white font-black py-3 rounded-2xl text-center text-sm active:scale-95 transition-all'
                        >
                            Open UPI App
                        </a>

                        {/* Confirm payment received */}
                        <div className='w-full border-t pt-4'>
                            <label className='flex items-center gap-3 cursor-pointer'>
                                <input
                                    type='checkbox'
                                    checked={upiConfirmed}
                                    onChange={e => setUpiConfirmed(e.target.checked)}
                                    className='w-5 h-5 accent-green-600'
                                />
                                <span className='text-sm font-bold text-slate-700'>Customer has paid ✅</span>
                            </label>
                        </div>

                        <button
                            onClick={handleConfirmPayment}
                            disabled={!upiConfirmed || confirming}
                            className='w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-4 rounded-2xl text-sm transition-all active:scale-95'
                        >
                            {confirming ? 'Confirming...' : 'Confirm & Mark Delivered'}
                        </button>

                        <button onClick={() => setMethod(null)} className='text-sm text-slate-400 font-bold'>← Back</button>
                    </div>
                )}

                {/* Cash Screen */}
                {method === 'cash' && (
                    <div className='p-5 flex flex-col gap-4'>
                        <div className='bg-green-50 rounded-2xl p-4 text-center'>
                            <p className='text-sm font-bold text-green-700'>Amount to Collect</p>
                            <p className='text-3xl font-black text-green-800 mt-1'>{DisplayPriceInRupees(amount)}</p>
                        </div>

                        {/* Quick amount buttons */}
                        <div>
                            <p className='text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider'>Customer gave:</p>
                            <div className='grid grid-cols-3 gap-2 mb-3'>
                                {[amount, Math.ceil(amount / 10) * 10, Math.ceil(amount / 50) * 50, Math.ceil(amount / 100) * 100, 200, 500].filter((v, i, a) => a.indexOf(v) === i).slice(0, 6).map(val => (
                                    <button
                                        key={val}
                                        onClick={() => setCashReceived(String(val))}
                                        className={`py-2.5 rounded-xl font-black text-sm border-2 transition-all ${Number(cashReceived) === val ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                    >
                                        ₹{val}
                                    </button>
                                ))}
                            </div>

                            <input
                                type='number'
                                value={cashReceived}
                                onChange={e => setCashReceived(e.target.value)}
                                placeholder='Enter custom amount'
                                className='w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-slate-800 outline-none focus:border-green-400'
                            />
                        </div>

                        {/* Change calculator */}
                        {cashReceived && Number(cashReceived) >= amount && (
                            <div className='bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 text-center'>
                                <p className='text-sm font-bold text-yellow-700'>Return to Customer</p>
                                <p className='text-3xl font-black text-yellow-800 mt-1'>{DisplayPriceInRupees(change)}</p>
                            </div>
                        )}

                        {cashReceived && Number(cashReceived) < amount && (
                            <div className='bg-red-50 border-2 border-red-100 rounded-2xl p-3 text-center'>
                                <p className='text-sm font-black text-red-600'>⚠️ Amount is less than total</p>
                            </div>
                        )}

                        <button
                            onClick={handleConfirmPayment}
                            disabled={!cashReceived || Number(cashReceived) < amount || confirming}
                            className='w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-4 rounded-2xl text-sm transition-all active:scale-95'
                        >
                            {confirming ? 'Confirming...' : '✅ Cash Collected — Mark Delivered'}
                        </button>

                        <button onClick={() => setMethod(null)} className='text-sm text-slate-400 font-bold text-center'>← Back</button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default CollectPayment