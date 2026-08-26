import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'

const AdminTreasury = () => {
  const navigate = useNavigate()
  const user = useSelector(state => state.user)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Modals
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [showDistributeModal, setShowDistributeModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Forms
  const [depositForm, setDepositForm] = useState({
    amount: '',
    paymentMethod: 'CASH',
    notes: '',
    referenceId: '',
  })

  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    partner: isSuperAdmin ? 'SUPER_ADMIN' : 'PARTNER_ADMIN',
    paymentMethod: 'CASH',
    notes: '',
    referenceId: '',
  })

  const [distributeAmount, setDistributeAmount] = useState('')

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true)
      const res = await Axios({ ...SummaryApi.getTreasurySummary })
      if (res.data?.success) {
        setData(res.data.data)
      }
    } catch (err) {
      AxiosToastError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const handleDepositSubmit = async (e) => {
    e.preventDefault()
    const amt = Number(depositForm.amount)
    if (!amt || amt <= 0) return toast.error('Please enter a valid deposit amount')

    try {
      setSubmitting(true)
      const res = await Axios({
        ...SummaryApi.recordTreasuryDeposit,
        data: depositForm,
      })
      if (res.data?.success) {
        toast.success(res.data.message || 'Deposit credited to your Snapit Wallet! 💵')
        setShowDepositModal(false)
        setDepositForm({ amount: '', paymentMethod: 'CASH', notes: '', referenceId: '' })
        fetchSummary()
      }
    } catch (err) {
      AxiosToastError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault()
    const amt = Number(withdrawForm.amount)
    if (!amt || amt <= 0) return toast.error('Please enter a valid withdrawal amount')

    try {
      setSubmitting(true)
      const res = await Axios({
        ...SummaryApi.recordTreasuryWithdrawal,
        data: withdrawForm,
      })
      if (res.data?.success) {
        toast.success(res.data.message || 'Withdrawal debited from Snapit Wallet! 💸')
        setShowWithdrawModal(false)
        setWithdrawForm({
          amount: '',
          partner: isSuperAdmin ? 'SUPER_ADMIN' : 'PARTNER_ADMIN',
          paymentMethod: 'CASH',
          notes: '',
          referenceId: '',
        })
        fetchSummary()
      }
    } catch (err) {
      AxiosToastError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDistributeSubmit = async (e) => {
    e.preventDefault()
    const amt = Number(distributeAmount)
    if (!amt || amt <= 0) return toast.error('Please enter a valid distribution amount')

    try {
      setSubmitting(true)
      const res = await Axios({
        ...SummaryApi.distributeCodToWallets,
        data: { amount: amt },
      })
      if (res.data?.success) {
        toast.success(res.data.message || 'COD revenue credited to partner Snapit Wallets! 🎉')
        setShowDistributeModal(false)
        setDistributeAmount('')
        fetchSummary()
      }
    } catch (err) {
      AxiosToastError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const summary = data?.summary
  const transactions = data?.transactions || []

  return (
    <div className='p-4 sm:p-6 max-w-6xl mx-auto font-sans min-h-screen pb-24'>
      {/* Header */}
      <div className='flex flex-wrap items-center justify-between gap-4 mb-6'>
        <div>
          <button
            onClick={() => navigate(isSuperAdmin ? '/dashboard/super-admin' : '/dashboard/admin-summary')}
            className='text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 mb-2 transition-colors'
          >
            ← Back to Dashboard
          </button>
          <h1 className='text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5'>
            💰 COD Treasury & Real Money Wallet
          </h1>
          <p className='text-xs sm:text-sm text-slate-500 font-medium mt-1'>
            Deposits and COD cash are directly synced and credited into Snapit App Wallets for spending or UPI withdrawal
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={() => navigate('/wallet')}
            className='px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 font-black text-xs flex items-center gap-1.5 transition-all'
          >
            <span>👛</span> My Snapit Wallet ({DisplayPriceInRupees(summary?.currentUserWalletBalance || 0)})
          </button>
          <span className={`px-3 py-2 rounded-2xl text-xs font-black uppercase tracking-wider ${
            isSuperAdmin ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
          }`}>
            {isSuperAdmin ? '👑 Super Admin' : '🛡️ Admin'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className='flex flex-col items-center justify-center py-20 text-slate-400'>
          <div className='w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3' />
          <p className='text-sm font-semibold'>Loading treasury ledger & calculations...</p>
        </div>
      ) : (
        <>
          {/* HERO WALLET BALANCE CARD */}
          <div className='bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-6 relative overflow-hidden'>
            <div className='absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none' />
            <div className='absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-400/10 rounded-full blur-xl pointer-events-none' />

            <div className='relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6'>
              <div>
                <div className='flex items-center gap-2 text-emerald-200 text-xs sm:text-sm font-bold uppercase tracking-wider mb-2'>
                  <span>🏛️ Available Cash Treasury Pool</span>
                </div>
                <div className='text-3xl sm:text-5xl font-black text-white tracking-tight'>
                  {DisplayPriceInRupees(summary?.availableCashBalance || 0)}
                </div>
                <p className='text-emerald-200/80 text-xs sm:text-sm mt-2 font-medium'>
                  Live COD Cash ({summary?.codOrderCount || 0} orders) + Manual Deposits − Partner Withdrawals
                </p>
              </div>

              {/* Action Buttons */}
              <div className='flex flex-wrap items-center gap-2.5'>
                <button
                  onClick={() => setShowDepositModal(true)}
                  className='flex-1 sm:flex-none px-4 py-3 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5'
                >
                  <span>➕</span> Deposit Cash to Wallet
                </button>
                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      setDistributeAmount(String(summary?.availableCashBalance || ''))
                      setShowDistributeModal(true)
                    }}
                    className='flex-1 sm:flex-none px-4 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5'
                  >
                    <span>⚡</span> 50/50 COD Wallet Credit
                  </button>
                )}
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  className='flex-1 sm:flex-none px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5'
                >
                  <span>💸</span> Withdraw / Settle Share
                </button>
              </div>
            </div>
          </div>

          {/* 4 METRICS CARDS */}
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6'>
            <div className='bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm'>
              <div className='flex items-center justify-between text-slate-400 text-xs font-bold mb-2'>
                <span>COD CASH COLLECTED</span>
                <span className='text-base'>🛵</span>
              </div>
              <div className='text-lg sm:text-2xl font-black text-slate-800'>
                {DisplayPriceInRupees(summary?.totalCodCollected || 0)}
              </div>
              <p className='text-[11px] text-slate-400 font-semibold mt-1'>
                {summary?.codOrderCount || 0} Delivered COD orders
              </p>
            </div>

            <div className='bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm'>
              <div className='flex items-center justify-between text-slate-400 text-xs font-bold mb-2'>
                <span>ONLINE REVENUE</span>
                <span className='text-base'>💳</span>
              </div>
              <div className='text-lg sm:text-2xl font-black text-slate-800'>
                {DisplayPriceInRupees(summary?.totalOnlineRevenue || 0)}
              </div>
              <p className='text-[11px] text-slate-400 font-semibold mt-1'>
                {summary?.onlineOrderCount || 0} Razorpay / UPI orders
              </p>
            </div>

            <div className='bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm'>
              <div className='flex items-center justify-between text-slate-400 text-xs font-bold mb-2'>
                <span>MANUAL CASH DEPOSITS</span>
                <span className='text-base'>📥</span>
              </div>
              <div className='text-lg sm:text-2xl font-black text-blue-600'>
                {DisplayPriceInRupees(summary?.totalDeposits || 0)}
              </div>
              <p className='text-[11px] text-slate-400 font-semibold mt-1'>
                Credited directly to Snapit App Wallets
              </p>
            </div>

            <div className='bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm'>
              <div className='flex items-center justify-between text-slate-400 text-xs font-bold mb-2'>
                <span>TOTAL WITHDRAWN</span>
                <span className='text-base'>📤</span>
              </div>
              <div className='text-lg sm:text-2xl font-black text-amber-600'>
                {DisplayPriceInRupees(summary?.totalWithdrawals || 0)}
              </div>
              <p className='text-[11px] text-slate-400 font-semibold mt-1'>
                Partner payouts processed
              </p>
            </div>
          </div>

          {/* PARTNER 50/50 SPLIT BREAKDOWN */}
          <div className='bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-6'>
            <div className='flex items-center justify-between mb-4'>
              <div>
                <h2 className='text-lg font-black text-slate-800 flex items-center gap-2'>
                  <span>🤝</span> 50/50 Partner Profit Partition & Real Wallet Balances
                </h2>
                <p className='text-xs text-slate-400 font-medium'>
                  Live equal distribution of all cash inflows between you and your business partner
                </p>
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Partner 1: Super Admin */}
              <div className='p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between'>
                <div>
                  <div className='flex items-center justify-between mb-3'>
                    <span className='text-xs font-black uppercase text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full'>
                      Partner 1 · Super Admin (You)
                    </span>
                    <span className='text-xs font-bold text-slate-400'>50% Share</span>
                  </div>
                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-slate-500'>Total Entitled Pool:</span>
                      <span className='font-bold text-slate-800'>
                        {DisplayPriceInRupees(summary?.partnerSplit?.superAdmin?.totalEntitled || 0)}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-slate-500'>Total Already Withdrawn:</span>
                      <span className='font-bold text-amber-600'>
                        −{DisplayPriceInRupees(summary?.partnerSplit?.superAdmin?.withdrawn || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='mt-4 pt-3 border-t border-slate-200 flex justify-between items-center'>
                  <span className='text-xs font-bold text-slate-700 uppercase tracking-wide'>Available to Withdraw / Settle:</span>
                  <span className='text-xl font-black text-emerald-700'>
                    {DisplayPriceInRupees(summary?.partnerSplit?.superAdmin?.available || 0)}
                  </span>
                </div>
              </div>

              {/* Partner 2: Admin Partner */}
              <div className='p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between'>
                <div>
                  <div className='flex items-center justify-between mb-3'>
                    <span className='text-xs font-black uppercase text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full'>
                      Partner 2 · Admin (Partner)
                    </span>
                    <span className='text-xs font-bold text-slate-400'>50% Share</span>
                  </div>
                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-slate-500'>Total Entitled Pool:</span>
                      <span className='font-bold text-slate-800'>
                        {DisplayPriceInRupees(summary?.partnerSplit?.partnerAdmin?.totalEntitled || 0)}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-slate-500'>Total Already Withdrawn:</span>
                      <span className='font-bold text-amber-600'>
                        −{DisplayPriceInRupees(summary?.partnerSplit?.partnerAdmin?.withdrawn || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='mt-4 pt-3 border-t border-slate-200 flex justify-between items-center'>
                  <span className='text-xs font-bold text-slate-700 uppercase tracking-wide'>Available to Withdraw / Settle:</span>
                  <span className='text-xl font-black text-emerald-700'>
                    {DisplayPriceInRupees(summary?.partnerSplit?.partnerAdmin?.available || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AUDIT LEDGER TABLE */}
          <div className='bg-white rounded-3xl p-6 border border-slate-100 shadow-sm'>
            <h3 className='text-base font-black text-slate-800 mb-4 flex items-center gap-2'>
              <span>📋</span> Treasury & Snapit Wallet Transaction Ledger
            </h3>

            {transactions.length === 0 ? (
              <div className='text-center py-10 text-slate-400 font-medium text-sm'>
                No manual deposits or withdrawals logged yet. Use the buttons above to record entries.
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-left text-xs'>
                  <thead>
                    <tr className='text-slate-400 uppercase font-black border-b border-slate-100 pb-2'>
                      <th className='pb-3'>Type</th>
                      <th className='pb-3'>Amount</th>
                      <th className='pb-3'>Beneficiary / Partner</th>
                      <th className='pb-3'>Method</th>
                      <th className='pb-3'>Recorded By</th>
                      <th className='pb-3'>Notes / Ref</th>
                      <th className='pb-3'>Date</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-50'>
                    {transactions.map((t) => (
                      <tr key={t._id} className='hover:bg-slate-50/50 transition-colors'>
                        <td className='py-3'>
                          <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase ${
                            t.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {t.type === 'DEPOSIT' ? '➕ Deposit (Credited)' : '💸 Withdrawal (Debited)'}
                          </span>
                        </td>
                        <td className='py-3 font-black text-sm text-slate-800'>
                          {DisplayPriceInRupees(t.amount)}
                        </td>
                        <td className='py-3 font-bold text-slate-600'>
                          {t.partner === 'SUPER_ADMIN' ? '👑 Super Admin' : t.partner === 'PARTNER_ADMIN' ? '🛡️ Admin Partner' : '🏛️ General'}
                        </td>
                        <td className='py-3 font-semibold text-slate-500'>{t.paymentMethod}</td>
                        <td className='py-3 text-slate-600'>
                          <span className='font-bold'>{t.recordedByName || 'Admin'}</span>
                          <br />
                          <span className='text-[10px] text-slate-400'>{t.recordedByEmail}</span>
                        </td>
                        <td className='py-3 text-slate-500 font-medium max-w-xs truncate'>
                          {t.notes || '—'} {t.referenceId && `(${t.referenceId})`}
                        </td>
                        <td className='py-3 text-slate-400 font-mono'>
                          {new Date(t.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* DEPOSIT MODAL */}
      {showDepositModal && (
        <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4'>
          <div className='bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-black text-slate-900 flex items-center gap-2'>
                <span>💵</span> Deposit Cash to Snapit Wallet
              </h3>
              <button
                onClick={() => setShowDepositModal(false)}
                className='text-slate-400 hover:text-slate-600 font-black text-lg p-1'
              >
                ✕
              </button>
            </div>

            <p className='text-xs text-slate-500 mb-4'>
              This amount will be recorded in Treasury and <strong>credited directly into your Snapit App Wallet balance</strong> as real spendable money.
            </p>

            <form onSubmit={handleDepositSubmit} className='space-y-4'>
              <div>
                <label className='block text-xs font-black uppercase text-slate-500 mb-1.5'>
                  Deposit Amount (₹) *
                </label>
                <input
                  type='number'
                  required
                  min='1'
                  value={depositForm.amount}
                  onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                  placeholder='e.g. 5000'
                  className='w-full h-12 border-2 border-slate-200 focus:border-emerald-500 rounded-2xl px-4 text-base font-bold text-slate-800 outline-none transition-colors'
                />
              </div>

              <div>
                <label className='block text-xs font-black uppercase text-slate-500 mb-1.5'>
                  Payment Method
                </label>
                <select
                  value={depositForm.paymentMethod}
                  onChange={(e) => setDepositForm({ ...depositForm, paymentMethod: e.target.value })}
                  className='w-full h-12 border-2 border-slate-200 focus:border-emerald-500 rounded-2xl px-3 text-sm font-semibold text-slate-800 outline-none'
                >
                  <option value='CASH'>Physical Cash (COD handover from riders)</option>
                  <option value='UPI'>UPI / Direct Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className='block text-xs font-black uppercase text-slate-500 mb-1.5'>
                  Notes / Source Description
                </label>
                <input
                  type='text'
                  value={depositForm.notes}
                  onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
                  placeholder='e.g. Cash collected from Paliganj riders'
                  className='w-full h-11 border-2 border-slate-200 focus:border-emerald-500 rounded-2xl px-3 text-sm text-slate-700 outline-none'
                />
              </div>

              <div>
                <label className='block text-xs font-black uppercase text-slate-500 mb-1.5'>
                  Receipt / Transaction ID (Optional)
                </label>
                <input
                  type='text'
                  value={depositForm.referenceId}
                  onChange={(e) => setDepositForm({ ...depositForm, referenceId: e.target.value })}
                  placeholder='e.g. UPI Ref or receipt #'
                  className='w-full h-11 border-2 border-slate-200 focus:border-emerald-500 rounded-2xl px-3 text-sm text-slate-700 outline-none'
                />
              </div>

              <div className='flex gap-2 pt-2'>
                <button
                  type='button'
                  onClick={() => setShowDepositModal(false)}
                  className='flex-1 h-12 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={submitting}
                  className='flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center'
                >
                  {submitting ? 'Crediting Wallet...' : 'Confirm Deposit 💵'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 50/50 DISTRIBUTE COD TO WALLETS MODAL */}
      {showDistributeModal && (
        <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4'>
          <div className='bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-black text-slate-900 flex items-center gap-2'>
                <span>⚡</span> Distribute COD Cash to Wallets
              </h3>
              <button
                onClick={() => setShowDistributeModal(false)}
                className='text-slate-400 hover:text-slate-600 font-black text-lg p-1'
              >
                ✕
              </button>
            </div>

            <p className='text-xs text-slate-500 mb-4'>
              This will split the specified COD cash 50/50 and <strong>deposit real money directly into both Super Admin and Partner Admin Snapit App Wallets</strong>!
            </p>

            <form onSubmit={handleDistributeSubmit} className='space-y-4'>
              <div>
                <label className='block text-xs font-black uppercase text-slate-500 mb-1.5'>
                  Total Amount to Distribute (₹) *
                </label>
                <input
                  type='number'
                  required
                  min='1'
                  value={distributeAmount}
                  onChange={(e) => setDistributeAmount(e.target.value)}
                  placeholder='e.g. 56000'
                  className='w-full h-12 border-2 border-slate-200 focus:border-amber-500 rounded-2xl px-4 text-base font-bold text-slate-800 outline-none transition-colors'
                />
              </div>

              {Number(distributeAmount) > 0 && (
                <div className='p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1'>
                  <div className='font-bold text-amber-900'>Each Partner will receive:</div>
                  <div className='text-emerald-700 font-black text-sm'>
                    +{DisplayPriceInRupees(Math.round(Number(distributeAmount) / 2))} in Snapit Wallet
                  </div>
                </div>
              )}

              <div className='flex gap-2 pt-2'>
                <button
                  type='button'
                  onClick={() => setShowDistributeModal(false)}
                  className='flex-1 h-12 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={submitting}
                  className='flex-1 h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm disabled:opacity-50 flex items-center justify-center'
                >
                  {submitting ? 'Depositing...' : 'Confirm 50/50 Credit 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {showWithdrawModal && (
        <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4'>
          <div className='bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-black text-slate-900 flex items-center gap-2'>
                <span>💸</span> Withdraw / Settle Partner Profit
              </h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className='text-slate-400 hover:text-slate-600 font-black text-lg p-1'
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className='space-y-4'>
              <div>
                <label className='block text-xs font-black uppercase text-slate-500 mb-1.5'>
                  Withdrawal Amount (₹) *
                </label>
                <input
                  type='number'
                  required
                  min='1'
                  value={withdrawForm.amount}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                  placeholder='e.g. 10000'
                  className='w-full h-12 border-2 border-slate-200 focus:border-amber-500 rounded-2xl px-4 text-base font-bold text-slate-800 outline-none transition-colors'
                />
              </div>

              {isSuperAdmin && (
                <div>
                  <label className='block text-xs font-black uppercase text-slate-500 mb-1.5'>
                    Beneficiary Partner
                  </label>
                  <select
                    value={withdrawForm.partner}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, partner: e.target.value })}
                    className='w-full h-12 border-2 border-slate-200 focus:border-amber-500 rounded-2xl px-3 text-sm font-semibold text-slate-800 outline-none'
                  >
                    <option value='SUPER_ADMIN'>Partner 1 · Super Admin (You)</option>
                    <option value='PARTNER_ADMIN'>Partner 2 · Admin (Partner)</option>
                  </select>
                </div>
              )}

              <div>
                <label className='block text-xs font-black uppercase text-slate-500 mb-1.5'>
                  Payout Method
                </label>
                <select
                  value={withdrawForm.paymentMethod}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, paymentMethod: e.target.value })}
                  className='w-full h-12 border-2 border-slate-200 focus:border-amber-500 rounded-2xl px-3 text-sm font-semibold text-slate-800 outline-none'
                >
                  <option value='CASH'>Physical Cash</option>
                  <option value='UPI'>UPI Payout</option>
                  <option value='BANK_TRANSFER'>Bank Transfer (NEFT/IMPS)</option>
                </select>
              </div>

              <div>
                <label className='block text-xs font-black uppercase text-slate-500 mb-1.5'>
                  Reason / Notes
                </label>
                <input
                  type='text'
                  value={withdrawForm.notes}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, notes: e.target.value })}
                  placeholder='e.g. Monthly profit payout'
                  className='w-full h-11 border-2 border-slate-200 focus:border-amber-500 rounded-2xl px-3 text-sm text-slate-700 outline-none'
                />
              </div>

              <div>
                <label className='block text-xs font-black uppercase text-slate-500 mb-1.5'>
                  Reference / Bank Transaction ID (Optional)
                </label>
                <input
                  type='text'
                  value={withdrawForm.referenceId}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, referenceId: e.target.value })}
                  placeholder='e.g. Bank UTR / UPI Ref #'
                  className='w-full h-11 border-2 border-slate-200 focus:border-amber-500 rounded-2xl px-3 text-sm text-slate-700 outline-none'
                />
              </div>

              <div className='flex gap-2 pt-2'>
                <button
                  type='button'
                  onClick={() => setShowWithdrawModal(false)}
                  className='flex-1 h-12 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={submitting}
                  className='flex-1 h-12 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center'
                >
                  {submitting ? 'Processing...' : 'Confirm Withdrawal 💸'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminTreasury
