import { useRemoteConfigContext } from '../provider/RemoteConfigProvider'

const OfferStrip = () => {
  const { config, loading } = useRemoteConfigContext()
  if (loading || !config?.offerStripActive) return null

  return (
    <div className='w-full bg-green-600 text-white text-center text-xs font-bold py-1.5 px-4 tracking-wide'>
      {config.offerStripText}
    </div>
  )
}

export default OfferStrip
