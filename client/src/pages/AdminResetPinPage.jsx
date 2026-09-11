import React, { useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import { FaWhatsapp, FaKey, FaCopy, FaCheck } from 'react-icons/fa6'
import AdminPermision from '../layouts/AdminPermision'

const AdminResetPinPage = () => {
    const [mobile, setMobile] = useState('')
    const [newPin, setNewPin] = useState('1234')
    const [loading, setLoading] = useState(false)
    const [lastReset, setLastReset] = useState(null)
    const [copied, setCopied] = useState(false)

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
                setCopied(false)
            } else {
                toast.error(res.data.message || 'Failed to reset PIN')
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || 'Error resetting customer PIN')
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
        setCopied(true)
        toast.success('WhatsApp reply copied to clipboard!')
        setTimeout(() => setCopied(false), 3000)
    }

    return (
        <AdminPermision>
            <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">
                    
                    {/* Header */}
                    <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-gray-100">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                            <FaKey size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 leading-tight">Customer PIN Reset</h1>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Instantly reset 4-digit PIN for customers requesting assistance on WhatsApp
                            </p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleReset} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Customer 10-Digit Mobile Number <span className="text-rose-500">*</span>
                            </label>
                            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                <span className="text-sm font-bold text-gray-700 mr-2 flex items-center gap-1 select-none border-r border-gray-200 pr-2">
                                    +91
                                </span>
                                <input
                                    type="tel"
                                    maxLength={10}
                                    value={mobile}
                                    onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                                    placeholder="e.g. 9876543210"
                                    className="w-full bg-transparent outline-none text-sm font-semibold text-gray-900 placeholder-gray-400"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Set New 4-Digit PIN <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                maxLength={8}
                                value={newPin}
                                onChange={e => setNewPin(e.target.value)}
                                placeholder="Default 1234"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 text-sm font-bold text-gray-900 focus:border-green-600 focus:bg-white outline-none transition-all"
                                required
                            />
                            <p className="text-[11px] text-gray-400 mt-1">
                                Default is 1234. Customer can change it in their Profile after logging in.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || mobile.replace(/\D/g, '').length !== 10 || !newPin.trim()}
                            className={`w-full h-12 rounded-xl text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2
                                ${mobile.length === 10 && !loading
                                    ? 'bg-green-700 hover:bg-green-800 active:scale-[0.99] cursor-pointer'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {loading ? 'Resetting PIN...' : 'Reset PIN Now'}
                        </button>
                    </form>

                    {/* Success & WhatsApp Reply Card */}
                    {lastReset && (
                        <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-2">
                                <FaCheck className="text-emerald-600" />
                                <span>PIN Successfully Reset!</span>
                            </div>
                            <p className="text-xs text-emerald-900 mb-4">
                                Account for <span className="font-bold">{lastReset.name}</span> (+91 {lastReset.mobile}) has been updated with new PIN: <span className="font-extrabold text-base bg-white px-2 py-0.5 rounded border border-emerald-300">{lastReset.pin}</span>
                            </p>

                            <div className="flex flex-col sm:flex-row gap-2">
                                <a
                                    href={whatsappReplyUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                                >
                                    <FaWhatsapp size={16} />
                                    <span>Send Reply on WhatsApp</span>
                                </a>
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="h-11 px-4 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                                >
                                    {copied ? <FaCheck size={13} /> : <FaCopy size={13} />}
                                    <span>{copied ? 'Copied!' : 'Copy Reply'}</span>
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </AdminPermision>
    )
}

export default AdminResetPinPage
