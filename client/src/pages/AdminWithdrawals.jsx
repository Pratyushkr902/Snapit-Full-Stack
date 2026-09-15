import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import AxiosToastError from '../utils/AxiosToastError'
import SuperAdminPermision from '../layouts/SuperAdminPermision'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import { IoCopyOutline, IoRefreshOutline, IoArrowBack } from 'react-icons/io5'

const AdminWithdrawals = () => {
  const navigate = useNavigate()
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState(null)
  const [activeTab, setActiveTab] = useState('ALL') // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [rejectModalId, setRejectModalId] = useState(null)
  const [rejectReason, setRejectReason] = useState('Wallet balance is store credit for orders on Snapit and cannot be withdrawn to UPI.')

  const fetchWithdrawals = async () => {
    try {
      setLoading(true)
      const response = await Axios({ ...SummaryApi.listWithdrawals })
      if (response.data.success) {
        setWithdrawals(response.data.data || [])
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWithdrawals()
  }, [])

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this withdrawal? Make sure you have transferred the amount via UPI first.')) {
      return
    }
    try {
      setActingId(id)
      const response = await Axios({
        ...SummaryApi.approveWithdrawal,
        data: { withdrawalId: id },
      })
      if (response.data.success) {
        toast.success('Withdrawal marked as approved & paid')
        fetchWithdrawals()
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setActingId(null)
    }
  }

  const handleReject = async () => {
    if (!rejectModalId) return
    try {
      setActingId(rejectModalId)
      const response = await Axios({
        ...SummaryApi.rejectWithdrawal,
        data: {
          withdrawalId: rejectModalId,
          reason: rejectReason.trim() || 'Wallet balance is store credit for orders and cannot be withdrawn to UPI.'
        },
      })
      if (response.data.success) {
        toast.success('Withdrawal rejected and refunded back to user wallet')
        setRejectModalId(null)
        fetchWithdrawals()
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setActingId(null)
    }
  }

  const copyToClipboard = (text, label) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied!`)
  }

  const filteredWithdrawals = useMemo(() => {
    if (activeTab === 'ALL') return withdrawals
    return withdrawals.filter(w => (w.status || '').toUpperCase() === activeTab)
  }, [withdrawals, activeTab])

  const pendingCount = withdrawals.filter(w => (w.status || '').toUpperCase() === 'PENDING').length

  return (
    <SuperAdminPermision>
      <div className="pt-safe-header px-4 sm:px-6 pb-24 max-w-5xl mx-auto w-full">
        {/* Navigation / Header */}
        <div className="flex items-center justify-between mt-4 mb-6">
          <button
            onClick={() => navigate('/dashboard/super-admin')}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-xs transition-all"
          >
            <IoArrowBack size={16} /> Super Admin Panel
          </button>
          <button
            onClick={fetchWithdrawals}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-all"
          >
            <IoRefreshOutline size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900">
                🏦 Withdrawal Requests
              </h1>
              {pendingCount > 0 && (
                <span className="bg-amber-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-xs animate-pulse">
                  {pendingCount} PENDING
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Review, approve UPI payouts, or refund non-withdrawable amounts back to user wallet.
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6 overflow-x-auto">
          {[
            { key: 'ALL', label: `All (${withdrawals.length})` },
            { key: 'PENDING', label: `Pending (${pendingCount})` },
            { key: 'APPROVED', label: `Approved (${withdrawals.filter(w => w.status === 'APPROVED').length})` },
            { key: 'REJECTED', label: `Rejected (${withdrawals.filter(w => w.status === 'REJECTED').length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`text-xs font-black px-4 py-2 rounded-xl transition-all ${
                activeTab === tab.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-xs">
            <div className="inline-block animate-spin text-2xl mb-2">⏳</div>
            <p className="text-sm font-bold text-slate-500">Loading withdrawal requests...</p>
          </div>
        ) : filteredWithdrawals.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-xs">
            <p className="text-3xl mb-2">🎉</p>
            <p className="text-sm font-extrabold text-slate-700">No {activeTab.toLowerCase()} withdrawal requests</p>
            <p className="text-xs text-slate-400 mt-1">Requests will appear here when users submit UPI withdrawal requests.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredWithdrawals.map(w => {
              const customer = w.userId || w.user || {}
              const customerName = customer.name || 'Unknown User'
              const customerEmail = customer.email || 'No email'
              const customerMobile = customer.mobile ? String(customer.mobile) : ''
              const isPending = w.status === 'PENDING'
              const isApproved = w.status === 'APPROVED'

              return (
                <div
                  key={w._id}
                  className={`bg-white border rounded-2xl p-5 shadow-xs transition-all ${
                    isPending ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Customer & Info */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-base font-black text-slate-900">
                          {customerName}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : isApproved
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {w.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 font-medium mt-2">
                        <div>
                          <span className="text-slate-400 font-semibold">Email: </span>
                          <span className="font-bold text-slate-800">{customerEmail}</span>
                        </div>
                        {customerMobile && (
                          <div>
                            <span className="text-slate-400 font-semibold">Phone: </span>
                            <a href={`tel:${customerMobile}`} className="font-bold text-blue-600 hover:underline">
                              {customerMobile}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 sm:col-span-2 mt-1">
                          <span className="text-slate-400 font-semibold">UPI ID: </span>
                          <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-mono text-xs">
                            {w.upiId || 'N/A'}
                          </span>
                          {w.upiId && (
                            <button
                              onClick={() => copyToClipboard(w.upiId, 'UPI ID')}
                              className="text-slate-400 hover:text-slate-700 p-0.5"
                              title="Copy UPI ID"
                            >
                              <IoCopyOutline size={14} />
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 sm:col-span-2">
                          Requested on {new Date(w.createdAt).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: true
                          })}
                          {w.processedAt && ` • Processed ${new Date(w.processedAt).toLocaleDateString('en-IN')}`}
                        </div>
                        {w.adminNote && (
                          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2 mt-2 sm:col-span-2">
                            <strong>Note / Reason:</strong> {w.adminNote}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 gap-3">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 font-bold block">Amount</span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-600">
                          {DisplayPriceInRupees(w.amount)}
                        </span>
                      </div>

                      {isPending && (
                        <div className="flex items-center gap-2">
                          <button
                            disabled={actingId === w._id}
                            onClick={() => handleApprove(w._id)}
                            className="text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3.5 py-2 rounded-xl shadow-xs transition-all disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            disabled={actingId === w._id}
                            onClick={() => {
                              setRejectModalId(w._id)
                              setRejectReason('Wallet balance is store credit for orders on Snapit and cannot be withdrawn to UPI.')
                            }}
                            className="text-xs font-black bg-rose-600 hover:bg-rose-700 active:scale-95 text-white px-3.5 py-2 rounded-xl shadow-xs transition-all disabled:opacity-50"
                          >
                            Reject & Refund
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Reject Reason Modal */}
        {rejectModalId && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fadeUp">
              <h3 className="text-lg font-black text-slate-900 mb-2">
                Reject & Refund to Wallet
              </h3>
              <p className="text-xs text-slate-500 font-semibold mb-4 leading-relaxed">
                The withdrawal amount will be instantly credited back to the customer&apos;s Snapit wallet balance.
              </p>

              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason / Customer Note:
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-medium"
                placeholder="Explain why this withdrawal is rejected..."
              />

              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setRejectModalId(null)}
                  className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actingId === rejectModalId}
                  onClick={handleReject}
                  className="text-xs font-black bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  Confirm Reject & Refund
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminPermision>
  )
}

export default AdminWithdrawals
