import { createContext, useContext } from 'react'
import useRemoteConfig from '../hooks/useRemoteConfig'

const RemoteConfigContext = createContext(null)
export const useRemoteConfigContext = () => useContext(RemoteConfigContext)

const RemoteConfigProvider = ({ children }) => {
  const { config, loading } = useRemoteConfig()

  // Show maintenance page if flag is on
  if (!loading && config?.maintenanceMode) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center bg-green-50 p-8'>
        <img src='/snapit-logo.png' className='w-24 mb-6' alt='Snapit' />
        <h1 className='text-2xl font-black text-green-700 mb-2'>We'll be right back!</h1>
        <p className='text-slate-600 text-center max-w-sm'>{config.maintenanceMessage}</p>
      </div>
    )
  }

  return (
    <RemoteConfigContext.Provider value={{ config, loading }}>
      {children}
    </RemoteConfigContext.Provider>
  )
}

export default RemoteConfigProvider
