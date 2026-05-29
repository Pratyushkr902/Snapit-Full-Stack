// ✅ Paste these Link items inside your UserMenu component
// alongside your existing links like My Orders, Address, Wallet etc.

import { Link } from 'react-router-dom'

// --- ADD THESE 3 ITEMS ---

<Link
    to="/snapit-plus"
    onClick={close}
    className='flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-green-50 transition-colors group'
>
    <span className='text-xl'>⭐</span>
    <div>
        <p className='font-semibold text-gray-800 text-sm'>Snapit Plus</p>
        <p className='text-xs text-gray-400'>Membership & benefits</p>
    </div>
</Link>

<Link
    to="/streak"
    onClick={close}
    className='flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-orange-50 transition-colors group'
>
    <span className='text-xl'>🔥</span>
    <div>
        <p className='font-semibold text-gray-800 text-sm'>Daily Streak</p>
        <p className='text-xs text-gray-400'>Order daily, earn rewards</p>
    </div>
</Link>

<Link
    to="/subscriptions"
    onClick={close}
    className='flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors group'
>
    <span className='text-xl'>📦</span>
    <div>
        <p className='font-semibold text-gray-800 text-sm'>My Subscriptions</p>
        <p className='text-xs text-gray-400'>Manage recurring orders</p>
    </div>
</Link>