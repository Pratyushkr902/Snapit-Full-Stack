import React, { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'
import { useGlobalContext } from '../provider/GlobalProvider' // IMPORTED FOR SYNC

const Wallet = () => {
    const [balance,      setBalance]      = useState(0)
    const [transactions, setTransactions] = useState([])
    const [amount,       setAmount]       = useState('')
    const [loading,      setLoading]      = useState(false)
    const [fetching,     setFetching]     = useState(true)

    // --- SYNC: Accessing Global Context to update Header ---
    const { fetchUser } = useGlobalContext()

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
                
                // --- CRITICAL SYNC ---
                // This updates the Redux/Global state so the Header balance changes
                if (fetchUser) fetchUser(); 
                
                fetchWallet() // Local balance refresh
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
            <div style={{ fontSize:'40px', animation: 'bounce 1s infinite' }}>💰</div>
            <p style={{ color:'#6b7280', fontWeight: '600' }}>Loading your Snapit Wallet...</p>
        </div>
    )

    return (
        <div style={{ minHeight:'100vh', background:'#f9fafb', paddingBottom:'80px' }}>
            <div style={{ maxWidth:'480px', margin:'0 auto', padding:'16px' }}>

                {/* Balance Card */}
                <div style={{
                    background:    'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color:         'white',
                    borderRadius:  '28px',
                    padding:       '32px 24px',
                    textAlign:     'center',
                    marginBottom:  '24px',
                    boxShadow:     '0 10px 25px -5px rgba(22,163,74,0.4)',
                    position:      'relative',
                    overflow:      'hidden'
                }}>
                    <p style={{ fontSize:'14px', fontWeight: '700', opacity:0.9, margin:'0 0 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Snapit Wallet Balance
                    </p>
                    <h1 style={{ fontSize:'52px', fontWeight:'900', margin:'0 0 12px', letterSpacing:'-2px' }}>
                        ₹{Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </h1>
                    <div style={{
                        background:    'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(4px)',
                        borderRadius:  '50px',
                        padding:       '8px 20px',
                        display:       'inline-block',
                        fontSize:      '12px',
                        fontWeight:    '700',
                        border:        '1px solid rgba(255,255,255,0.3)'
                    }}>
                        ✨ Add ₹500+ and get 5% bonus cash!
                    </div>
                </div>

                {/* Quick Amount Buttons */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'16px' }}>
                    {[100, 200, 500, 1000].map((val) => (
                        <button
                            key={val}
                            onClick={() => setAmount(val)}
                            style={{
                                padding:       '14px 4px',
                                borderRadius:  '18px',
                                border:        numAmount === val ? '2px solid #16a34a' : '1.5px solid #e5e7eb',
                                background:    numAmount === val ? '#f0fdf4' : 'white',
                                color:         numAmount === val ? '#16a34a' : '#374151',
                                fontWeight:    '700',
                                fontSize:      '15px',
                                cursor:        'pointer',
                                transition:    'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform:     numAmount === val ? 'scale(1.05)' : 'scale(1)'
                            }}
                        >
                            ₹{val}
                        </button>
                    ))}
                </div>

                {/* Add Money Card */}
                <div style={{
                    background:    'white',
                    borderRadius:  '28px',
                    border:        '1px solid #f1f5f9',
                    padding:       '24px',
                    marginBottom:  '16px',
                    boxShadow:     '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}>
                    <p style={{ fontSize:'14px', color:'#64748b', marginBottom:'12px', fontWeight:'700', textTransform:'uppercase' }}>
                        Custom Amount
                    </p>

                    <div style={{ display:'flex', gap:'12px', marginBottom:'16px' }}>
                        <div style={{ flex:1, position:'relative' }}>
                            <span style={{
                                position:   'absolute',
                                left:       '16px',
                                top:        '50%',
                                transform:  'translateY(-50%)',
                                color:      '#94a3b8',
                                fontWeight: '800',
                                fontSize:   '20px'
                            }}>₹</span>
                            <input
                                type="number"
                                placeholder="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                style={{
                                    width:        '100%',
                                    border:       '2px solid #f1f5f9',
                                    borderRadius: '16px',
                                    padding:      '16px 16px 16px 40px',
                                    fontSize:     '22px',
                                    fontWeight:   '800',
                                    outline:      'none',
                                    boxSizing:    'border-box',
                                    color:        '#0f172a',
                                    background:   '#f8fafc',
                                    transition:   'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#16a34a'}
                                onBlur={(e) => e.target.style.borderColor = '#f1f5f9'}
                            />
                        </div>
                        <button
                            onClick={() => handleAddMoney()}
                            disabled={loading || !amount}
                            style={{
                                padding:       '0 24px',
                                borderRadius:  '16px',
                                border:        'none',
                                background:    loading || !amount ? '#e2e8f0' : '#16a34a',
                                color:         'white',
                                fontWeight:    '800',
                                fontSize:      '16px',
                                cursor:        loading || !amount ? 'not-allowed' : 'pointer',
                                transition:    'all 0.2s',
                                boxShadow:     loading || !amount ? 'none' : '0 4px 12px rgba(22,163,74,0.2)'
                            }}
                        >
                            {loading ? '...' : 'Add'}
                        </button>
                    </div>

                    {/* Bonus Preview */}
                    {bonus > 0 && (
                        <div style={{
                            background:    '#f0fdf4',
                            borderRadius:  '16px',
                            padding:       '12px 16px',
                            display:       'flex',
                            alignItems:    'center',
                            gap:           '10px',
                            border:        '1px dashed #22c55e'
                        }}>
                            <span style={{ fontSize:'20px' }}>⚡</span>
                            <p style={{ color:'#15803d', fontSize:'14px', fontWeight:'700', margin:0 }}>
                                Bonus: ₹{bonus} | Total: ₹{numAmount + bonus}
                            </p>
                        </div>
                    )}
                </div>

                {/* One-tap Quick Adds */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'24px' }}>
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
                                padding:       '14px 8px',
                                borderRadius:  '18px',
                                border:        '1.5px solid #f1f5f9',
                                background:    'white',
                                color:         '#475569',
                                fontWeight:    '700',
                                fontSize:      '13px',
                                cursor:        'pointer',
                                transition:    'all 0.2s'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#f8fafc'}
                            onMouseOut={(e) => e.target.style.background = 'white'}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Transaction History */}
                <div style={{
                    background:    'white',
                    borderRadius:  '28px',
                    border:        '1px solid #f1f5f9',
                    padding:       '24px',
                    boxShadow:     '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}>
                    <h2 style={{ fontWeight:'800', fontSize:'18px', marginBottom:'20px', color:'#0f172a', display:'flex', alignItems:'center', gap:'8px' }}>
                        <span>📋</span> Recent Activity
                    </h2>

                    {transactions.length === 0 ? (
                        <div style={{ textAlign:'center', padding:'40px 0' }}>
                            <div style={{ fontSize:'44px', marginBottom:'12px', opacity:0.5 }}>🏜️</div>
                            <p style={{ color:'#94a3b8', fontSize:'15px', fontWeight:'600' }}>Your history is empty</p>
                        </div>
                    ) : (
                        transactions.map((txn, index) => (
                            <div
                                key={index}
                                style={{
                                    display:        'flex',
                                    justifyContent: 'space-between',
                                    alignItems:     'center',
                                    padding:        '16px 0',
                                    borderBottom:   index < transactions.length - 1
                                        ? '1px solid #f8fafc' : 'none'
                                }}
                            >
                                <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                                    <div style={{
                                        width:          '42px',
                                        height:         '42px',
                                        borderRadius:   '14px',
                                        background:     txn.type === 'credit' ? '#dcfce7' : '#fee2e2',
                                        display:        'flex',
                                        alignItems:     'center',
                                        justifyContent: 'center',
                                        fontSize:       '18px',
                                        flexShrink:     0
                                    }}>
                                        {txn.type === 'credit' ? '💰' : '🛒'}
                                    </div>
                                    <div>
                                        <p style={{ fontSize:'14px', fontWeight:'700', color:'#1e293b', margin:'0 0 2px' }}>
                                            {txn.description}
                                        </p>
                                        <p style={{ fontSize:'12px', color:'#94a3b8', fontWeight:'600', margin:0 }}>
                                            {new Date(txn.date).toLocaleDateString('en-IN', {
                                                day:'2-digit', month:'short'
                                            })} • {new Date(txn.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <span style={{
                                    fontWeight: '800',
                                    fontSize:   '15px',
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