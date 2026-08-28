import React, { useState, useEffect, useCallback } from 'react'
import Axios from '../utils/Axios'
import { CURRENT_VERSION_CODE, CURRENT_APP_VERSION } from '../constants/appVersion'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'

const DISMISS_KEY = 'snapit_update_dismissed_at'

const AppUpdateModal = () => {
  const [updateInfo, setUpdateInfo] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [isForced, setIsForced] = useState(false)

  const checkVersion = useCallback(async () => {
    // In-app Google Play store update checks only apply to native mobile apps (Android/iOS)
    if (!Capacitor.isNativePlatform()) return

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

      const res = await Axios({
        method: 'GET',
        url: '/api/app-version',
        headers: { 'Cache-Control': 'no-cache' }
      })

      if (res.data?.success && res.data?.data) {
        const data = res.data.data
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

    // Re-check when app is brought back to foreground
    let listener = null
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          checkVersion()
        }
      }).then(l => { listener = l }).catch(() => {})
    }

    return () => {
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
    const targetUrl = updateInfo?.playStoreUrl || 'https://play.google.com/store/apps/details?id=com.snapit.grocery'
    window.open(targetUrl, '_system')
  }

  if (!showModal || !updateInfo) return null

  return (
    <div className='fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200'>
      <div className='bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center'>
        
        {/* Animated App Icon / Badge */}
        <div className='w-20 h-20 rounded-3xl bg-gradient-to-tr from-green-600 via-emerald-500 to-green-400 p-0.5 shadow-lg shadow-green-600/30 mb-4 flex items-center justify-center'>
          <div className='w-full h-full bg-white rounded-[22px] flex items-center justify-center text-3xl'>
            🚀
          </div>
        </div>

        <span className='px-3 py-1 bg-green-100 text-green-800 text-[11px] font-black uppercase tracking-wider rounded-full mb-2'>
          v{updateInfo.latestVersion || 'New'} Available
        </span>

        <h3 className='text-xl font-black text-slate-900 mb-1.5'>
          {updateInfo.title || 'Update Snapit!'}
        </h3>

        <p className='text-xs text-slate-500 mb-4 leading-relaxed'>
          {updateInfo.message || 'A new update is available with faster delivery, new features, and bug fixes.'}
        </p>

        {/* What's New Feature List */}
        {Array.isArray(updateInfo.releaseNotes) && updateInfo.releaseNotes.length > 0 && (
          <div className='w-full bg-slate-50 border border-slate-100 rounded-2xl p-3.5 mb-5 text-left'>
            <p className='text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2'>
              What's New in this update:
            </p>
            <ul className='space-y-1.5'>
              {updateInfo.releaseNotes.map((note, idx) => (
                <li key={idx} className='text-xs font-semibold text-slate-700 flex items-start gap-2'>
                  <span className='text-green-600 font-black'>•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className='w-full flex flex-col gap-2.5'>
          <button
            type='button'
            onClick={handleUpdateNow}
            className='w-full py-3.5 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-lg shadow-green-600/25 transition'
          >
            Update Now (Google Play)
          </button>

          {updateInfo?.directApkUrl && (
            <button
              type='button'
              onClick={() => window.open(updateInfo.directApkUrl, '_system')}
              className='w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-1.5'
            >
              📥 Or Download APK Directly
            </button>
          )}

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
