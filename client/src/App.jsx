import { Outlet, useLocation } from 'react-router-dom'
import './App.css'
import Header from './components/Header'
import Footer from './components/Footer'
import { Toaster } from 'react-hot-toast'
import { useEffect, useCallback, useState } from 'react'
import fetchUserDetails from './utils/fetchUserDetails'
import { setUserDetails } from './store/userSlice'
import { setAllCategory, setAllSubCategory, setLoadingCategory } from './store/productSlice'
import { setOrder } from './store/orderSlice'
import { useDispatch, useSelector } from 'react-redux'
import Axios from './utils/Axios'
import SummaryApi from './common/SummaryApi'
import GlobalProvider from './provider/GlobalProvider'
import CartMobileLink from './components/CartMobile'
import DisplayCartItem from './components/DisplayCartItem'
import WhatsAppButton from './components/WhatsAppButton'
import { io } from "socket.io-client"
import useNotifications from './hooks/useNotifications'

// ─── FIXED: Socket was created at module level, connecting for ALL visitors ───
//     including non-logged-in users. Moved inside App so it can be gated.
//     Defined outside component to avoid reconnecting on re-renders.
let socket = null

const getSocket = () => {
  if (!socket) {
    socket = io("https://snapit-full-stack-2.onrender.com", {
      transports: ["polling", "websocket"],
      withCredentials: true,
      path: "/socket.io/",
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 5000,
      timeout: 20000,
      // ─── FIXED: Don't auto-connect — connect only when user is logged in ─
      autoConnect: false,
    })
  }
  return socket
}

export { getSocket as socket }

function App() {
  const dispatch = useDispatch()
  const location = useLocation()
  const user = useSelector(state => state.user)
  const [showCart, setShowCart] = useState(false)

  useNotifications()

  const fetchUser = useCallback(async () => {
    try {
      const userData = await fetchUserDetails()
      if (userData?.success) {
        dispatch(setUserDetails(userData.data))
      }
    } catch {
      // Silent — expected when no session exists
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

  // Boot: fetch public data (categories, user session)
  useEffect(() => {
    fetchUser()
    fetchCategory()
    fetchSubCategory()
  }, [fetchUser, fetchCategory, fetchSubCategory])

  // Fetch orders only when user is authenticated
  useEffect(() => {
    if (user?._id) fetchOrder()
  }, [user?._id, fetchOrder])

  // ─── FIXED: Socket connects only when user is logged in ──────────────────
  useEffect(() => {
    if (!user?._id) return

    const s = getSocket()
    s.connect()

    s.on('connect', () => console.log("Socket connected:", s.id))
    s.on('connect_error', (err) => console.warn("Socket error:", err.message))

    return () => {
      s.off('connect')
      s.off('connect_error')
      // Don't disconnect on unmount — App is never unmounted during a session
    }
  }, [user?._id])

  const isDashboard = location.pathname.includes('dashboard') || location.pathname.includes('rider-panel')

  return (
    <GlobalProvider>
      <div className="App">
        <Header openCart={() => setShowCart(true)} />

        <main className='min-h-[78vh]'>
          <Outlet />
        </main>

        {!isDashboard && <Footer />}

        <Toaster
          position="top-center"
          reverseOrder={false}
          // ─── IMPROVED: Toast offset for mobile to clear the sticky header ─
          containerStyle={{ top: 70 }}
          toastOptions={{
            style: {
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '500',
            }
          }}
        />

        {showCart && <DisplayCartItem close={() => setShowCart(false)} />}

        {location.pathname !== '/checkout' &&
          location.pathname !== '/cart' &&
          !isDashboard && (
            <CartMobileLink />
          )
        }

        {!isDashboard && <WhatsAppButton />}
      </div>
    </GlobalProvider>
  )
}

export default App