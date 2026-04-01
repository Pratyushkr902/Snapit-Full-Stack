import { Outlet, useLocation } from 'react-router-dom'
import './App.css'
import Header from './components/Header'
import Footer from './components/Footer'
import { Toaster } from 'react-hot-toast';
import { useEffect, useCallback } from 'react'; 
import fetchUserDetails from './utils/fetchUserDetails';
import { setUserDetails } from './store/userSlice';
import { setAllCategory, setAllSubCategory, setLoadingCategory } from './store/productSlice';
import { setOrder } from './store/orderSlice'; 
import { useDispatch, useSelector } from 'react-redux'; 
import Axios from './utils/Axios';
import SummaryApi from './common/SummaryApi';
import GlobalProvider from './provider/GlobalProvider';
import CartMobileLink from './components/CartMobile';
import { io } from "socket.io-client"; 

// GLOBAL SOCKET CONNECTION: Fixed URL + polling first to avoid WebSocket errors
export const socket = io("https://snapit-full-stack.onrender.com", {
  transports:           ["polling", "websocket"], // polling first = no handshake errors
  withCredentials:      true,
  path:                 "/socket.io/",
  reconnection:         true,
  reconnectionAttempts: Infinity,
  reconnectionDelay:    2000,
  timeout:              20000,
});

function App() {
  const dispatch = useDispatch()
  const location = useLocation()
  const user = useSelector(state => state.user)

  // 1. Fetch User (Fixes Admin/Login state)
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

  // 2. Fetch Orders globally (Private Data)
  const fetchOrder = useCallback(async () => {
    if(!user?._id) return; 

    try {
      const response = await Axios({
        ...SummaryApi.getOrderItems 
      })
      const { data: responseData } = response
      if (responseData.success) {
        dispatch(setOrder(responseData.data))
      }
    } catch (error) {
      console.error("Order fetch error", error)
    }
  }, [dispatch, user?._id])

  // 3. Public Data: Categories
  const fetchCategory = useCallback(async () => {
    try {
      dispatch(setLoadingCategory(true))
      const response = await Axios({
        ...SummaryApi.getCategory
      })
      const { data: responseData } = response

      if (responseData.success) {
        const sortedData = Array.isArray(responseData.data)
          ? [...responseData.data].sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          : []
        dispatch(setAllCategory(sortedData))
      }
    } catch (error) {
      console.error("Category fetch error", error)
    } finally {
      dispatch(setLoadingCategory(false))
    }
  }, [dispatch])

  // 4. Public Data: Subcategories
  const fetchSubCategory = useCallback(async () => {
    try {
      const response = await Axios({
        ...SummaryApi.getSubCategory
      })
      const { data: responseData } = response

      if (responseData.success) {
        const sortedData = Array.isArray(responseData.data)
          ? [...responseData.data].sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          : []
        dispatch(setAllSubCategory(sortedData))
      }
    } catch (error) {
      console.error("SubCategory fetch error", error)
    }
  }, [dispatch])

  // INITIALIZE PUBLIC DATA
  useEffect(() => {
    fetchUser()
    fetchCategory()
    fetchSubCategory()
  }, [fetchUser, fetchCategory, fetchSubCategory])

  // INITIALIZE PRIVATE DATA (Triggered after User ID is set)
  useEffect(() => {
    if(user?._id) {
      fetchOrder()
    }
  }, [user?._id, fetchOrder])

  // GLOBAL IMAGE FALLBACK (Ensures UI never looks broken)
  useEffect(() => {
    const handleGlobalError = (event) => {
      if (event.target.tagName === 'IMG') {
        event.target.src = "https://res.cloudinary.com/daso5ntlt/image/upload/v1773599668/Aashirvaad_Superior_MP_Whole_Wheat_Atta_z8tqsf.jpg";
      }
    };
    window.addEventListener('error', handleGlobalError, true);
    return () => window.removeEventListener('error', handleGlobalError, true);
  }, []);

  // SOCKET LOGGING: Verify connection in the console
  useEffect(() => {
    socket.on('connect', () => console.log("Snapit Socket Connected:", socket.id));
    socket.on('connect_error', (err) => console.log("Socket Syncing...", err.message));
    
    return () => {
      socket.off('connect');
      socket.off('connect_error');
    };
  }, []);

  const isDashboard = location.pathname.includes('dashboard') || location.pathname.includes('rider-panel');

  return (
    <GlobalProvider>
      <Header />
      <main className='min-h-[78vh]'>
        <Outlet />
      </main>
      
      {!isDashboard && <Footer />}
      
      <Toaster />

      {
        location.pathname !== '/checkout' && 
        location.pathname !== '/cart' && 
        !isDashboard && (
          <CartMobileLink />
        )
      }
    </GlobalProvider>
  )
}

export default App