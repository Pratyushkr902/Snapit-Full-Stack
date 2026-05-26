import { Outlet, useLocation } from 'react-router-dom'
import './App.css'
import Header from './components/Header'
import Footer from './components/Footer'
import { Toaster } from 'react-hot-toast';
import { useEffect, useCallback, useState } from 'react'; 
import fetchUserDetails from './utils/fetchUserDetails';
import { setUserDetails } from './store/userSlice';
import { setAllCategory, setAllSubCategory, setLoadingCategory } from './store/productSlice';
import { setOrder } from './store/orderSlice'; 
import { useDispatch, useSelector } from 'react-redux'; 
import Axios from './utils/Axios';
import SummaryApi from './common/SummaryApi';
import GlobalProvider from './provider/GlobalProvider';
import CartMobileLink from './components/CartMobile'
import RemoteConfigProvider from './provider/RemoteConfigProvider'
import OfferStrip from './components/OfferStrip';
import DisplayCartItem from './components/DisplayCartItem'; 
import WhatsAppButton from './components/WhatsAppButton'
import socket from './socket.js';
export { socket };

import useNotifications from './hooks/useNotifications'

function App() {
  const dispatch = useDispatch()
  const location = useLocation()
  const user = useSelector(state => state.user)
  
  useNotifications() 

  const [showCart, setShowCart] = useState(false)
  const activeToken = localStorage.getItem('accesstoken') || localStorage.getItem('accessToken');

  useEffect(() => {
    if (location.hash === "#/checkout") {
      setShowCart(false)
    }
  }, [location.pathname])

  const fetchUser = useCallback(async () => {
    if (!activeToken) return
    try {
      const userData = await fetchUserDetails()
      if (userData?.success) { 
        dispatch(setUserDetails(userData.data))
      }
    } catch (error) {
      console.log("Session Check: No active user found.")
    }
  }, [dispatch, activeToken])

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
    if (activeToken) fetchUser()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCategory()
    fetchSubCategory()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user?._id) fetchOrder()
  }, [user?._id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    socket.on('connect', () => console.log("🚀 Snapit Socket Connected:", socket.id));
    socket.on('connect_error', (err) => console.log("📡 Socket connection effort:", err.message));
    return () => {
      socket.off('connect');
      socket.off('connect_error');
    };
  }, []);

  const isDashboard = location.pathname.includes('dashboard') || location.pathname.includes('rider-panel');

  return (
    <RemoteConfigProvider><GlobalProvider>
      <div className="App">
        <OfferStrip /><Header openCart={() => setShowCart(true)} />
        
        <main className='min-h-[78vh]'>
          <Outlet />
        </main>
        
        {!isDashboard && <Footer />}
        
        <Toaster position="top-center" reverseOrder={false} />

        {showCart && location.hash !== "#/checkout" && (
          <DisplayCartItem close={() => setShowCart(false)} />
        )}

        {
          location.hash !== "#/checkout" && 
          location.hash !== "#/cart" && 
          !isDashboard && (
            <CartMobileLink />
          )
        }

        {!isDashboard && <WhatsAppButton />}
      </div>
    </GlobalProvider></RemoteConfigProvider>
  )
}

export default App;