import React, { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'

const Wallet = () => {
    const [balance, setBalance]           = useState(0)
    const [transactions, setTransactions] = useState([])
    const [amount, setAmount]             = useState('')
    const [loading, setLoading]           = useState(false)

    const fetchWallet = async () => {
        try {
            const res = await Axios({ ...SummaryApi.getWallet })
            if (res.data.success) {
                setBalance(res.data.data.balance)
                setTransactions(res.data.data.transactions)
            }
        } catch (err) {
            console.log("Wallet Fetch Error:", err)
        }
    }

    useEffect(() => {
        fetchWallet()
    }, [])

    const handleAddMoney = async () => {
        // FIXED: Explicit check for mobile input strings
        const numericAmount = Number(amount)
        
        if (!numericAmount || numericAmount <= 0) {
            toast.error('Enter a valid amount')
            return
        }

        if (numericAmount > 10000) {
            toast.error('Maximum limit is ₹10,000')
            return
        }

        setLoading(true)
        try {
            const res = await Axios({
                ...SummaryApi.addMoneyToWallet,
                data: { amount: numericAmount } // Sent as Number
            })
            
            if (res.data.success) {
                toast.success(res.data.message)
                setAmount('')
                fetchWallet() // Refresh balance and history
            }
        } catch (err) {
            // FIXED: Using AxiosToastError to catch CORS or Backend validation errors
            AxiosToastError(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-lg mx-auto p-4 pb-24 lg:pb-10">
            {/* Balance Card - Styled for Mobile & Desktop */}
            <div className="bg-slate-900 text-white rounded-3xl p-8 mb-6 text-center shadow-xl shadow-slate-200">
                <p className="text-xs uppercase tracking-widest opacity-60 mb-2 font-bold">Snapit Wallet Balance</p>
                <h1 className="text-5xl font-black italic">₹{Number(balance).toLocaleString('en-IN')}</h1>
                <div className="mt-4 inline-block bg-green-500/20 text-green-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tight">
                    ✨ 5% Bonus on ₹500+
                </div>
            </div>

            {/* Add Money Section */}
            <div className="bg-white border border-neutral-100 rounded-3xl p-5 mb-6 shadow-sm">
                <h2 className="font-bold text-slate-800 text-lg mb-4">Quick Top-up</h2>

                <div className="grid grid-cols-4 gap-2 mb-4">
                    {[100, 200, 500, 1000].map((val) => (
                        <button
                            key={val}
                            onClick={() => setAmount(val)}
                            className={`py-3 rounded-2xl text-sm font-bold border transition-all active:scale-95 ${
                                Number(amount) === val 
                                ? 'bg-green-600 border-green-600 text-white' 
                                : 'bg-white border-neutral-200 text-slate-600 hover:border-green-500'
                            }`}
                        >
                            ₹{val}
                        </button>
                    ))}
                </div>

                <div className="relative mb-4">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">₹</span>
                    <input
                        type="number"
                        placeholder="Enter custom amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-10 pr-4 font-bold text-lg focus:ring-2 focus:ring-green-500 transition-all"
                    />
                </div>

                <button
                    onClick={handleAddMoney}
                    disabled={loading}
                    className="w-full bg-green-700 hover:bg-green-800 text-white py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all active:scale-95 shadow-lg shadow-green-100 disabled:bg-slate-300"
                >
                    {loading ? 'Processing...' : 'Add Money to Wallet'}
                </button>
            </div>

            {/* Transaction History - Optimized for Mobile Scrolling */}
            <div className="bg-white border border-neutral-100 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-slate-800 text-lg">Recent Activity</h2>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Last 20</span>
                </div>
                
                <div className="space-y-1">
                    {transactions.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-3xl mb-2">💸</p>
                            <p className="text-slate-400 font-medium text-sm">No transactions yet</p>
                        </div>
                    ) : (
                        transactions.map((txn, index) => (
                            <div
                                key={index + "txn"}
                                className="flex justify-between items-center py-4 border-b border-slate-50 last:border-0"
                            >
                                <div className="flex flex-col gap-0.5">
                                    <p className="text-sm font-bold text-slate-800">
                                        {txn.description}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                        {new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                                <span className={`font-black text-sm ${
                                    txn.type === 'credit'
                                        ? 'text-green-600'
                                        : 'text-rose-500'
                                }`}>
                                    {txn.type === 'credit' ? '+' : '-'} ₹{txn.amount}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

export default Wallet