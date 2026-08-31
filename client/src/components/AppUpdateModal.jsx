import React, { useState, useEffect, useCallback } from 'react'
import Axios from '../utils/Axios'
import { CURRENT_VERSION_CODE, CURRENT_APP_VERSION } from '../constants/appVersion'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import snapitLogo from '../assets/logo.png'

const DISMISS_KEY = 'snapit_update_dismissed_at'

const AppUpdateModal = () => {
  const [updateInfo, setUpdateInfo] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [isForced, setIsForced] = useState(false)

  const checkVersion = useCallback(async () => {
    // Only skip on actual web browser domains (snapit.pages.dev, winkkr.com, etc.)
    // All native Android / iOS APK runs (localhost, capacitor://, ionic://) will run the update check
    const isWebDomain = 
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      !window.location.hostname.startsWith('127.0.0.1') &&
      !window.location.protocol.includes('capacitor') &&
      !window.location.protocol.includes('ionic') &&
      !Capacitor.isNativePlatform()

    if (isWebDomain) return

    try {
      let installedVersionCode = CURRENT_VERSION_CODE
      try {
        const appInfo = await CapacitorApp.getInfo()
        if (appInfo?.build) {
          const parsedBuild = parseInt(appInfo.build, 10)
          if (!isNaN(parsedBuild) && parsedBuild > 0) {
            installedVersionCode = parsedBuild
          }
        }
      } catch (infoErr) {
        console.warn('[AppUpdate] info read fallback:', infoErr?.message)
      }

      const backendUrl = import.meta.env.VITE_API_URL || 'https://snapit-full-stack-production.up.railway.app'
      let data = null
      try {
        const response = await fetch(`${backendUrl}/api/app-version?t=${Date.now()}`, {
          cache: 'no-store'
        })
        const json = await response.json()
        if (json?.success && json?.data) {
          data = json.data
        }
      } catch (fErr) {
        console.warn('[AppUpdate] fetch fallback to Axios:', fErr?.message)
        const res = await Axios({
          method: 'GET',
          url: '/api/app-version',
          headers: { 'Cache-Control': 'no-cache' }
        })
        if (res.data?.success && res.data?.data) {
          data = res.data.data
        }
      }

      if (data) {
        const latestCode = Number(data.latestVersionCode || 0)
        const minCode = Number(data.minRequiredVersionCode || 0)

        // For Native Android / iOS apps:
        if (latestCode > installedVersionCode) {
          const force = Boolean(data.forceUpdate || installedVersionCode < minCode)
          setIsForced(force)

          if (force) {
            setUpdateInfo(data)
            setShowModal(true)
            return
          }

          // Check if user dismissed recently (within 24 hours)
          const lastDismissed = localStorage.getItem(DISMISS_KEY)
          if (lastDismissed) {
            const diffHours = (Date.now() - Number(lastDismissed)) / (1000 * 60 * 60)
            if (diffHours < 24) return
          }

          setUpdateInfo(data)
          setShowModal(true)
        }
      }
    } catch (err) {
      console.warn('[AppUpdate] Version check bypassed:', err?.message)
    }
  }, [])

  useEffect(() => {
    checkVersion()
    const timer = setTimeout(checkVersion, 1500)

    // Re-check when app is brought back to foreground
    let listener = null
    try {
      CapacitorApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          checkVersion()
        }
      }).then(l => { listener = l }).catch(() => {})
    } catch {}

    return () => {
      clearTimeout(timer)
      if (listener && typeof listener.remove === 'function') {
        listener.remove()
      }
    }
  }, [checkVersion])

  const handleDismiss = () => {
    if (isForced) return
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setShowModal(false)
  }

  const handleUpdateNow = () => {
    const playStoreHttp = updateInfo?.playStoreUrl || 'https://play.google.com/store/apps/details?id=com.snapit.grocery'
    const marketUrl = 'market://details?id=com.snapit.grocery'
    try {
      window.location.href = marketUrl
      setTimeout(() => {
        window.open(playStoreHttp, '_system')
      }, 600)
    } catch {
      window.open(playStoreHttp, '_system')
    }
  }

  if (!showModal || !updateInfo) return null

  return (
    <div className='fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-opacity duration-200'>
      <div className='bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center transform scale-100 transition-transform'>
        
        {/* Official Snapit Brand Icon */}
        <div className='w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-100 p-3 shadow-md shadow-emerald-600/10 mb-3.5 flex items-center justify-center'>
          <img
            src={snapitLogo}
            alt='Snapit'
            className='w-full h-full object-contain'
            fetchpriority='high'
          />
        </div>

        <span className='px-3 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider rounded-full mb-2'>
          v{updateInfo.latestVersion || '2.6.29'} Available
        </span>

        <h3 className='text-xl font-black text-slate-900 mb-1.5'>
          Update Available
        </h3>

        <p className='text-xs text-slate-500 mb-4 leading-relaxed'>
          A new version of Snapit is ready with new features and improved performance.
        </p>

        {/* Clean What's New Feature List */}
        <div className='w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-5 text-left'>
          <p className='text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2.5'>
            What's New:
          </p>
          <ul className='space-y-2'>
            <li className='text-xs font-semibold text-slate-700 flex items-center gap-2.5'>
              <span className='w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0' />
              <span>New features added</span>
            </li>
            <li className='text-xs font-semibold text-slate-700 flex items-center gap-2.5'>
              <span className='w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0' />
              <span>Improved app performance & speed</span>
            </li>
            <li className='text-xs font-semibold text-slate-700 flex items-center gap-2.5'>
              <span className='w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0' />
              <span>Enhanced security & stability</span>
            </li>
          </ul>
        </div>

        {/* Single Professional Google Play Action Button */}
        <div className='w-full flex flex-col gap-2.5'>
          <button
            type='button'
            onClick={handleUpdateNow}
            className='w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2'
          >
            <svg className='w-4 h-4 fill-current' viewBox='0 0 24 24'>
              <path d='M3.609 1.814L13.793 12 3.61 22.186a2.37 2.37 0 0 1-.61-1.638V3.452c0-.62.22-1.2.61-1.638zm11.246 11.247l2.25 2.25-11.83 6.77 9.58-9.02zm0-2.122L5.275 1.92l11.83 6.76-2.25 2.255zm1.48 1.48l3.18-1.817a1.6 1.6 0 0 0 0-2.804l-3.18-1.817-1.48 1.48 1.48 1.48z'/>
            </svg>
            <span>Update on Google Play</span>
          </button>

          {!isForced && (
            <button
              type='button'
              onClick={handleDismiss}
              className='w-full py-2.5 px-4 text-slate-400 hover:text-slate-600 font-bold text-xs transition'
            >
              Remind Me Later
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default AppUpdateModal
