import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoArrowBack } from 'react-icons/io5'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import AxiosToastError from '../utils/AxiosToastError'

const AdminCampusAmbassadors = () => {
    const navigate = useNavigate()
    const [ambassadors, setAmbassadors] = useState([])
    const [loading, setLoading] = useState(true)
    const [collegeFilter, setCollegeFilter] = useState('all')

    const fetchAmbassadors = async () => {
        try {
            setLoading(true)
            const res = await Axios({ ...SummaryApi.getAllAmbassadors })
            if (res.data.success) setAmbassadors(res.data.data)
        } catch (err) {
            AxiosToastError(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAmbassadors() }, [])

    const colleges = ['all', ...new Set(ambassadors.map(a => a.campusAmbassador?.college).filter(Boolean))]
    const filtered = collegeFilter === 'all'
        ? ambassadors
        : ambassadors.filter(a => a.campusAmbassador?.college === collegeFilter)

    return (
        <section className='min-h-screen bg-gray-50 p-4'>
            <div className='max-w-4xl mx-auto'>
                <div className='flex items-center gap-3 mb-1'>
                    <button
                        onClick={() => navigate(-1)}
                        className='text-neutral-500 hover:text-neutral-800 transition-colors'
                    >
                        <IoArrowBack size={22} />
                    </button>
                    <h1 className='text-xl font-black text-gray-900'>Campus Ambassadors</h1>
                </div>
                <p className='text-sm text-gray-400 mb-5'>
                    {ambassadors.length} total ·{' '}
                    {ambassadors.filter(a => a.campusAmbassador?.status === 'active').length} active
                </p>

                {colleges.length > 1 && (
                    <div className='flex gap-2 flex-wrap mb-5'>
                        {colleges.map(c => (
                            <button key={c} onClick={() => setCollegeFilter(c)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                    collegeFilter === c ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500'
                                }`}>
                                {c === 'all' ? 'All Colleges' : c}
                            </button>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div className='flex justify-center mt-20'>
                        <div className='w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin' />
                    </div>
                ) : filtered.length === 0 ? (
                    <p className='text-neutral-500 text-sm text-center mt-10'>No Campus Ambassadors yet.</p>
                ) : (
                    <div className='flex flex-col gap-4'>
                        {filtered.map(a => {
                            const ca = a.campusAmbassador || {}
                            const stats = ca.referralStats || {}
                            return (
                                <div key={a._id} className='bg-white rounded-2xl border border-gray-100 p-5 shadow-sm'>
                                    <div className='flex items-start justify-between mb-3'>
                                        <div>
                                            <p className='text-xs text-gray-400 font-mono'>{ca.ambassadorId}</p>
                                            <p className='text-sm font-bold text-gray-800 mt-0.5'>{a.name}</p>
                                            <p className='text-xs text-gray-500 mt-0.5'>{a.email}</p>
                                            <p className='text-xs text-gray-500 mt-0.5'>
                                                {ca.college} · {ca.course} · {ca.year}
                                            </p>
                                            {ca.campus && <p className='text-[11px] text-gray-400 mt-0.5'>📍 {ca.campus}</p>}
                                            {ca.social?.instagram && (
                                                <a href={`https://instagram.com/${ca.social.instagram}`} target='_blank' rel='noreferrer'
                                                   className='text-[11px] text-pink-500 font-semibold'>
                                                    @{ca.social.instagram}
                                                </a>
                                            )}
                                        </div>
                                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                            ca.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {ca.status}
                                        </span>
                                    </div>

                                    <div className='bg-gray-50 rounded-xl p-3 mb-3'>
                                        <p className='text-[10px] font-black text-gray-400 uppercase mb-2'>Referral Code</p>
                                        <p className='text-sm font-mono font-bold text-orange-600'>{ca.referralCode}</p>
                                    </div>

                                    <div className='grid grid-cols-5 gap-2 text-center'>
                                        {[
                                            ['App Downloads', stats.appDownloads],
                                            ['Sign Ups',       stats.signUps],
                                            ['First Orders',   stats.firstOrders],
                                            ['Completed',      stats.completedOrders],
                                            ['Total Orders',   stats.totalOrders],
                                        ].map(([label, val]) => (
                                            <div key={label} className='bg-orange-50 rounded-xl py-2'>
                                                <p className='text-lg font-black text-orange-700'>{val ?? 0}</p>
                                                <p className='text-[9px] text-orange-500 font-bold uppercase leading-tight mt-0.5'>{label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className='flex justify-between items-center mt-3 pt-3 border-t border-gray-100'>
                                        <p className='text-xs text-gray-400'>
                                            Joined {ca.joinedAt ? new Date(ca.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                        </p>
                                        <p className='text-sm font-black text-gray-800'>
                                            {ca.performance?.points ?? 0} pts
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </section>
    )
}

export default AdminCampusAmbassadors
