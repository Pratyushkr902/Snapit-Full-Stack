import { Outlet, useLocation } from 'react-router-dom'
import './App.css'
import Header from './components/Header'
import Footer from './components/Footer'
import { Toaster } from 'react-hot-toast';
import { useEffect, useCallback } from 'react'; 
import fetchUserDetails from './utils/fetchUserDetails';
import { setUserDetails } from './store/userSlice';
import { setAllCategory, setAllSubCategory, setLoadingCategory } from './store/productSlice';
import { setOrder } from './store/orderSlice'; // IMPORTED: To load orders globally
import { useDispatch } from 'react-redux';
import Axios from './utils/Axios';
import SummaryApi from './common/SummaryApi';
import GlobalProvider from './provider/GlobalProvider';
import CartMobileLink from './components/CartMobile';
import RiderDashboard from './pages/RiderDashboard';

function App() {
  const dispatch = useDispatch()
  const location = useLocation()

  const fetchUser = useCallback(async () => {
    const userData = await fetchUserDetails()
    if (userData?.success) { 
      dispatch(setUserDetails(userData.data))
    }
  }, [dispatch])

  // NEW: Fetch Orders globally so "My Orders" and "Tracking" always have data
  // NOTE: Ensure your backend getOrderItems returns ALL orders if the user is an ADMIN
  const fetchOrder = useCallback(async () => {
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
  }, [dispatch])

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

  useEffect(() => {
    fetchUser()
    fetchCategory()
    fetchSubCategory()
    fetchOrder() // TRIGGERED: Load orders on app start
  }, [fetchUser, fetchCategory, fetchSubCategory, fetchOrder])

  // Global fix for broken images
  useEffect(() => {
    const handleGlobalError = (event) => {
      if (event.target.tagName === 'IMG') {
        event.target.src = "https://res.cloudinary.com/daso5ntlt/image/upload/v1773599668/Aashirvaad_Superior_MP_Whole_Wheat_Atta_z8tqsf.jpg";
      }
    };
    window.addEventListener('error', handleGlobalError, true);
    return () => window.removeEventListener('error', handleGlobalError, true);
  }, []);

  // FIXED: Added 'rider-panel' to the dashboard check so Footer/Cart are hidden for the Rider
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