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

import fetchUserDetails from './utils/fetchUserDetails';
import { setUserDetails } from './store/userSlice';
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
  const [isAuthResolving, setIsAuthResolving] = useState(true)

  const currentNormalizedRoute = (location.pathname + (location.hash || "")).toLowerCase();

  const isDashboard = currentNormalizedRoute.includes('dashboard') || currentNormalizedRoute.includes('rider-panel');

  // Hide cart slide-over on checkout, cart, and food pages
  const isCheckoutOrCartPage = 
    currentNormalizedRoute.includes('/checkout') || 
    currentNormalizedRoute.includes('/cart');

  const isFoodPage = 
    currentNormalizedRoute.includes('/food') || 
    currentNormalizedRoute.includes('/restaurant');

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
    const token = await secureStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setIsAuthResolving(false)
      if (Capacitor.isNativePlatform()) {
        SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {})
      }
      return
    }
    try {
      const userData = await Promise.race([
        fetchUserDetails(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Session check timed out')), 8000))
      ])
      if (userData?.success) {
        const profileData = userData.data;
        if (profileData?._id) {
          dispatch(setUserDetails(profileData))
        }
      }
    } catch (error) {
      console.log("Session Check: No active user found or timed out.", error?.message)
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

    let listenerHandle;
    let lastBackPress = 0;

    const setupBackButton = async () => {
      try {
        listenerHandle = await CapacitorApp.addListener('backButton', () => {
          const hash = window.location.hash || ""
          const isHome = !hash || hash === '#/' || hash === '#' || hash === '#/grocery' || hash === '#/food' || hash === '#/pharmacy'

          if (!isHome) {
            window.history.back()
          } else {
            const now = Date.now()
            if (now - lastBackPress < 2000 && lastBackPress > 0) {
              CapacitorApp.exitApp()
            } else {
              lastBackPress = now
              toast("Press back again to exit", { id: "exit-toast", duration: 2000 })
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
  }, [])

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

  if (isAuthResolving) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-9 w-9 border-t-2 border-b-2 border-green-700"></div>
      </div>
    );
  }

  return (
    <RemoteConfigProvider>
      <GlobalProvider>
        <div className="App">
          {!isDashboard && <Header openCart={() => setShowCart(true)} />}
          
          <main className={isDashboard ? '' : 'min-h-[78vh]'}>
            <Outlet />
          </main>
          
          {!isDashboard && <Footer />}
          {/* {!isDashboard && <WhatsAppButton />} */}
          
          <Toaster position="top-center" reverseOrder={false} />

          {showCart && !isCheckoutOrCartPage && !isFoodPage && (
            <DisplayCartItem close={() => setShowCart(false)} />
          )}

          {!isCheckoutOrCartPage && !isDashboard && !isFoodPage && (
            <CartMobileLink />
          )}

          {/* {!isDashboard && <WhatsAppButton />} */}
          {!isDashboard && <ChatBox />}
        </div>
      </GlobalProvider>
    </RemoteConfigProvider>
  )
}

export default App;