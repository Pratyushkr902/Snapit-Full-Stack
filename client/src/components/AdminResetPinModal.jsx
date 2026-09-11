import React, { useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import { FaWhatsapp, FaKey, FaCopy } from 'react-icons/fa6'

const AdminResetPinModal = () => {
    const [mobile, setMobile] = useState('')
    const [newPin, setNewPin] = useState('1234')
    const [loading, setLoading] = useState(false)
    const [lastReset, setLastReset] = useState(null)

    const handleReset = async (e) => {
        e.preventDefault()
        const clean = mobile.replace(/\D/g, '')
        if (clean.length !== 10) {
            toast.error('Please enter a valid 10-digit mobile number')
            return
        }
        if (!newPin.trim() || newPin.trim().length < 4) {
            toast.error('PIN must be at least 4 digits')
            return
        }

        try {
            setLoading(true)
            const res = await Axios({
                ...SummaryApi.adminResetPin,
                data: { mobile: clean, newPin: newPin.trim() }
            })

            if (res.data.success) {
                toast.success(res.data.message || 'PIN reset successfully!')
                setLastReset({
                    name: res.data.data?.name || 'Customer',
                    mobile: clean,
                    pin: newPin.trim()
                })
            } else {
                toast.error(res.data.message || 'Failed to reset PIN')
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || 'Error resetting PIN')
        } finally {
            setLoading(false)
        }
    }

    const replyText = lastReset
        ? `Hi ${lastReset.name}, your Snapit 4-digit PIN has been reset to: ${lastReset.pin}. You can now log in to the Snapit app or website!`
        : ''

    const whatsappReplyUrl = lastReset
        ? `https://wa.me/91${lastReset.mobile}?text=${encodeURIComponent(replyText)}`
        : '#'

    const handleCopy = () => {
        if (!replyText) return
        navigator.clipboard.writeText(replyText)
        toast.success('WhatsApp reply copied to clipboard!')
    }

    return (
        <div style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 16,
            padding: 18,
            marginTop: 12
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{
                    width: 28, height: 28, borderRadius: 8, background: '#166534',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80'
                }}>
                    <FaKey size={13} />
                </div>
                <div>
                    <h3 style={{ fontSize: 12, fontWeight: 800, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Reset Customer PIN
                    </h3>
                    <p style={{ fontSize: 10, color: '#94a3b8' }}>For customers requesting PIN reset via WhatsApp</p>
                </div>
            </div>

            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#cbd5e1', marginBottom: 4 }}>
                        Customer 10-Digit Mobile:
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#1e293b', borderRadius: 8, padding: '0 10px', border: '1px solid #334155' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginRight: 6 }}>+91</span>
                        <input
                            type="tel"
                            maxLength={10}
                            value={mobile}
                            onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                            placeholder="e.g. 9876543210"
                            style={{
                                width: '100%', background: 'transparent', border: 'none',
                                outline: 'none', color: '#f8fafc', fontSize: 12, fontWeight: 600, padding: '8px 0'
                            }}
                            required
                        />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#cbd5e1', marginBottom: 4 }}>
                        New 4-Digit PIN:
                    </label>
                    <input
                        type="text"
                        maxLength={8}
                        value={newPin}
                        onChange={e => setNewPin(e.target.value)}
                        placeholder="Default 1234"
                        style={{
                            width: '100%', background: '#1e293b', border: '1px solid #334155',
                            borderRadius: 8, outline: 'none', color: '#4ade80', fontSize: 13,
                            fontWeight: 800, padding: '8px 10px', boxSizing: 'border-box'
                        }}
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || mobile.replace(/\D/g, '').length !== 10 || !newPin.trim()}
                    style={{
                        padding: '10px 14px', borderRadius: 8, border: 'none',
                        background: mobile.length === 10 && !loading ? '#16a34a' : '#334155',
                        color: mobile.length === 10 && !loading ? '#ffffff' : '#64748b',
                        fontSize: 11, fontWeight: 800, cursor: mobile.length === 10 && !loading ? 'pointer' : 'not-allowed',
                        marginTop: 4, transition: 'background 0.2s'
                    }}
                >
                    {loading ? 'Resetting PIN...' : 'Reset PIN Now'}
                </button>
            </form>

            {/* Quick WhatsApp Reply Action */}
            {lastReset && (
                <div style={{
                    marginTop: 12, padding: 10, background: '#052e16',
                    border: '1px solid #15803d', borderRadius: 10
                }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#86efac', marginBottom: 6 }}>
                        PIN reset to <span style={{ textDecoration: 'underline' }}>{lastReset.pin}</span> for {lastReset.name}!
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <a
                            href={whatsappReplyUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                flex: 1, padding: '6px 10px', background: '#22c55e', color: '#ffffff',
                                borderRadius: 6, textDecoration: 'none', fontSize: 10, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                            }}
                        >
                            <FaWhatsapp size={12} />
                            <span>Send on WhatsApp</span>
                        </a>
                        <button
                            type="button"
                            onClick={handleCopy}
                            style={{
                                padding: '6px 10px', background: '#1e293b', color: '#cbd5e1',
                                border: '1px solid #334155', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                            }}
                        >
                            <FaCopy size={11} />
                            <span>Copy</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminResetPinModal

