import React from 'react'

// FIX 4: replaced Tailwind's animate-pulse with a single CSS shimmer sweep.
// animate-pulse applies an opacity animation to every element individually —
// when 6 skeletons × 5 animated divs = 30 simultaneous opacity animations
// are running, it's measurably expensive on low-end Android.
// A single ::after pseudo-element sweep on the parent is one composite layer
// for the whole card instead of 5 separate animated layers.

const CardLoading = () => {
    return (
        <div
            className='border rounded-xl bg-white overflow-hidden relative'
            style={{ minWidth: '9rem' }}
        >
            <style>{`
                @keyframes shimmer {
                    0%   { transform: translateX(-100%) }
                    100% { transform: translateX(200%) }
                }
                .skeleton-card::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        90deg,
                        transparent 0%,
                        rgba(255,255,255,0.6) 50%,
                        transparent 100%
                    );
                    animation: shimmer 1.4s infinite;
                    pointer-events: none;
                }
            `}</style>

            <div className='skeleton-card p-1.5 lg:p-2 flex flex-col gap-2'>
                {/* Image placeholder */}
                <div className='w-full aspect-square rounded-lg bg-slate-100' />
                {/* Tags row */}
                <div className='h-4 bg-slate-100 rounded w-16' />
                {/* Name lines */}
                <div className='h-3 bg-slate-100 rounded w-full' />
                <div className='h-3 bg-slate-100 rounded w-3/4' />
                {/* Unit pill */}
                <div className='h-4 bg-slate-100 rounded-full w-12' />
                {/* Price + button */}
                <div className='flex items-center justify-between mt-1'>
                    <div className='h-5 bg-slate-100 rounded w-12' />
                    <div className='h-7 bg-slate-100 rounded w-16' />
                </div>
            </div>
        </div>
    )
}

export default CardLoading