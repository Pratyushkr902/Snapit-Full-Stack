cat > /Users/pratyushkumar/Desktop/snapit/client/src/components/DeliveryTimer.jsx << 'EOF'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

const DeliveryTimer = () => {
    const [minutes, setMinutes] = useState(9)
    const [seconds, setSeconds] = useState(0)
    const addressList = useSelector(state => state.addresses?.addressList)
    const address = addressList?.[0]?.address_line || 'Add delivery address'

    useEffect(() => {
        const timer = setInterval(() => {
            setSeconds(prev => {
                if (prev === 0) {
                    setMinutes(m => m > 0 ? m - 1 : 0)
                    return 59
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div style={{ background:'#16a34a', color:'white', padding:'8px 16px', display:'flex', alignItems:'center', gap:'10px', fontSize:'13px' }}>
            <span>⚡</span>
            <div>
                <p style={{ margin:0, fontSize:'11px', opacity:0.8 }}>Delivery in</p>
                <p style={{ margin:0, fontSize:'15px', fontWeight:'800' }}>
                    {String(minutes).padStart(2,'0')}:{String(seconds).padStart(2,'0')} mins
                </p>
            </div>
            <div style={{ width:'1px', height:'30px', background:'rgba(255,255,255,0.3)' }}/>
            <div style={{ flex:1, overflow:'hidden' }}>
                <p style={{ margin:0, fontSize:'11px', opacity:0.8 }}>Delivering to</p>
                <p style={{ margin:0, fontSize:'13px', fontWeight:'700', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    📍 {address}
                </p>
            </div>
        </div>
    )
}

export default DeliveryTimer
EOF