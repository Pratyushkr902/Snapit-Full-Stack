import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useCallback, useState } from 'react'; 
import { useDispatch, useSelector } from 'react-redux'; 
import { Toaster } from 'react-hot-toast';

import Header from './components/Header'
import Footer from './components/Footer'
import CartMobileLink from './components/CartMobile'
import OfferStrip from './components/OfferStrip';
import DisplayCartItem from './components/DisplayCartItem'; 
import WhatsAppButton from './components/WhatsAppButton'

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

import './App.css'

export { socket };

function App() {
  const dispatch = useDispatch()
  const location = useLocation()
  const user = useSelector(state => state.user)
  
  useNotifications() 

  const [showCart, setShowCart] = useState(false)
  const [isAuthResolving, setIsAuthResolving] = useState(true)

  const currentNormalizedRoute = (location.pathname + (location.hash || "")).toLowerCase();

  const isDashboard = currentNormalizedRoute.includes('dashboard') || currentNormalizedRoute.includes('rider-panel');
  const isCheckoutOrCartPage = currentNormalizedRoute.includes('/checkout') || currentNormalizedRoute.includes('/cart');

  useEffect(() => {
    if (isCheckoutOrCartPage) {
      setShowCart(false)
    }
  }, [currentNormalizedRoute, isCheckoutOrCartPage])

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setIsAuthResolving(false)
      return
    }
    try {
      const userData = await fetchUserDetails()
      if (userData?.success) {
        const profileData = userData.data; 
        if (profileData?._id) {
          dispatch(setUserDetails(profileData))
        }
      }
    } catch (error) {
      console.log("Session Check: No active user found.")
    } finally {
      setIsAuthResolving(false)
    }
  }, [dispatch])

  const fetchOrder = useCallback(async () => {
    if (!user?._id) return
    try {
      const response = await Axios({ ...SummaryApi.getOrderItems })
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

          {/* ✅ FIX: Hide OfferStrip and Header on dashboard/rider pages */}
          {!isDashboard && <OfferStrip />}
          {!isDashboard && <Header openCart={() => setShowCart(true)} />}
          
          {/* ✅ FIX: Remove min-height constraint on dashboard so it fills screen freely */}
          <main className={isDashboard ? '' : 'min-h-[78vh]'}>
            <Outlet />
          </main>
          
          {!isDashboard && <Footer />}
          
          <Toaster position="top-center" reverseOrder={false} />

          {showCart && !isCheckoutOrCartPage && (
            <DisplayCartItem close={() => setShowCart(false)} />
          )}

          {!isCheckoutOrCartPage && !isDashboard && (
            <CartMobileLink />
          )}

          {!isDashboard && <WhatsAppButton />}
        </div>
      </GlobalProvider>
    </RemoteConfigProvider>
  )
}

export default App;