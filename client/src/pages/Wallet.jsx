import React, { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'

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
            console.log(err)
        }
    }

    useEffect(() => {
        fetchWallet()
    }, [])

    const handleAddMoney = async () => {
        if (!amount || amount <= 0) {
            toast.error('Enter a valid amount')
            return
        }
        setLoading(true)
        try {
            const res = await Axios({
                ...SummaryApi.addMoneyToWallet,
                data: { amount: Number(amount) }
            })
            if (res.data.success) {
                toast.success(res.data.message)
                setAmount('')
                fetchWallet()
            }
        } catch (err) {
            toast.error('Failed to add money')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-lg mx-auto p-4">

            {/* Balance Card */}
            <div className="bg-green-600 text-white rounded-2xl p-6 mb-6 text-center">
                <p className="text-sm opacity-80 mb-1">Snapit Wallet Balance</p>
                <h1 className="text-4xl font-bold">₹{balance.toFixed(2)}</h1>
                <p className="text-xs opacity-70 mt-2">
                    Add ₹500 or more and get 5% bonus!
                </p>
            </div>

            {/* Add Money */}
            <div className="bg-white border rounded-2xl p-4 mb-6">
                <h2 className="font-semibold text-lg mb-3">Add Money</h2>

                {/* Quick amounts */}
                <div className="flex gap-2 mb-3">
                    {[100, 200, 500, 1000].map((val) => (
                        <button
                            key={val}
                            onClick={() => setAmount(val)}
                            className="flex-1 border rounded-lg py-2 text-sm font-medium hover:bg-green-50 hover:border-green-500 transition-all"
                        >
                            ₹{val}
                        </button>
                    ))}
                </div>

                <input
                    type="number"
                    placeholder="Enter custom amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2 mb-3 focus:outline-none focus:border-green-500"
                />

                <button
                    onClick={handleAddMoney}
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-all"
                >
                    {loading ? 'Adding...' : 'Add Money'}
                </button>
            </div>

            {/* Transaction History */}
            <div className="bg-white border rounded-2xl p-4">
                <h2 className="font-semibold text-lg mb-3">
                    Transaction History
                </h2>
                {transactions.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">
                        No transactions yet
                    </p>
                ) : (
                    transactions.map((txn, index) => (
                        <div
                            key={index}
                            className="flex justify-between items-center py-3 border-b last:border-0"
                        >
                            <div>
                                <p className="text-sm font-medium">
                                    {txn.description}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {new Date(txn.date).toLocaleDateString()}
                                </p>
                            </div>
                            <span className={`font-bold text-sm ${
                                txn.type === 'credit'
                                    ? 'text-green-600'
                                    : 'text-red-500'
                            }`}>
                                {txn.type === 'credit' ? '+' : '-'}₹{txn.amount}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default Wallet