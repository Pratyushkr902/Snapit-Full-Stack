import React, { useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import { FaWhatsapp, FaKey, FaCopy, FaCheck, FaEnvelope, FaPhone } from 'react-icons/fa6'
import AdminPermision from '../layouts/AdminPermision'

const AdminResetPinPage = () => {
    const [identifier, setIdentifier] = useState('')
    const [newPin, setNewPin] = useState('1234')
    const [linkMobile, setLinkMobile] = useState('')
    const [loading, setLoading] = useState(false)
    const [lastReset, setLastReset] = useState(null)
    const [copied, setCopied] = useState(false)

    const isEmail = identifier.includes('@')

    const handleReset = async (e) => {
        e.preventDefault()
        const cleanIdentifier = identifier.trim()
        if (!cleanIdentifier) {
            toast.error('Please enter customer mobile number or email address')
            return
        }

        if (!isEmail) {
            const digits = cleanIdentifier.replace(/\D/g, '')
            if (digits.length !== 10 && !(digits.length === 12 && digits.startsWith('91'))) {
                toast.error('Please enter a valid 10-digit mobile number or full email address')
                return
            }
        }

        if (!newPin.trim() || newPin.trim().length < 4) {
            toast.error('PIN must be at least 4 digits')
            return
        }

        try {
            setLoading(true)
            const res = await Axios({
                ...SummaryApi.adminResetPin,
                data: {
                    identifier: cleanIdentifier,
                    newPin: newPin.trim(),
                    updateMobile: linkMobile.trim() ? linkMobile.replace(/\D/g, '').slice(-10) : undefined
                }
            })

            if (res.data.success) {
                toast.success(res.data.message || 'PIN reset successfully!')
                setLastReset({
                    name: res.data.data?.name || 'Customer',
                    email: res.data.data?.email || (isEmail ? cleanIdentifier : ''),
                    mobile: res.data.data?.mobile || '',
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

    const whatsappReplyUrl = lastReset?.mobile
        ? `https://wa.me/91${lastReset.mobile}?text=${encodeURIComponent(replyText)}`
        : '#'

    const handleCopy = () => {
        if (!replyText) return
        navigator.clipboard.writeText(replyText)
        setCopied(true)
        toast.success('Reply message copied to clipboard!')
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
                                Instantly reset 4-digit PIN for customers requesting assistance via Phone or Email
                            </p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleReset} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Customer Mobile Number or Email Address <span className="text-rose-500">*</span>
                            </label>
                            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 h-12 focus-within:border-green-600 focus-within:bg-white transition-all">
                                {!isEmail ? (
                                    <span className="text-sm font-bold text-gray-700 mr-2 flex items-center gap-1 select-none border-r border-gray-200 pr-2">
                                        +91
                                    </span>
                                ) : (
                                    <span className="text-gray-400 mr-2 border-r border-gray-200 pr-2 flex items-center">
                                        <FaEnvelope size={14} />
                                    </span>
                                )}
                                <input
                                    type="text"
                                    value={identifier}
                                    onChange={e => setIdentifier(e.target.value)}
                                    placeholder="e.g. 9876543210 or customer@gmail.com"
                                    className="w-full bg-transparent outline-none text-sm font-semibold text-gray-900 placeholder-gray-400"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Optional Phone Link field if searching by Email */}
                        {isEmail && (
                            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                                <label className="block text-xs font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                                    <FaPhone size={11} className="text-blue-600" />
                                    Link 10-Digit Mobile Number (Optional)
                                </label>
                                <div className="flex items-center bg-white border border-blue-200 rounded-xl px-3.5 h-11 focus-within:border-blue-600 transition-all">
                                    <span className="text-xs font-bold text-gray-600 mr-2 select-none border-r border-gray-200 pr-2">+91</span>
                                    <input
                                        type="tel"
                                        maxLength={10}
                                        value={linkMobile}
                                        onChange={e => setLinkMobile(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Add phone number to this email account"
                                        className="w-full bg-transparent outline-none text-xs font-semibold text-gray-900"
                                    />
                                </div>
                                <p className="text-[10px] text-blue-700 mt-1">
                                    If the user registered without a phone, entering one here links it so they can log in via mobile going forward.
                                </p>
                            </div>
                        )}

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
                            disabled={loading || !identifier.trim() || !newPin.trim()}
                            className={`w-full h-12 rounded-xl text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2
                                ${identifier.trim() && !loading
                                    ? 'bg-green-700 hover:bg-green-800 active:scale-[0.99] cursor-pointer'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {loading ? 'Resetting PIN...' : 'Reset PIN Now'}
                        </button>
                    </form>

                    {/* Success & WhatsApp / Email Reply Card */}
                    {lastReset && (
                        <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-2">
                                <FaCheck className="text-emerald-600" />
                                <span>PIN Successfully Reset!</span>
                            </div>
                            <p className="text-xs text-emerald-900 mb-4">
                                Account for <span className="font-bold">{lastReset.name}</span> ({lastReset.mobile ? `+91 ${lastReset.mobile}` : lastReset.email}) has been updated with new PIN: <span className="font-extrabold text-base bg-white px-2 py-0.5 rounded border border-emerald-300">{lastReset.pin}</span>
                            </p>

                            <div className="flex flex-col sm:flex-row gap-2">
                                {lastReset.mobile ? (
                                    <a
                                        href={whatsappReplyUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                                    >
                                        <FaWhatsapp size={16} />
                                        <span>Send Reply on WhatsApp</span>
                                    </a>
                                ) : (
                                    <a
                                        href={`mailto:${lastReset.email}?subject=Snapit PIN Reset&body=${encodeURIComponent(replyText)}`}
                                        className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                                    >
                                        <FaEnvelope size={14} />
                                        <span>Send Reply via Email</span>
                                    </a>
                                )}
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
