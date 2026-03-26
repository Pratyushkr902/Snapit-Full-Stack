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
import { useDispatch, useSelector } from 'react-redux'; // ADDED: useSelector
import Axios from './utils/Axios';
import SummaryApi from './common/SummaryApi';
import GlobalProvider from './provider/GlobalProvider';
import CartMobileLink from './components/CartMobile';

function App() {
  const dispatch = useDispatch()
  const location = useLocation()
  const user = useSelector(state => state.user) // Get user state to prevent 401 loops

  // 1. Fetch User (Fixes Admin/Login state)
  const fetchUser = useCallback(async () => {
    try {
      const userData = await fetchUserDetails()
      if (userData?.success) { 
        dispatch(setUserDetails(userData.data))
      }
    } catch (error) {
      console.log("User session expired or invalid")
    }
  }, [dispatch])

  // 2. Fetch Orders globally
  const fetchOrder = useCallback(async () => {
    // Only fetch orders if we have a logged-in user to avoid 401 errors
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

  // Initialize core data (Public data)
  useEffect(() => {
    fetchUser()
    fetchCategory()
    fetchSubCategory()
  }, [fetchUser, fetchCategory, fetchSubCategory])

  // Initialize private data (Only when user is found)
  useEffect(() => {
    if(user?._id) {
      fetchOrder()
    }
  }, [user?._id, fetchOrder])

  // Global fix for broken images - KEEPING YOUR LOGIC
  useEffect(() => {
    const handleGlobalError = (event) => {
      if (event.target.tagName === 'IMG') {
        event.target.src = "https://res.cloudinary.com/daso5ntlt/image/upload/v1773599668/Aashirvaad_Superior_MP_Whole_Wheat_Atta_z8tqsf.jpg";
      }
    };
    window.addEventListener('error', handleGlobalError, true);
    return () => window.removeEventListener('error', handleGlobalError, true);
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