import React, { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'

const Wallet = () => {
    const [balance,      setBalance]      = useState(0)
    const [transactions, setTransactions] = useState([])
    const [amount,       setAmount]       = useState('')
    const [loading,      setLoading]      = useState(false)
    const [fetching,     setFetching]     = useState(true)

    const fetchWallet = async () => {
        try {
            const res = await Axios({
                url:    '/api/wallet/get',
                method: 'get'
            })
            if (res.data.success) {
                setBalance(res.data.data.balance)
                setTransactions(res.data.data.transactions)
            }
        } catch (err) {
            console.log('Wallet fetch error:', err?.response?.data)
        } finally {
            setFetching(false)
        }
    }

    useEffect(() => { fetchWallet() }, [])

    const handleAddMoney = async (customAmount) => {
        const finalAmount = Number(customAmount !== undefined ? customAmount : amount)
        if (!finalAmount || finalAmount <= 0) {
            toast.error('Enter a valid amount')
            return
        }
        if (finalAmount > 10000) {
            toast.error('Maximum limit is Rs. 10,000')
            return
        }
        setLoading(true)
        try {
            const res = await Axios({
                url:    '/api/wallet/add-money',
                method: 'post',
                data:   { amount: finalAmount }
            })
            if (res.data.success) {
                toast.success(res.data.message)
                setAmount('')
                fetchWallet()
            } else {
                toast.error(res.data.message || 'Failed to add money')
            }
        } catch (err) {
            const msg = err?.response?.data?.message || 'Failed. Please login again.'
            toast.error(msg)
            console.log('Add money error:', err?.response?.data)
        } finally {
            setLoading(false)
        }
    }

    const numAmount = Number(amount)
    const bonus     = numAmount >= 500 ? Math.floor(numAmount * 0.05) : 0

    if (fetching) return (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'60vh', flexDirection:'column', gap:'12px' }}>
            <div style={{ fontSize:'40px' }}>💰</div>
            <p style={{ color:'#6b7280' }}>Loading wallet...</p>
        </div>
    )

    return (
        <div style={{ minHeight:'100vh', background:'#f9fafb', paddingBottom:'80px' }}>
            <div style={{ maxWidth:'480px', margin:'0 auto', padding:'16px' }}>

                {/* Balance Card */}
                <div style={{
                    background:    '#16a34a',
                    color:         'white',
                    borderRadius:  '24px',
                    padding:       '28px 24px',
                    textAlign:     'center',
                    marginBottom:  '20px',
                    boxShadow:     '0 4px 20px rgba(22,163,74,0.3)'
                }}>
                    <p style={{ fontSize:'13px', opacity:0.8, margin:'0 0 6px' }}>
                        Snapit Wallet Balance
                    </p>
                    <h1 style={{ fontSize:'48px', fontWeight:'800', margin:'0 0 10px', letterSpacing:'-1px' }}>
                        ₹{Number(balance).toFixed(2)}
                    </h1>
                    <div style={{
                        background:    'rgba(255,255,255,0.2)',
                        borderRadius:  '50px',
                        padding:       '6px 16px',
                        display:       'inline-block',
                        fontSize:      '12px',
                        opacity:       0.9
                    }}>
                        Add ₹500+ and get 5% bonus cash!
                    </div>
                </div>

                {/* Quick Amount Buttons */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'12px' }}>
                    {[100, 200, 500, 1000].map((val) => (
                        <button
                            key={val}
                            onClick={() => setAmount(val)}
                            style={{
                                padding:       '12px 4px',
                                borderRadius:  '16px',
                                border:        numAmount === val ? '2px solid #16a34a' : '1.5px solid #e5e7eb',
                                background:    numAmount === val ? '#f0fdf4' : 'white',
                                color:         numAmount === val ? '#16a34a' : '#374151',
                                fontWeight:    '600',
                                fontSize:      '14px',
                                cursor:        'pointer',
                                transition:    'all 0.15s'
                            }}
                        >
                            ₹{val}
                        </button>
                    ))}
                </div>

                {/* Add Money Card */}
                <div style={{
                    background:    'white',
                    borderRadius:  '24px',
                    border:        '1px solid #f0f0f0',
                    padding:       '20px',
                    marginBottom:  '16px',
                    boxShadow:     '0 1px 4px rgba(0,0,0,0.05)'
                }}>
                    <p style={{ fontSize:'13px', color:'#6b7280', marginBottom:'10px', fontWeight:'500' }}>
                        Enter amount
                    </p>

                    <div style={{ display:'flex', gap:'10px', marginBottom:'12px' }}>
                        <div style={{ flex:1, position:'relative' }}>
                            <span style={{
                                position:   'absolute',
                                left:       '14px',
                                top:        '50%',
                                transform:  'translateY(-50%)',
                                color:      '#6b7280',
                                fontWeight: '600',
                                fontSize:   '18px'
                            }}>₹</span>
                            <input
                                type="number"
                                placeholder="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                style={{
                                    width:        '100%',
                                    border:       '1.5px solid #e5e7eb',
                                    borderRadius: '14px',
                                    padding:      '14px 14px 14px 36px',
                                    fontSize:     '20px',
                                    fontWeight:   '700',
                                    outline:      'none',
                                    boxSizing:    'border-box',
                                    color:        '#111827'
                                }}
                            />
                        </div>
                        <button
                            onClick={() => handleAddMoney()}
                            disabled={loading || !amount}
                            style={{
                                padding:       '14px 20px',
                                borderRadius:  '14px',
                                border:        'none',
                                background:    loading || !amount ? '#d1d5db' : '#16a34a',
                                color:         'white',
                                fontWeight:    '700',
                                fontSize:      '15px',
                                cursor:        loading || !amount ? 'not-allowed' : 'pointer',
                                whiteSpace:    'nowrap',
                                transition:    'all 0.15s'
                            }}
                        >
                            {loading ? '...' : 'Add Money'}
                        </button>
                    </div>

                    {/* Bonus Preview */}
                    {bonus > 0 && (
                        <div style={{
                            background:    '#f0fdf4',
                            borderRadius:  '12px',
                            padding:       '10px 14px',
                            display:       'flex',
                            alignItems:    'center',
                            gap:           '8px'
                        }}>
                            <span style={{ fontSize:'18px' }}>🎉</span>
                            <p style={{ color:'#15803d', fontSize:'13px', fontWeight:'600', margin:0 }}>
                                You'll get ₹{bonus} bonus! Total credited: ₹{numAmount + bonus}
                            </p>
                        </div>
                    )}
                </div>

                {/* One-tap Add Buttons */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'20px' }}>
                    {[
                        { label:'Add ₹100',      value:100  },
                        { label:'Add ₹200',      value:200  },
                        { label:'Add ₹500 +5%',  value:500  }
                    ].map((item) => (
                        <button
                            key={item.value}
                            onClick={() => handleAddMoney(item.value)}
                            disabled={loading}
                            style={{
                                padding:       '12px 8px',
                                borderRadius:  '14px',
                                border:        '1.5px solid #e5e7eb',
                                background:    'white',
                                color:         '#374151',
                                fontWeight:    '600',
                                fontSize:      '12px',
                                cursor:        'pointer',
                                boxShadow:     '0 1px 3px rgba(0,0,0,0.05)',
                                transition:    'all 0.15s'
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Transaction History */}
                <div style={{
                    background:    'white',
                    borderRadius:  '24px',
                    border:        '1px solid #f0f0f0',
                    padding:       '20px',
                    boxShadow:     '0 1px 4px rgba(0,0,0,0.05)'
                }}>
                    <h2 style={{ fontWeight:'700', fontSize:'16px', marginBottom:'16px', color:'#111827' }}>
                        Transaction History
                    </h2>

                    {transactions.length === 0 ? (
                        <div style={{ textAlign:'center', padding:'32px 0' }}>
                            <div style={{ fontSize:'40px', marginBottom:'8px' }}>📋</div>
                            <p style={{ color:'#9ca3af', fontSize:'14px' }}>No transactions yet</p>
                        </div>
                    ) : (
                        transactions.map((txn, index) => (
                            <div
                                key={index}
                                style={{
                                    display:        'flex',
                                    justifyContent: 'space-between',
                                    alignItems:     'center',
                                    padding:        '12px 0',
                                    borderBottom:   index < transactions.length - 1
                                        ? '1px solid #f9fafb' : 'none'
                                }}
                            >
                                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                                    <div style={{
                                        width:          '38px',
                                        height:         '38px',
                                        borderRadius:   '50%',
                                        background:     txn.type === 'credit' ? '#dcfce7' : '#fee2e2',
                                        display:        'flex',
                                        alignItems:     'center',
                                        justifyContent: 'center',
                                        fontSize:       '16px',
                                        flexShrink:     0
                                    }}>
                                        {txn.type === 'credit' ? '⬇' : '⬆'}
                                    </div>
                                    <div>
                                        <p style={{ fontSize:'13px', fontWeight:'600', color:'#111827', margin:'0 0 2px' }}>
                                            {txn.description}
                                        </p>
                                        <p style={{ fontSize:'11px', color:'#9ca3af', margin:0 }}>
                                            {new Date(txn.date).toLocaleDateString('en-IN', {
                                                day:'2-digit', month:'short', year:'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <span style={{
                                    fontWeight: '700',
                                    fontSize:   '14px',
                                    color:      txn.type === 'credit' ? '#16a34a' : '#ef4444',
                                    flexShrink: 0
                                }}>
                                    {txn.type === 'credit' ? '+' : '-'}₹{txn.amount}
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