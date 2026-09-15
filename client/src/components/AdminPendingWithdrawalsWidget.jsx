import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import AxiosToastError from '../utils/AxiosToastError'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { IoWarningOutline, IoArrowForward } from 'react-icons/io5'

const AdminPendingWithdrawalsWidget = () => {
  const navigate = useNavigate()
  const [pendingList, setPendingList] = useState([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState(null)

  const fetchPending = async () => {
    try {
      setLoading(true)
      const res = await Axios({
        ...SummaryApi.listWithdrawals,
        params: { status: 'PENDING' },
      })
      if (res.data?.success) {
        const list = (res.data.data || []).filter(w => (w.status || '').toUpperCase() === 'PENDING')
        setPendingList(list)
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPending()
  }, [])

  const handleAction = async (id, action) => {
    if (action === 'APPROVED' && !window.confirm('Confirm you have sent this UPI payment before approving?')) {
      return
    }
    if (action === 'REJECTED' && !window.confirm('Reject this withdrawal and refund the amount back to user wallet?')) {
      return
    }
    try {
      setActingId(id)
      const apiCall = action === 'APPROVED' ? SummaryApi.approveWithdrawal : SummaryApi.rejectWithdrawal
      const res = await Axios({
        ...apiCall,
        data: {
          withdrawalId: id,
          reason: 'Wallet balance is store credit for orders and cannot be withdrawn to UPI.'
        },
      })
      if (res.data?.success) {
        toast.success(action === 'APPROVED' ? 'Withdrawal approved' : 'Withdrawal rejected and refunded to wallet')
        fetchPending()
      }
    } catch (err) {
      AxiosToastError(err)
    } finally {
      setActingId(null)
    }
  }

  if (loading) return null

  if (pendingList.length === 0) {
    return (
      <div className="mb-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:p-4 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="text-emerald-500 text-base">✓</span>
          <span className="font-bold text-slate-700">Wallet Withdrawals:</span>
          <span>0 pending requests</span>
        </div>
        <button
          onClick={() => navigate('/dashboard/super-admin/withdrawals')}
          className="font-black text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          View All <IoArrowForward size={12} />
        </button>
      </div>
    )
  }

  const totalAmount = pendingList.reduce((acc, curr) => acc + (curr.amount || 0), 0)

  return (
    <div className="mb-6 bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs animate-fadeUp">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black animate-pulse">
            <IoWarningOutline size={18} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-amber-950">
              🚨 Action Required: {pendingList.length} Pending Withdrawal Request{pendingList.length > 1 ? 's' : ''}
            </h2>
            <p className="text-xs text-amber-800 font-medium">
              Total: <strong>{DisplayPriceInRupees(totalAmount)}</strong> • Review to prevent unintended cash payouts
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard/super-admin/withdrawals')}
          className="text-xs font-black text-amber-900 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-xl transition-all self-start sm:self-auto flex items-center gap-1"
        >
          Manage All <IoArrowForward size={13} />
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        {pendingList.map(w => {
          const customer = w.userId || w.user || {}
          const name = customer.name || 'Customer'
          const email = customer.email || ''
          const mobile = customer.mobile ? String(customer.mobile) : ''

          return (
            <div
              key={w._id}
              className="bg-white border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900">{name}</span>
                  <span className="text-[11px] font-bold text-slate-500">
                    {email || mobile}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  UPI: <strong className="font-mono text-slate-900">{w.upiId || 'N/A'}</strong> • Requested{' '}
                  {new Date(w.createdAt).toLocaleDateString('en-IN')}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span className="text-base font-black text-emerald-600">
                  {DisplayPriceInRupees(w.amount)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={actingId === w._id}
                    onClick={() => handleAction(w._id, 'APPROVED')}
                    className="text-[11px] font-black bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={actingId === w._id}
                    onClick={() => handleAction(w._id, 'REJECTED')}
                    className="text-[11px] font-black bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                  >
                    Reject & Refund
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AdminPendingWithdrawalsWidget

