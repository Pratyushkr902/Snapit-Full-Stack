import React, { useEffect, useState } from 'react'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'

const ReferAndEarn = () => {
    const [info,    setInfo]    = useState(null)
    const [loading, setLoading] = useState(true)
    const [copied,  setCopied]  = useState(false)

    useEffect(() => {
        fetchReferralInfo()
    }, [])

    const fetchReferralInfo = async () => {
        try {
            const res = await Axios({ ...SummaryApi.getReferralInfo })
            if (res.data.success) {
                setInfo(res.data.data)
            }
        } catch (err) {
            console.log(err)
        } finally {
            setLoading(false)
        }
    }

    const handleCopyCode = () => {
        navigator.clipboard.writeText(info.referralCode)
        setCopied(true)
        toast.success('Referral code copied!')
        setTimeout(() => setCopied(false), 2000)
    }

    const handleCopyLink = () => {
        navigator.clipboard.writeText(info.referralLink)
        toast.success('Referral link copied!')
    }

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Join Snapit!',
                text:  `Use my referral code ${info.referralCode} and get Rs.20 off your first order on Snapit!`,
                url:   info.referralLink
            })
        } else {
            handleCopyLink()
        }
    }

    if (loading) return (
        <div className="flex justify-center items-center min-h-[60vh]">
            <p>Loading...</p>
        </div>
    )

    return (
        <div className="max-w-lg mx-auto p-4">

            {/* Header */}
            <div className="bg-green-600 text-white rounded-2xl p-6 mb-6 text-center">
                <div className="text-5xl mb-3">🎁</div>
                <h1 className="text-2xl font-bold mb-1">Refer & Earn</h1>
                <p className="text-sm opacity-80">
                    Invite friends and earn Rs.20 for every friend who joins!
                </p>
            </div>

            {/* How it works */}
            <div className="bg-white border rounded-2xl p-4 mb-4">
                <h2 className="font-semibold text-lg mb-4">How it works</h2>
                <div className="space-y-4">
                    {[
                        { icon: '📤', title: 'Share your code', desc: 'Share your unique referral code with friends' },
                        { icon: '👤', title: 'Friend registers', desc: 'Your friend signs up using your code' },
                        { icon: '💰', title: 'Both earn Rs.20', desc: 'You get Rs.20, your friend gets Rs.20 on first order' }
                    ].map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className="text-2xl">{step.icon}</div>
                            <div>
                                <p className="font-medium text-sm">{step.title}</p>
                                <p className="text-xs text-gray-500">{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Referral Code */}
            <div className="bg-white border rounded-2xl p-4 mb-4">
                <p className="text-sm text-gray-500 mb-2">Your Referral Code</p>
                <div className="flex items-center gap-3">
                    <div className="flex-1 bg-green-50 border-2 border-dashed border-green-400 rounded-xl py-3 text-center">
                        <span className="text-2xl font-bold text-green-600 tracking-widest">
                            {info?.referralCode}
                        </span>
                    </div>
                    <button
                        onClick={handleCopyCode}
                        className="bg-green-600 text-white px-4 py-3 rounded-xl font-medium text-sm"
                    >
                        {copied ? '✓ Copied' : 'Copy'}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white border rounded-2xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">
                        {info?.referralCount}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Friends Referred</p>
                </div>
                <div className="bg-white border rounded-2xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">
                        ₹{info?.totalEarned}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Total Earned</p>
                </div>
            </div>

            {/* Share Button */}
            <button
                onClick={handleShare}
                className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-700 transition-all"
            >
                📤 Share & Earn Rs.20
            </button>

        </div>
    )
}

export default ReferAndEarn