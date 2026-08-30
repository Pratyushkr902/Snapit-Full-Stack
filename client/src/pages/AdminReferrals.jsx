import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoArrowBack, IoSearch, IoGift, IoPeople, IoWallet, IoCopyOutline, IoChevronDown, IoChevronUp, IoAddCircleOutline, IoCheckmarkCircle, IoTimeOutline, IoRefresh } from 'react-icons/io5'
import toast from 'react-hot-toast'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import AxiosToastError from '../utils/AxiosToastError'
import AdminPermision from '../layouts/AdminPermision'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'

const AdminReferrals = () => {
    const navigate = useNavigate()
    const [referrers, setReferrers] = useState([])
    const [allReferred, setAllReferred] = useState([])
    const [summary, setSummary] = useState({ totalReferrers: 0, totalReferrals: 0, totalPaidOut: 0, totalReferredUsers: 0 })
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedRow, setExpandedRow] = useState(null)
    const [activeTab, setActiveTab] = useState('referrers') // 'referrers' | 'invited'
    const [creditingUser, setCreditingUser] = useState(null)
    const [creditAmount, setCreditAmount] = useState(5)
    const [creditReason, setCreditReason] = useState('')
    const [submittingCredit, setSubmittingCredit] = useState(false)

    const fetchReferrals = async () => {
        try {
            setLoading(true)
            const response = await Axios({ ...SummaryApi.listReferralsAdmin })
            if (response.data.success) {
                const resData = response.data.data
                if (Array.isArray(resData)) {
                    setReferrers(resData)
                    setSummary({
                        totalReferrers: resData.length,
                        totalReferrals: resData.reduce((s, r) => s + (r.referralCount || 0), 0),
                        totalPaidOut: resData.reduce((s, r) => s + (r.totalEarned || 0), 0),
                        totalReferredUsers: resData.reduce((s, r) => s + (r.referredUsers?.length || 0), 0)
                    })
                } else if (resData && typeof resData === 'object') {
                    setReferrers(resData.referrers || [])
                    setAllReferred(resData.allReferredUsers || [])
                    setSummary(resData.summary || {
                        totalReferrers: (resData.referrers || []).length,
                        totalReferrals: 0,
                        totalPaidOut: 0,
                        totalReferredUsers: (resData.allReferredUsers || []).length
                    })
                }
            }
        } catch (error) {
            AxiosToastError(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchReferrals()
    }, [])

    const handleCopyCode = (code) => {
        if (!code || code === 'N/A') return
        navigator.clipboard.writeText(code)
        toast.success(`Copied referral code: ${code}`)
    }

    const handleManualCredit = async (e) => {
        e.preventDefault()
        if (!creditingUser) return
        try {
            setSubmittingCredit(true)
            const res = await Axios({
                ...SummaryApi.creditReferralBonusAdmin,
                data: {
                    userId: creditingUser.referrerId || creditingUser._id,
                    amount: Number(creditAmount) || 5,
                    reason: creditReason || `Admin Referral Bonus (₹${creditAmount})`
                }
            })
            if (res.data.success) {
                toast.success(res.data.message || 'Bonus credited successfully!')
                setCreditingUser(null)
                setCreditReason('')
                fetchReferrals()
            }
        } catch (err) {
            AxiosToastError(err)
        } finally {
            setSubmittingCredit(false)
        }
    }

    const filteredReferrers = referrers.filter(r => {
        const query = searchTerm.toLowerCase().trim()
        if (!query) return true
        return (
            (r.name || '').toLowerCase().includes(query) ||
            (r.email || '').toLowerCase().includes(query) ||
            (r.mobile || '').toLowerCase().includes(query) ||
            (r.referralCode || '').toLowerCase().includes(query)
        )
    })

    const filteredInvited = allReferred.filter(u => {
        const query = searchTerm.toLowerCase().trim()
        if (!query) return true
        return (
            (u.name || '').toLowerCase().includes(query) ||
            (u.email || '').toLowerCase().includes(query) ||
            (u.mobile || '').toLowerCase().includes(query) ||
            (u.referredBy || '').toLowerCase().includes(query)
        )
    })

    return (
        <AdminPermision>
            <div className='min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6'>
                <div className='max-w-6xl mx-auto space-y-6'>

                    {/* Header */}
                    <div className='flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5'>
                        <div>
                            <button
                                onClick={() => navigate(-1)}
                                className='flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors mb-2'
                            >
                                <IoArrowBack size={16} /> Back to Dashboard
                            </button>
                            <h1 className='text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5'>
                                <span className='p-2 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20'>
                                    <IoGift size={24} />
                                </span>
                                Referral Program Hub
                            </h1>
                            <p className='text-xs sm:text-sm text-slate-400 mt-1 font-medium'>
                                Track all user invites, viral growth analytics, bonus credits, and referred registrations
                            </p>
                        </div>

                        <button
                            onClick={fetchReferrals}
                            disabled={loading}
                            className='flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all active:scale-95 disabled:opacity-50'
                        >
                            <IoRefresh size={16} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>

                    {/* Metrics Summary Cards */}
                    <div className='grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4'>
                        <div className='bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm'>
                            <div className='flex items-center justify-between text-slate-400 mb-2'>
                                <span className='text-[10px] font-black uppercase tracking-wider'>Active Referrers</span>
                                <span className='p-2 bg-blue-500/10 text-blue-400 rounded-xl'><IoPeople size={18} /></span>
                            </div>
                            <p className='text-2xl font-black text-white'>{summary.totalReferrers || 0}</p>
                            <p className='text-[11px] text-slate-500 font-semibold mt-1'>Users who shared their code</p>
                        </div>

                        <div className='bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm'>
                            <div className='flex items-center justify-between text-slate-400 mb-2'>
                                <span className='text-[10px] font-black uppercase tracking-wider'>Total Friends Invited</span>
                                <span className='p-2 bg-emerald-500/10 text-emerald-400 rounded-xl'><IoGift size={18} /></span>
                            </div>
                            <p className='text-2xl font-black text-emerald-400'>{summary.totalReferrals || summary.totalReferredUsers || 0}</p>
                            <p className='text-[11px] text-slate-500 font-semibold mt-1'>Registered with invite links</p>
                        </div>

                        <div className='bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm'>
                            <div className='flex items-center justify-between text-slate-400 mb-2'>
                                <span className='text-[10px] font-black uppercase tracking-wider'>Total Bonus Paid</span>
                                <span className='p-2 bg-amber-500/10 text-amber-400 rounded-xl'><IoWallet size={18} /></span>
                            </div>
                            <p className='text-2xl font-black text-amber-400'>{DisplayPriceInRupees(summary.totalPaidOut || 0)}</p>
                            <p className='text-[11px] text-slate-500 font-semibold mt-1'>Credited to referrer wallets</p>
                        </div>

                        <div className='bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm'>
                            <div className='flex items-center justify-between text-slate-400 mb-2'>
                                <span className='text-[10px] font-black uppercase tracking-wider'>Reward Scheme</span>
                                <span className='p-2 bg-purple-500/10 text-purple-400 rounded-xl'><IoGift size={18} /></span>
                            </div>
                            <p className='text-lg font-black text-purple-400'>₹5 (10 Coins)</p>
                            <p className='text-[11px] text-slate-500 font-semibold mt-1'>Per 1st Order (Min ₹149)</p>
                        </div>
                    </div>

                    {/* Navigation Tabs & Search Controls */}
                    <div className='flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800'>
                        <div className='flex items-center gap-2'>
                            <button
                                onClick={() => setActiveTab('referrers')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                    activeTab === 'referrers'
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                👥 Referrers List ({referrers.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('invited')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                    activeTab === 'invited'
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                🎁 All Referred Signups ({allReferred.length})
                            </button>
                        </div>

                        <div className='relative flex-1 min-w-[220px] max-w-md'>
                            <IoSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-500' size={16} />
                            <input
                                type='text'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder='Search by name, email, phone, code...'
                                className='w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all'
                            />
                        </div>
                    </div>

                    {/* Content Section */}
                    {loading ? (
                        <div className='bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center'>
                            <div className='w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3'></div>
                            <p className='text-xs font-bold text-slate-400'>Loading referral ecosystem data...</p>
                        </div>
                    ) : activeTab === 'referrers' ? (
                        filteredReferrers.length === 0 ? (
                            <div className='bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center'>
                                <IoGift size={40} className='mx-auto text-slate-600 mb-3' />
                                <h3 className='text-sm font-bold text-white'>No Referrers Found</h3>
                                <p className='text-xs text-slate-400 mt-1 max-w-sm mx-auto'>
                                    {searchTerm ? 'No referrers matched your search query.' : 'When users share their referral code and invite friends, they will appear here with full earnings analytics.'}
                                </p>
                            </div>
                        ) : (
                            <div className='bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg'>
                                <div className='overflow-x-auto'>
                                    <table className='w-full text-left border-collapse text-xs'>
                                        <thead>
                                            <tr className='bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider'>
                                                <th className='py-3.5 px-4'>Referrer</th>
                                                <th className='py-3.5 px-4'>Referral Code</th>
                                                <th className='py-3.5 px-4 text-center'>Successful Invites</th>
                                                <th className='py-3.5 px-4 text-right'>Total Earned</th>
                                                <th className='py-3.5 px-4 text-center'>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className='divide-y divide-slate-800/60'>
                                            {filteredReferrers.map((r, idx) => (
                                                <React.Fragment key={r.referrerId || idx}>
                                                    <tr className='hover:bg-slate-800/40 transition-colors'>
                                                        <td className='py-3.5 px-4'>
                                                            <div className='flex items-center gap-3'>
                                                                <div className='w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-xs font-black text-white uppercase shadow-sm'>
                                                                    {(r.name || 'U').charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className='font-bold text-white leading-tight'>{r.name}</p>
                                                                    <p className='text-[11px] text-slate-400 mt-0.5'>{r.email || r.mobile}</p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className='py-3.5 px-4'>
                                                            <button
                                                                onClick={() => handleCopyCode(r.referralCode)}
                                                                className='inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg font-mono font-bold text-blue-400 hover:text-blue-300 transition-all'
                                                                title='Click to Copy'
                                                            >
                                                                <span>{r.referralCode}</span>
                                                                <IoCopyOutline size={12} />
                                                            </button>
                                                        </td>

                                                        <td className='py-3.5 px-4 text-center'>
                                                            <span className='inline-flex items-center px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded-full'>
                                                                {r.referralCount || 0} friends
                                                            </span>
                                                        </td>

                                                        <td className='py-3.5 px-4 text-right'>
                                                            <p className='font-black text-amber-400 text-sm'>
                                                                {DisplayPriceInRupees(r.totalEarned || 0)}
                                                            </p>
                                                            <p className='text-[10px] text-slate-500 font-medium'>
                                                                Wallet: {DisplayPriceInRupees(r.walletBalance || 0)}
                                                            </p>
                                                        </td>

                                                        <td className='py-3.5 px-4 text-center'>
                                                            <div className='flex items-center justify-center gap-2'>
                                                                {r.referredUsers && r.referredUsers.length > 0 && (
                                                                    <button
                                                                        onClick={() => setExpandedRow(expandedRow === r.referrerId ? null : r.referrerId)}
                                                                        className='p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all text-xs flex items-center gap-1 font-bold'
                                                                    >
                                                                        <span>{r.referredUsers.length}</span>
                                                                        {expandedRow === r.referrerId ? <IoChevronUp size={14} /> : <IoChevronDown size={14} />}
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => setCreditingUser(r)}
                                                                    className='p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition-all text-[11px] font-bold flex items-center gap-1'
                                                                    title='Credit Bonus Manually'
                                                                >
                                                                    <IoAddCircleOutline size={14} />
                                                                    <span>Bonus</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* Expanded Sub-table of Friends */}
                                                    {expandedRow === r.referrerId && r.referredUsers && (
                                                        <tr className='bg-slate-950/60'>
                                                            <td colSpan={5} className='p-4'>
                                                                <div className='bg-slate-950 rounded-xl p-3 border border-slate-800/80 space-y-2'>
                                                                    <p className='text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5'>
                                                                        <IoGift size={12} className='text-emerald-400' />
                                                                        Friends Invited by {r.name} ({r.referredUsers.length})
                                                                    </p>
                                                                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1'>
                                                                        {r.referredUsers.map((u, uIdx) => (
                                                                            <div key={u._id || uIdx} className='bg-slate-900 border border-slate-800/90 rounded-lg p-2.5 flex items-center justify-between gap-2'>
                                                                                <div className='min-w-0'>
                                                                                    <p className='font-bold text-white text-xs truncate'>{u.name}</p>
                                                                                    <p className='text-[10px] text-slate-400 truncate'>{u.email || u.mobile}</p>
                                                                                    <p className='text-[9px] text-slate-500 mt-0.5'>
                                                                                        Joined: {new Date(u.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                                                    </p>
                                                                                </div>
                                                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold flex-shrink-0 flex items-center gap-1 ${
                                                                                    u.bonusCredited
                                                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                                                }`}>
                                                                                    {u.bonusCredited ? <IoCheckmarkCircle size={10} /> : <IoTimeOutline size={10} />}
                                                                                    {u.bonusCredited ? 'Bonus Paid' : 'Awaiting 1st Order'}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    ) : (
                        /* All Referred Signups Tab */
                        filteredInvited.length === 0 ? (
                            <div className='bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center'>
                                <IoPeople size={40} className='mx-auto text-slate-600 mb-3' />
                                <h3 className='text-sm font-bold text-white'>No Referred Signups Found</h3>
                                <p className='text-xs text-slate-400 mt-1'>
                                    {searchTerm ? 'No users matched your search query.' : 'Users who registered with a friend\'s referral link will be listed here.'}
                                </p>
                            </div>
                        ) : (
                            <div className='bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg'>
                                <div className='overflow-x-auto'>
                                    <table className='w-full text-left border-collapse text-xs'>
                                        <thead>
                                            <tr className='bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider'>
                                                <th className='py-3.5 px-4'>User</th>
                                                <th className='py-3.5 px-4'>Referred By Code</th>
                                                <th className='py-3.5 px-4'>Joined On</th>
                                                <th className='py-3.5 px-4 text-center'>Reward Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className='divide-y divide-slate-800/60'>
                                            {filteredInvited.map((u, idx) => (
                                                <tr key={u._id || idx} className='hover:bg-slate-800/40 transition-colors'>
                                                    <td className='py-3.5 px-4'>
                                                        <div className='flex items-center gap-3'>
                                                            <div className='w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 uppercase'>
                                                                {(u.name || 'U').charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className='font-bold text-white leading-tight'>{u.name || 'Snapit Customer'}</p>
                                                                <p className='text-[11px] text-slate-400 mt-0.5'>{u.email || u.mobile || 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className='py-3.5 px-4'>
                                                        <span className='px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg font-mono font-bold text-blue-400'>
                                                            {u.referredBy}
                                                        </span>
                                                    </td>

                                                    <td className='py-3.5 px-4 text-slate-400'>
                                                        {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </td>

                                                    <td className='py-3.5 px-4 text-center'>
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                            u.referralBonusCredited || u.firstOrderBonusApplied
                                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                        }`}>
                                                            {u.referralBonusCredited || u.firstOrderBonusApplied ? <IoCheckmarkCircle size={12} /> : <IoTimeOutline size={12} />}
                                                            {u.referralBonusCredited || u.firstOrderBonusApplied ? 'Bonus Credited' : 'Awaiting 1st Order'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    )}

                </div>

                {/* Manual Credit Bonus Modal */}
                {creditingUser && (
                    <div className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn'>
                        <div className='bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4'>
                            <div className='flex items-center justify-between border-b border-slate-800 pb-3'>
                                <h3 className='text-base font-black text-white flex items-center gap-2'>
                                    <IoGift className='text-emerald-400' size={20} />
                                    Manual Referral Credit
                                </h3>
                                <button
                                    onClick={() => setCreditingUser(null)}
                                    className='text-slate-400 hover:text-white font-bold text-lg'
                                >
                                    ✕
                                </button>
                            </div>

                            <p className='text-xs text-slate-300'>
                                Credit referral coins/cash directly to <strong className='text-white'>{creditingUser.name}</strong>'s wallet ({creditingUser.email || creditingUser.mobile}).
                            </p>

                            <form onSubmit={handleManualCredit} className='space-y-3.5'>
                                <div>
                                    <label className='block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1'>
                                        Amount (₹)
                                    </label>
                                    <input
                                        type='number'
                                        min='1'
                                        max='500'
                                        value={creditAmount}
                                        onChange={(e) => setCreditAmount(e.target.value)}
                                        className='w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500'
                                        required
                                    />
                                </div>

                                <div>
                                    <label className='block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1'>
                                        Reason / Note
                                    </label>
                                    <input
                                        type='text'
                                        value={creditReason}
                                        onChange={(e) => setCreditReason(e.target.value)}
                                        placeholder={`Referral bonus for inviting friends (₹${creditAmount})`}
                                        className='w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500'
                                    />
                                </div>

                                <div className='flex gap-2 pt-2'>
                                    <button
                                        type='button'
                                        onClick={() => setCreditingUser(null)}
                                        className='flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all'
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type='submit'
                                        disabled={submittingCredit}
                                        className='flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50'
                                    >
                                        {submittingCredit ? 'Crediting...' : `Credit ₹${creditAmount}`}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AdminPermision>
    )
}

export default AdminReferrals

