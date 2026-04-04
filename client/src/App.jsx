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
import CartMobileLink from './components/CartMobile';
import DisplayCartItem from './components/DisplayCartItem'; 
import { io } from "socket.io-client"; 

// GLOBAL SOCKET CONNECTION - Pointing to stable -0 instance
export const socket = io("https://snapit-full-stack-2.onrender.com", {
  transports:           ["polling", "websocket"],
  withCredentials:      true,
  path:                 "/socket.io/",
  reconnection:         true,
  reconnectionAttempts: 5,        
  reconnectionDelay:    5000,    
  timeout:              20000,
});

function App() {
  const dispatch = useDispatch()
  const location = useLocation()
  const user = useSelector(state => state.user)
  
  // State for global cart visibility
  const [showCart, setShowCart] = useState(false)

  const fetchUser = useCallback(async () => {
    try {
      const userData = await fetchUserDetails()
      if (userData?.success) { 
        dispatch(setUserDetails(userData.data))
      }
    } catch (error) {
      console.log("Session Check: No active user found.")
    }
  }, [dispatch])

  const fetchOrder = useCallback(async () => {
    if(!user?._id) return; 
    try {
      const response = await Axios({ ...SummaryApi.getOrderItems })
      if (response?.data?.success) {
        dispatch(setOrder(response.data.data))
      }
    } catch (error) {
      console.error("Order fetch error", error)
    }
  }, [dispatch, user?._id])

  // --- ALPHABETICAL SORT: Ensures 'Atta' and others stay organized A-Z ---
  const fetchCategory = useCallback(async () => {
    try {
      dispatch(setLoadingCategory(true))
      const response = await Axios({ ...SummaryApi.getCategory })
      if (response?.data?.success) {
        const sortedData = [...response.data.data].sort((a, b) => 
          (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())
        )
        dispatch(setAllCategory(sortedData))
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
      if (response?.data?.success) {
        const sortedData = [...response.data.data].sort((a, b) => 
          (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())
        )
        dispatch(setAllSubCategory(sortedData))
      }
    } catch (error) {
      console.error("SubCategory fetch error", error)
    }
  }, [dispatch])

  useEffect(() => {
    fetchUser()
    fetchCategory()
    fetchSubCategory()
  }, [fetchUser, fetchCategory, fetchSubCategory])

  useEffect(() => {
    if(user?._id) {
      fetchOrder()
    }
  }, [user?._id, fetchOrder])

  // SOCKET LOGGING & CLEANUP
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
    <GlobalProvider>
      <div className="App">
        {/* Passing setShowCart through the Header prop */}
        <Header openCart={() => setShowCart(true)} />
        
        <main className='min-h-[78vh]'>
          <Outlet />
        </main>
        
        {!isDashboard && <Footer />}
        
        <Toaster position="top-center" reverseOrder={false} />

        {/* Global Cart Overlay Component */}
        {showCart && <DisplayCartItem close={() => setShowCart(false)} />}

        {
          location.pathname !== '/checkout' && 
          location.pathname !== '/cart' && 
          !isDashboard && (
            <CartMobileLink />
          )
        }
      </div>
    </GlobalProvider>
  )
}

export default App