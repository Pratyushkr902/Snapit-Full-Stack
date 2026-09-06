import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useCallback, useState } from 'react'; 
import { useDispatch, useSelector } from 'react-redux'; 
import { Toaster } from 'react-hot-toast';

import Header from './components/Header'
import Footer from './components/Footer'
import CartMobileLink from './components/CartMobile'
import DisplayCartItem from './components/DisplayCartItem'; 
import WhatsAppButton from './components/WhatsAppButton'
import ChatBox from './components/ChatBox'
import StoreClosedOverlay from './components/StoreClosedOverlay'
import AppUpdateModal from './components/AppUpdateModal'
import NotificationPermissionBanner from './components/NotificationPermissionBanner'

import fetchUserDetails from './utils/fetchUserDetails';
import { setUserDetails, logout } from './store/userSlice';
import { setAllCategory, setAllSubCategory, setLoadingCategory } from './store/productSlice';
import { setOrder } from './store/orderSlice'; 
import Axios from './utils/Axios';
import SummaryApi from './common/SummaryApi';
import GlobalProvider from './provider/GlobalProvider';
import RemoteConfigProvider from './provider/RemoteConfigProvider'
import useNotifications from './hooks/useNotifications'
import socket from './utils/socket.js';

import { ACCESS_TOKEN_KEY } from './constants/storageKeys';
import secureStorage from './utils/secureStorage';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

import './App.css'

export { socket };

