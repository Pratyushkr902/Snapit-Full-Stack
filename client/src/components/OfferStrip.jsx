import { useNavigate } from 'react-router-dom'
import { useRemoteConfigContext } from '../provider/RemoteConfigProvider'

const OfferStrip = () => {
  const { config, loading } = useRemoteConfigContext()
  const navigate = useNavigate()
  if (loading || !config?.offerStripActive) return null

  const text = config?.offerStripText || '🛵 100% FREE DELIVERY LIVE! • On ₹149+ (Paliganj) & ₹199+ (Himalaya College) ⚡'

  return (
    <div 
      onClick={() => navigate('/food')}
      className='w-full bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 text-white text-center text-xs font-black py-1.5 px-3 tracking-wide cursor-pointer shadow-xs flex items-center justify-center gap-2 hover:brightness-105 transition-all select-none'
    >
      <span className='animate-pulse'>🎉</span>
      <span className='truncate'>{text}</span>
      <span className='hidden sm:inline-block bg-white/20 text-[10px] uppercase px-2 py-0.5 rounded-full font-bold ml-1'>
        Order Now →
      </span>
    </div>
  )
}

export default OfferStrip
