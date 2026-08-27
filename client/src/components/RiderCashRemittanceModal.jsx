import React, { useState, useEffect, useCallback } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import { FaMoneyBillWave, FaQrcode, FaCheckCircle, FaTimesCircle, FaClock, FaCopy, FaExternalLinkAlt, FaHandHoldingUsd, FaMobileAlt } from 'react-icons/fa'
import superAdminGpayQr from '../assets/super_admin_gpay_qr.png'

const SUPER_ADMIN_UPI = '00pr1199-1@oksbi'
const SUPER_ADMIN_NAME = 'Pratyush Kumar'
const SUPER_ADMIN_BANK = 'Bank of Baroda / SBI'

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const RiderCashRemittanceModal = ({ isOpen, onClose, onDepositSuccess }) => {
  const [activeTab, setActiveTab] = useState('deposit') // 'deposit' | 'history'
  const [depositMode, setDepositMode] = useState('ONLINE') // 'ONLINE' | 'CASH'
  const [cashSummary, setCashSummary] = useState({ cashInHand: 0, totalCodCollected: 0, totalApprovedRemitted: 0, totalPendingRemitted: 0 })
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [amount, setAmount] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [handedTo, setHandedTo] = useState('Pratyush Kumar (Super Admin)')
  const [riderNote, setRiderNote] = useState('')
  const [receiptImage, setReceiptImage] = useState('')
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  const fetchRemittanceData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await Axios({ ...SummaryApi.getRiderRemittanceHistory })
      if (res.data?.success && res.data?.data) {
        setCashSummary(res.data.data.cashSummary || {})
        setHistory(res.data.data.remittances || [])
        if (!amount && res.data.data.cashSummary?.cashInHand > 0) {
          setAmount(String(res.data.data.cashSummary.cashInHand))
        }
      }
    } catch (err) {
      console.warn('[RiderRemittance] load error:', err?.message)
      toast.error('Failed to load remittance details')
    } finally {
      setLoading(false)
    }
  }, [amount])

  useEffect(() => {
    if (isOpen) {
      fetchRemittanceData()
    }
  }, [isOpen, fetchRemittanceData])

  const depositAmt = Number(amount) || 0
  const upiLink = `upi://pay?pa=${SUPER_ADMIN_UPI}&pn=${encodeURIComponent(SUPER_ADMIN_NAME)}&am=${depositAmt}&cu=INR&tn=${encodeURIComponent('Rider Cash Remittance')}`

  const handleOpenUpiApp = () => {
    if (!depositAmt || depositAmt <= 0) {
      toast.error('Please enter the deposit amount first')
      return
    }
    window.location.href = upiLink
  }

  // Handle Receipt Upload
  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploadingReceipt(true)
      const formData = new FormData()
      formData.append('image', file)
      const res = await Axios({
        ...SummaryApi.uploadImageR2,
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (res.data?.success) {
        setReceiptImage(res.data.data.url || res.data.data.secure_url)
        toast.success('Payment receipt attached!')
      } else {
        toast.error('Upload failed. Try again.')
      }
    } catch {
      toast.error('Failed to upload receipt image.')
    } finally {
      setUploadingReceipt(false)
    }
  }

  // Handle Submit Remittance
  const handleSubmitDeposit = async (e) => {
    e.preventDefault()
    if (!depositAmt || depositAmt <= 0) {
      return toast.error('Please enter a valid deposit amount.')
    }

    if (depositMode === 'ONLINE' && !transactionId.trim()) {
      return toast.error('Please enter the 12-digit UPI UTR or Bank Transaction Ref.')
    }

    try {
      setSubmitting(true)
      const notePayload = depositMode === 'CASH'
        ? `[Hand-to-Hand Cash Handover to: ${handedTo}] ${riderNote}`.trim()
        : riderNote.trim()

      const res = await Axios({
        ...SummaryApi.submitRiderRemittance,
        data: {
          amount: depositAmt,
          paymentMethod: depositMode === 'CASH' ? 'CASH' : 'UPI',
          transactionId: depositMode === 'ONLINE' ? transactionId.trim() : (transactionId.trim() || undefined),
          receiptImage,
          riderNote: notePayload
        }
      })

      if (res.data?.success) {
        toast.success(
          depositMode === 'CASH'
            ? '🤝 Cash handover request submitted! Super Admin will verify and settle.'
            : '🚀 Online deposit submitted! Super Admin will verify UTR and approve.',
          { duration: 5000 }
        )
        setTransactionId('')
        setRiderNote('')
        setReceiptImage('')
        setActiveTab('history')
        fetchRemittanceData()
        if (onDepositSuccess) onDepositSuccess()
      } else {
        toast.error(res.data?.message || 'Submission failed.')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit remittance.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4'>
      <div className='bg-slate-900 border border-slate-800 text-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200'>
        
        {/* Modal Header */}
        <div className='p-5 border-b border-slate-800 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl text-amber-400'>
              <FaMoneyBillWave />
            </div>
            <div>
              <h2 className='text-base font-black text-white'>Deposit Cash to Super Admin</h2>
              <p className='text-[11px] text-slate-400'>Remit collected COD cash online or in-person</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition'
          >
            ✕
          </button>
        </div>

        {/* Sub-Tabs: New Deposit vs Deposit History */}
        <div className='flex border-b border-slate-800 bg-slate-950/50 p-1.5 gap-1.5'>
          <button
            type='button'
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition ${
              activeTab === 'deposit'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            💵 New Deposit
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition ${
              activeTab === 'history'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📜 Deposit History ({history.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className='p-5 overflow-y-auto space-y-5'>

          {/* ── NEW DEPOSIT TAB ── */}
          {activeTab === 'deposit' && (
            <>
              {/* Cash in Hand Banner */}
              <div className='bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/40 rounded-3xl p-4.5'>
                <p className='text-[10px] font-black uppercase tracking-wider text-amber-400/80'>
                  Your Unremitted Cash in Hand
                </p>
                <div className='flex items-baseline justify-between mt-1'>
                  <span className='text-3xl font-black text-amber-400'>
                    {fmtINR(cashSummary.cashInHand)}
                  </span>
                  <button
                    type='button'
                    onClick={() => setAmount(String(cashSummary.cashInHand))}
                    className='px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-black transition'
                  >
                    Use Full Balance
                  </button>
                </div>
                {cashSummary.totalPendingRemitted > 0 && (
                  <p className='text-[11px] text-yellow-300 mt-2 font-medium flex items-center gap-1.5'>
                    <FaClock size={11} />
                    <span>{fmtINR(cashSummary.totalPendingRemitted)} already pending Super Admin approval</span>
                  </p>
                )}
              </div>

              {/* Deposit Method Selector: Online UPI vs Cash Handover */}
              <div>
                <label className='block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2'>
                  Select Deposit Method
                </label>
                <div className='grid grid-cols-2 gap-2'>
                  <button
                    type='button'
                    onClick={() => setDepositMode('ONLINE')}
                    className={`py-3 px-3 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                      depositMode === 'ONLINE'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 ring-2 ring-blue-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <FaMobileAlt size={14} className={depositMode === 'ONLINE' ? 'text-blue-400' : ''} />
                    <span>📱 Deposit Online (UPI)</span>
                  </button>

                  <button
                    type='button'
                    onClick={() => setDepositMode('CASH')}
                    className={`py-3 px-3 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                      depositMode === 'CASH'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <FaHandHoldingUsd size={15} className={depositMode === 'CASH' ? 'text-emerald-400' : ''} />
                    <span>🤝 Deposit Cash (Handover)</span>
                  </button>
                </div>
              </div>

              {/* ── MODE 1: ONLINE UPI / GPAY / QR ── */}
              {depositMode === 'ONLINE' && (
                <div className='bg-slate-950 border border-slate-800 rounded-3xl p-4.5 space-y-3.5 animate-in fade-in duration-200'>
                  <div className='flex items-center justify-between'>
                    <span className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
                      Super Admin Google Pay / UPI
                    </span>
                    <span className='text-[11px] font-bold text-emerald-400 flex items-center gap-1'>
                      <span className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse'></span>
                      Verified Account
                    </span>
                  </div>

                  <div className='flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-3'>
                    <div className='min-w-0'>
                      <p className='text-[10px] text-slate-500 uppercase font-bold'>UPI ID (Google Pay / PhonePe / Paytm)</p>
                      <p className='text-sm font-black text-amber-400 font-mono mt-0.5 select-all'>{SUPER_ADMIN_UPI}</p>
                      <p className='text-[10px] text-slate-400 mt-0.5 font-medium'>{SUPER_ADMIN_NAME} · {SUPER_ADMIN_BANK}</p>
                    </div>
                    <button
                      type='button'
                      onClick={() => {
                        navigator.clipboard?.writeText(SUPER_ADMIN_UPI)
                        toast.success('UPI ID copied!')
                      }}
                      className='p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-400 transition'
                      title='Copy UPI ID'
                    >
                      <FaCopy size={14} />
                    </button>
                  </div>

                  {/* Google Pay QR Display */}
                  <div className='flex flex-col items-center p-3.5 bg-black border border-slate-800 rounded-2xl shadow-xl'>
                    <div className='w-48 h-48 sm:w-52 sm:h-52 bg-black rounded-xl overflow-hidden flex items-center justify-center'>
                      <img src={superAdminGpayQr} alt='Super Admin Google Pay QR Code' className='w-full h-full object-contain rounded-xl' />
                    </div>
                    <p className='text-xs font-bold text-slate-300 mt-2.5 flex items-center gap-1.5'>
                      <span>📱</span> Scan with Google Pay, PhonePe or Paytm
                    </p>
                  </div>

                  {depositAmt > 0 && (
                    <div className='space-y-1.5'>
                      <button
                        type='button'
                        onClick={handleOpenUpiApp}
                        className='w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/25 ring-1 ring-white/10'
                      >
                        <FaExternalLinkAlt size={12} />
                        <span>Open in UPI App to Pay {fmtINR(depositAmt)}</span>
                      </button>
                      <p className='text-[10px] text-center text-slate-400 font-medium'>
                        Opens Google Pay, PhonePe, Paytm or BHIM directly
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── MODE 2: PHYSICAL HAND-TO-HAND CASH HANDOVER ── */}
              {depositMode === 'CASH' && (
                <div className='bg-emerald-950/30 border border-emerald-500/40 rounded-3xl p-4.5 space-y-3 animate-in fade-in duration-200'>
                  <div className='flex items-center gap-2.5 text-emerald-400'>
                    <div className='w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-base'>
                      🤝
                    </div>
                    <div>
                      <h4 className='text-xs font-black uppercase tracking-wider text-emerald-300'>In-Person Cash Handover</h4>
                      <p className='text-[11px] text-slate-300'>Deposit physical cash directly at Paliganj Hub</p>
                    </div>
                  </div>

                  <div className='bg-slate-900/90 border border-emerald-500/20 rounded-2xl p-3 text-xs text-slate-300 space-y-1.5'>
                    <p className='flex items-center gap-1.5 font-bold text-white'>
                      <span>🏢</span> Hub Office: Paliganj, Bihar
                    </p>
                    <p className='text-[11px] text-slate-400 leading-relaxed'>
                      Hand over physical cash to Super Admin (<strong className='text-amber-300'>Pratyush Kumar</strong>) or Hub Manager. Once received, Super Admin will 1-click verify & clear your Cash in Hand.
                    </p>
                  </div>

                  <div>
                    <label className='block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5'>
                      Cash Handed Over To
                    </label>
                    <input
                      type='text'
                      value={handedTo}
                      onChange={(e) => setHandedTo(e.target.value)}
                      placeholder='e.g. Pratyush Kumar (Super Admin)'
                      className='w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs font-bold outline-none focus:border-emerald-500 transition'
                    />
                  </div>
                </div>
              )}

              {/* Remittance Submission Form */}
              <form onSubmit={handleSubmitDeposit} className='space-y-3.5'>
                <div>
                  <label className='block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5'>
                    {depositMode === 'CASH' ? 'Cash Amount Handed Over (₹) *' : 'Amount Transferred (₹) *'}
                  </label>
                  <input
                    type='number'
                    required
                    min='1'
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder='e.g. 1850'
                    className='w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-black text-base outline-none focus:border-amber-500 transition'
                  />
                </div>

                {depositMode === 'ONLINE' && (
                  <div>
                    <label className='block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5'>
                      UPI UTR / Bank Transaction Reference No. *
                    </label>
                    <input
                      type='text'
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder='e.g. 423819283712 (12-digit UTR)'
                      className='w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold text-sm outline-none focus:border-amber-500 font-mono transition'
                    />
                  </div>
                )}

                <div>
                  <label className='block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5'>
                    {depositMode === 'CASH' ? 'Cash Receipt / Slip Photo (Optional)' : 'Payment Screenshot (Optional)'}
                  </label>
                  {receiptImage ? (
                    <div className='relative rounded-2xl overflow-hidden border border-slate-800 h-28 bg-slate-950'>
                      <img src={receiptImage} alt='Receipt' className='w-full h-full object-cover' />
                      <button
                        type='button'
                        onClick={() => setReceiptImage('')}
                        className='absolute top-2 right-2 px-2.5 py-1 bg-black/70 text-white rounded-lg text-xs font-bold'
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className='border border-dashed border-slate-700 hover:border-amber-500/60 rounded-2xl p-4 flex flex-col items-center gap-1.5 cursor-pointer bg-slate-950/60 transition'>
                      <span className='text-2xl'>📷</span>
                      <span className='text-xs font-bold text-slate-300'>
                        {uploadingReceipt ? 'Uploading receipt…' : depositMode === 'CASH' ? 'Tap to attach cash receipt / slip' : 'Tap to attach payment receipt'}
                      </span>
                      <input
                        type='file'
                        accept='image/*'
                        className='hidden'
                        disabled={uploadingReceipt}
                        onChange={handleReceiptUpload}
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className='block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5'>
                    {depositMode === 'CASH' ? 'Handover Note (Optional)' : 'Rider Note (Optional)'}
                  </label>
                  <input
                    type='text'
                    value={riderNote}
                    onChange={(e) => setRiderNote(e.target.value)}
                    placeholder={depositMode === 'CASH' ? 'e.g. Handed cash at Paliganj hub at 5:30 PM' : 'e.g. Deposited cash collected from Paliganj orders'}
                    className='w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs outline-none focus:border-amber-500 transition'
                  />
                </div>

                <button
                  type='submit'
                  disabled={submitting || uploadingReceipt}
                  className={`w-full py-3.5 font-black text-sm rounded-2xl shadow-xl transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${
                    depositMode === 'CASH'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 shadow-emerald-500/20'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-amber-500/20'
                  }`}
                >
                  {submitting
                    ? 'Submitting Request…'
                    : depositMode === 'CASH'
                    ? '🤝 Submit Cash Handover to Super Admin'
                    : '✅ Submit Online Deposit to Super Admin'}
                </button>
              </form>
            </>
          )}

          {/* ── HISTORY TAB ── */}
          {activeTab === 'history' && (
            <div className='space-y-3'>
              {loading ? (
                <div className='py-12 text-center text-xs text-slate-400 animate-pulse'>
                  Loading remittances…
                </div>
              ) : history.length === 0 ? (
                <div className='py-12 text-center bg-slate-950/50 rounded-2xl border border-slate-800 p-6'>
                  <p className='text-3xl mb-2'>📜</p>
                  <p className='text-slate-400 font-bold text-xs'>No cash remittances submitted yet</p>
                </div>
              ) : (
                history.map(item => (
                  <div
                    key={item._id}
                    className='bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2'
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <span className='text-base font-black text-white'>{fmtINR(item.amount)}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                          item.paymentMethod === 'CASH'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {item.paymentMethod === 'CASH' ? '🤝 Cash Handover' : '📱 UPI Deposit'}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          item.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : item.status === 'REJECTED'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {item.status === 'APPROVED' && <FaCheckCircle size={10} />}
                        {item.status === 'REJECTED' && <FaTimesCircle size={10} />}
                        {item.status === 'PENDING' && <FaClock size={10} />}
                        <span>{item.status}</span>
                      </span>
                    </div>

                    <p className='text-xs font-mono text-slate-400'>
                      Ref / UTR: <span className='text-slate-200 font-bold'>{item.transactionId}</span>
                    </p>

                    {item.riderNote && (
                      <p className='text-[11px] text-slate-400 italic bg-slate-900/60 p-2 rounded-xl border border-slate-800/80'>
                        {item.riderNote}
                      </p>
                    )}

                    <div className='flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900'>
                      <span>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      {item.adminNote && (
                        <span className='text-amber-300 font-medium truncate max-w-[200px]'>
                          Admin: {item.adminNote}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RiderCashRemittanceModal