function App() {
  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const user = useSelector(state => state.user)
  
  useNotifications() 

  const [showCart, setShowCart] = useState(false)
  const [isAuthResolving, setIsAuthResolving] = useState(false)

  const currentNormalizedRoute = (location.pathname + (location.hash || "")).toLowerCase();

  const isDashboard = currentNormalizedRoute.includes('dashboard') || currentNormalizedRoute.includes('rider-panel');

  // Hide cart slide-over on checkout, cart, and food pages
  const isCheckoutOrCartPage = 
    currentNormalizedRoute.includes('/checkout') || 
    currentNormalizedRoute.includes('/cart');

  const isFoodPage = 
    currentNormalizedRoute.includes('/food') || 
    currentNormalizedRoute.includes('/restaurant');

  // Dedicated cart page (Zepto/Blinkit style full-screen cart)
  const isCartPage = currentNormalizedRoute.includes('/cart');

  // Full-screen dedicated location selection page (Zepto/Blinkit style)
  const isSelectLocation = 
    currentNormalizedRoute.includes('select-location') || 
    currentNormalizedRoute.includes('/address');

  useEffect(() => {
    if (isCheckoutOrCartPage) {
      setShowCart(false)
    }
  }, [currentNormalizedRoute, isCheckoutOrCartPage])

  // ── Image scrape deterrent — block right-click/drag-save on images ──
  useEffect(() => {
    const blockImageContext = (e) => {
      if (e.target?.tagName === 'IMG') e.preventDefault()
    }
    const blockImageDrag = (e) => {
      if (e.target?.tagName === 'IMG') e.preventDefault()
    }
    document.addEventListener('contextmenu', blockImageContext)
    document.addEventListener('dragstart', blockImageDrag)
    return () => {
      document.removeEventListener('contextmenu', blockImageContext)
      document.removeEventListener('dragstart', blockImageDrag)
    }
  }, [])

  const fetchUser = useCallback(async () => {
    let token = await secureStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      token = await secureStorage.getItem('refreshToken');
    }
    if (!token) {
      setIsAuthResolving(false)
      if (Capacitor.isNativePlatform()) {
        SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {})
      }
      return
    }
    try {
      const userData = await fetchUserDetails()
      if (userData?.success && userData?.data?._id) {
        dispatch(setUserDetails(userData.data))
      }
    } catch (error) {
      console.log("Session Check: Network or temporary error:", error?.message)
    } finally {
      setIsAuthResolving(false)
      if (Capacitor.isNativePlatform()) {
        SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {})
      }
    }
  }, [dispatch])

  const fetchOrder = useCallback(async () => {
    if (!user?._id) return
    try {
      const response = await Axios({ ...SummaryApi.getOrderDetails })
      if (response?.data?.success) {
        dispatch(setOrder(response.data.data))
      }
    } catch (error) {
      console.error("Order fetch error", error)
    }
  }, [dispatch, user?._id])

  const fetchCategory = useCallback(async () => {
    try {
      dispatch(setLoadingCategory(true))
      const response = await Axios({ ...SummaryApi.getCategory })
      if (response?.data?.success && Array.isArray(response.data.data)) {
        const sorted = response.data.data
          .filter(cat => cat && typeof cat === 'object')
          .sort((a, b) => String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase()))
        dispatch(setAllCategory(sorted))
      }
    } catch (error) {
      console.error("Category fetch error", error)
    } finally {
      dispatch(setLoadingCategory(false))
    }
  }, [dispatch])

  const fetchSubCategory = useCallback(async () => {
    try {
      const response = await Axios({ ...SummaryApi.getSubCategory })
      if (response?.data?.success && Array.isArray(response.data.data)) {
        const sorted = response.data.data
          .filter(sub => sub && typeof sub === 'object')
          .sort((a, b) => String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase()))
        dispatch(setAllSubCategory(sorted))
      }
    } catch (error) {
      console.error("SubCategory fetch error", error)
    }
  }, [dispatch])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    fetchCategory()
    fetchSubCategory()
  }, [fetchCategory, fetchSubCategory]) 

  useEffect(() => {
    if (user?._id) {
      fetchOrder()
    }
  }, [fetchOrder, user?._id])

  useEffect(() => {
    socket.on('connect', () => console.log("🚀 Socket Connected:", socket.id));
    socket.on('connect_error', (err) => console.log("📡 Socket error:", err.message));
    return () => {
      socket.off('connect');
      socket.off('connect_error');
    };
  }, []);

  // ─── Android hardware back button ─────────────────────────────
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let lastBackPress = 0
    let listenerHandle

    const setupBackButton = async () => {
      try {
        listenerHandle = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
          // 1. If cart slide-over is open, close it first
          if (showCart) {
            setShowCart(false)
            return
          }

          // 2. Check if we are on the root Home screen
          const currentPath = window.location.pathname
          const currentHash = window.location.hash || ""
          const isRoot = 
            (currentPath === '/' || currentPath === '') &&
            (!currentHash || currentHash === '#/' || currentHash === '#')

          if (!isRoot) {
            // Smoothly navigate back in history (e.g. from /grocery, /food, /pharmacy, /restaurant/123, /search, /cart)
            if (canGoBack || window.history.length > 1) {
              navigate(-1)
            } else {
              navigate('/')
            }
          } else {
            // Double-tap back on root Home to exit the app
            const now = Date.now()
            if (now - lastBackPress < 2000) {
              CapacitorApp.exitApp()
            } else {
              lastBackPress = now
              toast('Press back again to exit Snapit', {
                icon: '⚡',
                duration: 2000,
                id: 'exit-tap'
              })
            }
          }
        })
      } catch (e) {
        console.warn("Back button setup error:", e?.message)
      }
    }

    setupBackButton()

    return () => {
      listenerHandle?.remove()
    }
  }, [showCart, navigate])

  // ─── Force refresh after long background suspension ───────────
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let backgroundedAt = null
    let stateListenerHandle

    const setupStateListener = async () => {
      try {
        stateListenerHandle = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) {
            backgroundedAt = Date.now()
          } else if (backgroundedAt) {
            const awayMs = Date.now() - backgroundedAt
            backgroundedAt = null
            if (awayMs > 10 * 60 * 1000) {
              window.location.reload()
            }
          }
        })
      } catch (e) {
        console.warn("App state listener setup error:", e?.message)
      }
    }

    setupStateListener()

    return () => {
      stateListenerHandle?.remove()
    }
  }, [])

  return (
    <RemoteConfigProvider>
      <GlobalProvider>
        <div className="App">
          <AppUpdateModal />
          <NotificationPermissionBanner />
          {!isDashboard && !isFoodPage && !isSelectLocation && !isCartPage && <StoreClosedOverlay />}
          {!isDashboard && !isSelectLocation && !isCartPage && <Header openCart={() => setShowCart(true)} />}
          
          <main className={isDashboard || isSelectLocation || isCartPage ? '' : 'min-h-[78vh]'}>
            <Outlet />
          </main>
          
          {!isDashboard && !isSelectLocation && !isCartPage && <Footer />}
          {/* {!isDashboard && <WhatsAppButton />} */}
          
          <Toaster position="top-center" reverseOrder={false} />

          {showCart && !isCheckoutOrCartPage && !isFoodPage && (
            <DisplayCartItem close={() => setShowCart(false)} />
          )}

          {!isCheckoutOrCartPage && !isDashboard && !isFoodPage && !isSelectLocation && (
            <CartMobileLink />
          )}

          {/* {!isDashboard && <WhatsAppButton />} */}
          {!isDashboard && !isSelectLocation && !isCartPage && !showCart && <ChatBox />}
        </div>
      </GlobalProvider>
    </RemoteConfigProvider>
  )
}

export default App;