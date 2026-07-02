import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoArrowBack } from 'react-icons/io5'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'

const STATUS_STYLE = {
    'Pending':      'bg-yellow-100 text-yellow-800',
    'Under Review': 'bg-blue-100 text-blue-800',
    'Approved':     'bg-green-100 text-green-800',
    'Refunded':     'bg-emerald-100 text-emerald-800',
    'Rejected':     'bg-red-100 text-red-800',
}

const REASON_LABEL = {
    wrong_product:   '📦 Wrong item',
    expired_product: '🗓 Expired',
    damaged_product: '💔 Damaged',
    missing_item:    '➖ Missing item',
    other:           '💬 Other',
}

const AdminRefunds = () => {
    const navigate = useNavigate()
    const [refunds,    setRefunds]    = useState([])
    const [loading,    setLoading]    = useState(true)
    const [resolving,  setResolving]  = useState(null)
    const [adminNote,  setAdminNote]  = useState({})
    const [filterStatus, setFilter]  = useState('all')

    const fetchRefunds = async () => {
        try {
            setLoading(true)
            const res = await Axios({ ...SummaryApi.getAllRefunds })
            if (res.data.success) setRefunds(res.data.data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchRefunds() }, [])

    const resolve = async (refundId, status, refundMethod) => {
        try {
            setResolving(refundId)
            const res = await Axios({
                ...SummaryApi.resolveRefund,
                data: { refundId, status, adminNote: adminNote[refundId] || "", refundMethod }
            })
            if (res.data.success) {
                toast.success(`Refund ${status}`)
                fetchRefunds()
            }
        } catch (err) {
            AxiosToastError(err)
        } finally {
            setResolving(null)
        }
    }

    const filtered = filterStatus === 'all' ? refunds : refunds.filter(r => r.status === filterStatus)

    return (
        <section className='min-h-screen bg-gray-50 p-4'>
            <div className='max-w-4xl mx-auto'>
                <div className='flex items-center gap-3 mb-1'>
                    <button
                        onClick={() => navigate(-1)}
                        className='text-neutral-500 hover:text-neutral-800 transition-colors'
                    >
                        <IoArrowBack size={22} />
                    </button>
                    <h1 className='text-xl font-black text-gray-900'>Refund Requests</h1>
                </div>
                <p className='text-sm text-gray-400 mb-5'>{refunds.length} total · {refunds.filter(r => r.status === 'Pending').length} pending</p>

                <div className='flex gap-2 flex-wrap mb-5'>
                    {['all','Pending','Under Review','Approved','Refunded','Rejected'].map(s => (
                        <button key={s} onClick={() => setFilter(s)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                filterStatus === s ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500'
                            }`}>
                            {s === 'all' ? 'All' : s}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className='flex justify-center mt-20'>
                        <div className='w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin' />
                    </div>
                ) : (
                    <div className='flex flex-col gap-4'>
                        {filtered.map(r => (
                            <div key={r._id} className='bg-white rounded-2xl border border-gray-100 p-5 shadow-sm'>
                                <div className='flex items-start justify-between mb-3'>
                                    <div>
                                        <p className='text-xs text-gray-400 font-mono'>{r.orderId?.orderId}</p>
                                        <p className='text-sm font-bold text-gray-800 mt-0.5'>{REASON_LABEL[r.reason]}</p>
                                        <p className='text-xs text-gray-500 mt-0.5'>
                                            {r.userId?.name} · {r.userId?.mobile || r.userId?.email}
                                        </p>
                                    </div>
                                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[r.status]}`}>
                                        {r.status}
                                    </span>
                                </div>

                                {r.photos?.length > 0 && (
                                    <div className='flex gap-2 mb-3'>
                                        {r.photos.map((p,i) => (
                                            <a key={i} href={p} target='_blank' rel='noreferrer'>
                                                <img src={p} alt="" className='w-16 h-16 rounded-xl object-cover border border-gray-100 hover:opacity-80 transition-all' />
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {r.description && (
                                    <p className='text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 mb-3 italic'>"{r.description}"</p>
                                )}

                                <div className='bg-gray-50 rounded-xl p-3 mb-3'>
                                    <p className='text-[10px] font-black text-gray-400 uppercase mb-1'>Affected items</p>
                                    {r.affectedItems?.map((item, i) => (
                                        <div key={i} className='flex justify-between text-xs text-gray-700 py-0.5'>
                                            <span>{item.name} × {item.quantity}</span>
                                            <span className='font-semibold'>₹{item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                    <div className='flex justify-between text-sm font-black text-green-700 mt-2 pt-2 border-t border-gray-200'>
                                        <span>Refund amount</span>
                                        <span>₹{r.refundAmount?.toFixed(2)}</span>
                                    </div>
                                </div>

                                {r.status === 'Pending' || r.status === 'Under Review' ? (
                                    <div className='flex flex-col gap-2'>
                                        <input
                                            value={adminNote[r._id] || ''}
                                            onChange={e => setAdminNote(prev => ({ ...prev, [r._id]: e.target.value }))}
                                            placeholder='Admin note (optional)'
                                            className='w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-green-300'
                                        />
                                        <div className='flex gap-2'>
                                            <button
                                                onClick={() => resolve(r._id, 'Refunded', r.refundMethod || 'wallet')}
                                                disabled={resolving === r._id}
                                                className='flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-xs font-black transition-all'
                                            >
                                                {resolving === r._id ? '...' : '✅ Approve & Refund to Wallet'}
                                            </button>
                                            <button
                                                onClick={() => resolve(r._id, 'Rejected', '')}
                                                disabled={resolving === r._id}
                                                className='flex-1 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black border border-red-200 transition-all'
                                            >
                                                ❌ Reject
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className='text-xs text-gray-400'>
                                        Resolved {r.resolvedAt ? new Date(r.resolvedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : ''}
                                        {r.adminNote && <span className='ml-2 italic'>"{r.adminNote}"</span>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}

export default AdminRefunds