import { Outlet, useLocation } from 'react-router-dom'
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

import './App.css'

export { socket };

function App() {
  const dispatch = useDispatch()
  const location = useLocation()
  const user = useSelector(state => state.user)
  
  useNotifications() 

  const [showCart, setShowCart] = useState(false)

  // Layout Route Checks — Using standard pathnames instead of hashes
  const isDashboard = location.pathname.includes('dashboard') || location.pathname.includes('rider-panel');
  const isCheckoutOrCartPage = location.pathname.includes('/checkout') || location.pathname.includes('/cart');

  // Automatically close side cart modal if user navigates to full cart or checkout pages
  useEffect(() => {
    if (isCheckoutOrCartPage) {
      setShowCart(false)
    }
  }, [location.pathname, isCheckoutOrCartPage])

  // Fetch User Details — Reads token dynamically to avoid stale state traps
  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('accesstoken') || localStorage.getItem('accessToken');
    if (!token) return
    
    try {
      const userData = await fetchUserDetails()
      if (userData?.success) { 
        dispatch(setUserDetails(userData.data.data))
      }
    } catch (error) {
      console.log("Session Check: No active user found.")
    }
  }, [dispatch])

  // Fetch Orders
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

  // Fetch Categories
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

  // Fetch Subcategories
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

  // Check for user session on mount and whenever the path changes (handles post-login redirects beautifully)
  useEffect(() => {
    fetchUser()
  }, [fetchUser, location.pathname]) 

  // Global lookups fetched once on initialization
  useEffect(() => {
    fetchCategory()
    fetchSubCategory()
  }, [fetchCategory, fetchSubCategory]) 

  // Sync active orders whenever user profile updates
  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  // Real-time socket event mapping
  useEffect(() => {
    socket.on('connect', () => console.log("🚀 Snapit Socket Connected:", socket.id));
    socket.on('connect_error', (err) => console.log("📡 Socket connection effort:", err.message));
    
    return () => {
      socket.off('connect');
      socket.off('connect_error');
    };
  }, []);

  return (
    <RemoteConfigProvider>
      <GlobalProvider>
        <div className="App">
          <OfferStrip />
          <Header openCart={() => setShowCart(true)} />
          
          <main className='min-h-[78vh]'>
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