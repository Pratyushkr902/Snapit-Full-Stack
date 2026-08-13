import React from 'react'
import { FaInstagram } from "react-icons/fa"
import { HiOutlineAcademicCap } from "react-icons/hi2"
import { HiOutlineUserGroup } from "react-icons/hi2"
import { HiOutlineSparkles } from "react-icons/hi2"

const CampusAmbassadorCard = ({ campusAmbassador }) => {
    if (!campusAmbassador) return null

    const {
        ambassadorId,
        college,
        course,
        year,
        campus,
        status,
        social,
        referralStats,
        performance,
    } = campusAmbassador

    const stats = referralStats || {}
    const perf  = performance || {}

    return (
        <div className='my-4 rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white overflow-hidden'>
            <div className='flex items-center justify-between px-4 py-3 border-b border-primary-100'>
                <div className='flex items-center gap-2'>
                    <HiOutlineAcademicCap size={22} className='text-primary-200' />
                    <span className='font-semibold text-neutral-800'>Campus Ambassador</span>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${
                    status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-neutral-200 text-neutral-600'
                }`}>
                    {status || 'inactive'}
                </span>
            </div>

            <div className='p-4 grid gap-3'>
                <div>
                    <p className='text-sm text-neutral-500'>Ambassador ID</p>
                    <p className='font-semibold text-neutral-800'>{ambassadorId || '—'}</p>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                    <div>
                        <p className='text-sm text-neutral-500'>College</p>
                        <p className='font-medium text-neutral-800 text-sm'>{college || '—'}</p>
                    </div>
                    <div>
                        <p className='text-sm text-neutral-500'>Course / Year</p>
                        <p className='font-medium text-neutral-800 text-sm'>
                            {course || '—'}{year ? `, ${year}` : ''}
                        </p>
                    </div>
                </div>

                {campus && (
                    <div>
                        <p className='text-sm text-neutral-500'>Campus</p>
                        <p className='font-medium text-neutral-800 text-sm'>{campus}</p>
                    </div>
                )}

                {social?.instagram && (
                    <div className='flex items-center gap-2 text-sm text-neutral-600'>
                        <FaInstagram size={16} className='text-pink-500' />
                        <span>@{social.instagram}</span>
                    </div>
                )}

                <div className='mt-2 pt-3 border-t border-primary-100'>
                    <div className='flex items-center gap-2 mb-2'>
                        <HiOutlineUserGroup size={18} className='text-primary-200' />
                        <span className='font-semibold text-sm text-neutral-800'>Referral Stats</span>
                    </div>
                    <div className='grid grid-cols-3 gap-2 text-center'>
                        <div className='bg-white rounded-lg py-2 border border-primary-100'>
                            <p className='text-lg font-bold text-primary-200'>{stats.appDownloads ?? 0}</p>
                            <p className='text-[11px] text-neutral-500'>Downloads</p>
                        </div>
                        <div className='bg-white rounded-lg py-2 border border-primary-100'>
                            <p className='text-lg font-bold text-primary-200'>{stats.signUps ?? 0}</p>
                            <p className='text-[11px] text-neutral-500'>Sign Ups</p>
                        </div>
                        <div className='bg-white rounded-lg py-2 border border-primary-100'>
                            <p className='text-lg font-bold text-primary-200'>{stats.completedOrders ?? 0}</p>
                            <p className='text-[11px] text-neutral-500'>Orders</p>
                        </div>
                    </div>
                </div>

                <div className='mt-1 flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-primary-100'>
                    <div className='flex items-center gap-2'>
                        <HiOutlineSparkles size={18} className='text-yellow-500' />
                        <span className='text-sm font-medium text-neutral-700'>Points</span>
                    </div>
                    <span className='font-bold text-neutral-800'>{perf.points ?? 0}</span>
                </div>

                {(perf.certificateEligible || perf.lorEligible) && (
                    <div className='flex gap-2 flex-wrap mt-1'>
                        {perf.certificateEligible && (
                            <span className='text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700'>
                                🎓 Certificate Eligible
                            </span>
                        )}
                        {perf.lorEligible && (
                            <span className='text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700'>
                                📜 LOR Eligible
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default CampusAmbassadorCard
