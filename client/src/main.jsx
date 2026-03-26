import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { RouterProvider } from 'react-router-dom'
import router from './route/index'
import { Provider } from 'react-redux'
import { store } from './store/store.js'

createRoot(document.getElementById('root')).render(
  // <StrictMode> 
  // Keeping StrictMode commented as per your preference to avoid double-renders in Socket.io
  <Provider store={store}>
    {/* RouterProvider must be inside Provider so routes can access Redux state */}
    {/* This setup ensures that your 'Track Live' button in MyOrders can access the store immediately */}
    <RouterProvider router={router}/>
  </Provider>
  // </StrictMode>,
)

