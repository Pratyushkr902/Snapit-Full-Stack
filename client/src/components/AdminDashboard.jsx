import React, { useState, useEffect } from 'react'
import AdminPermision from '../components/AdminPermision' 
import AdminRiderSimulator from '../components/AdminRiderSimulator'
import AddStore from '../components/AddStore' 
import DailyReport from '../components/DailyReport' 
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

const AdminDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]); 
  const [products, setProducts] = useState([]); // NEW: State for products
  const [selectedCategory, setSelectedCategory] = useState(null); // NEW: Tracking selection
  const [totalCash, setTotalCash] = useState(0);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Categories
  const fetchCategory = async () => {
    try {
        const response = await Axios({ ...SummaryApi.getCategory });
        if (response.data.success) {
            setCategories(response.data.data);
        }
    } catch (error) {
        console.error("Category fetch error", error);
    }
  };

  // 2. Fetch Products based on selected category (Fixes the "No Products Found" issue)
  const fetchProductsByCategory = async (catId) => {
    setLoading(true);
    try {
        const response = await Axios({
            ...SummaryApi.getProductByCategoryAndSubCategory,
            data: {
                categoryId: catId,
                subCategoryId: "all", // Ensuring all sub-items show up
                page: 1,
                limit: 10
            }
        });
        if (response.data.success) {
            setProducts(response.data.data);
        }
    } catch (error) {
        console.error("Product fetch error", error);
    } finally {
        setLoading(false);
    }
  };

  // 3. Fetch all orders for logistics stats
  const fetchAllOrders = async () => {
    try {
      const response = await Axios({ ...SummaryApi.getOrderItems });
      if (response.data.success) {
        setOrders(response.data.data);
        
        const cash = response.data.data
          .filter(o => 
            o.delivery_status === "Delivered" && 
            o.payment_status === "CASH ON DELIVERY" &&
            o.isSettled !== true 
          )
          .reduce((acc, curr) => acc + (curr.totalAmt || 0), 0);
        
        setTotalCash(cash);
      }
    } catch (error) {
      console.error("Stats fetch error", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettleCash = async (riderName) => {
    try {
        const response = await Axios({
            ...SummaryApi.settleCash,
            data: { rider_name: riderName }
        });
        if(response.data.success){
            toast.success(response.data.message);
            fetchAllOrders(); 
        }
    } catch (error) {
        toast.error("Settlement failed");
    }
  }

  // Handle Category Click
  const handleCategoryClick = (cat) => {
      setSelectedCategory(cat);
      fetchProductsByCategory(cat._id);
  };

  useEffect(() => {
    fetchCategory(); 
    fetchAllOrders();
    const interval = setInterval(fetchAllOrders, 30000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <div className='p-4 lg:p-8 bg-slate-50 min-h-screen'>
        {/* HEADER SECTION */}
        <div className='mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
            <div>
                <h1 className='text-3xl font-black text-slate-900 uppercase tracking-tighter italic'>Logistics Command Center</h1>
                <p className='text-slate-500 font-bold text-sm uppercase'>Snapit Paliganj Network (6 Marts Active)</p>
            </div>
            
            <div className='bg-green-600 p-6 rounded-[2rem] text-white shadow-xl shadow-green-100 min-w-[280px]'>
                <div className='flex justify-between items-start'>
                    <div>
                        <p className='text-[10px] font-black uppercase opacity-80 tracking-widest'>Uncollected Cash</p>
                        <h2 className='text-3xl font-black'>{DisplayPriceInRupees(totalCash)}</h2>
                    </div>
                    <button 
                        onClick={() => handleSettleCash("Pratyush Kumar")}
                        className='text-[10px] bg-white text-green-600 px-3 py-1 rounded-full font-black uppercase active:scale-95 transition-all'
                    >
                        Settle All
                    </button>
                </div>
                <div className='mt-4 h-1 w-full bg-green-400 rounded-full overflow-hidden'>
                    <div className='h-full bg-white w-1/3 animate-pulse'></div>
                </div>
            </div>
        </div>

        <AdminPermision>
            <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
                
                {/* LEFT SIDEBAR: CATEGORY NAVIGATION */}
                <div className='lg:col-span-1 space-y-6'>
                    <div className='bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm'>
                        <h3 className='font-black text-slate-800 uppercase mb-4 text-xs tracking-widest'>Mart Departments</h3>
                        <div className='flex flex-col gap-1'>
                            <button 
                                onClick={() => setSelectedCategory(null)}
                                className={`text-xs font-bold p-3 rounded-xl transition-all text-left ${!selectedCategory ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                📊 OVERVIEW
                            </button>
                            {categories.length > 0 ? categories.map((cat) => (
                                <button 
                                    onClick={() => handleCategoryClick(cat)}
                                    key={cat._id}
                                    className={`text-xs font-bold p-3 rounded-xl transition-all flex items-center gap-3 border border-transparent ${selectedCategory?._id === cat._id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50 hover:border-slate-100'}`}
                                >
                                    <img src={cat.image} className='w-6 h-6 object-contain rounded' alt="" />
                                    {cat.name}
                                </button>
                            )) : (
                                <p className='text-[10px] text-slate-400 italic'>Loading departments...</p>
                            )}
                        </div>
                    </div>

                    <AddStore fetchStores={fetchAllOrders} />
                    <DailyReport />
                </div>

                {/* RIGHT CONTENT AREA */}
                <div className='lg:col-span-3 space-y-6'>
                    
                    {!selectedCategory ? (
                        /* SHOW ANALYTICS & DISPATCH IF NO CATEGORY SELECTED */
                        <>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                                <div className='bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm'>
                                    <h3 className='font-black text-slate-800 uppercase mb-4 text-sm'>Mart Network Status</h3>
                                    <div className='space-y-3'>
                                        <div className='flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-green-100'>
                                            <span className='text-xs font-bold text-slate-700'>Paliganj Main Mart</span>
                                            <span className='text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded-full font-black uppercase'>Live</span>
                                        </div>
                                    </div>
                                </div>

                                <div className='bg-white p-2 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden'>
                                    <div className='p-4 flex justify-between items-center'>
                                        <h3 className='font-black text-slate-800 uppercase text-sm tracking-widest'>Live Rider</h3>
                                        <div className='flex items-center gap-2'>
                                            <span className='w-2 h-2 bg-red-600 rounded-full animate-ping'></span>
                                            <span className='text-[10px] font-black text-red-600 uppercase'>Live</span>
                                        </div>
                                    </div>
                                    <AdminRiderSimulator orderId="order_paliganj_001" />
                                </div>
                            </div>

                            <div className='bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm'>
                                <h3 className='font-black text-slate-800 uppercase text-sm mb-4'>Recent Dispatch Activity</h3>
                                <div className='space-y-2'>
                                    {orders.length === 0 ? (
                                        <p className='text-slate-400 text-xs italic text-center py-4'>No active dispatch movements.</p>
                                    ) : (
                                        orders.slice(0, 5).map(order => (
                                            <div key={order._id} className='flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-100 transition-all'>
                                                <span className='text-[10px] font-bold text-slate-500'>{order.orderId}</span>
                                                <span className='text-xs font-black text-slate-800'>{order.product_details?.name}</span>
                                                <span className='text-[10px] font-black px-2 py-1 bg-blue-50 text-blue-600 rounded-md uppercase'>{order.delivery_status}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        /* SHOW PRODUCT GRID IF CATEGORY SELECTED */
                        <div className='bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm'>
                            <div className='flex justify-between items-center mb-6'>
                                <h3 className='font-black text-slate-800 uppercase text-sm'>{selectedCategory.name} Inventory</h3>
                                <button onClick={() => setSelectedCategory(null)} className='text-xs font-black text-slate-400 hover:text-red-500'>CLOSE ✕</button>
                            </div>
                            
                            {products.length === 0 ? (
                                <div className='py-20 text-center'>
                                    <p className='text-slate-400 text-xs italic font-bold'>No products found in this category.</p>
                                </div>
                            ) : (
                                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                                    {products.map(product => (
                                        <div key={product._id} className='p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-all cursor-pointer'>
                                            <img src={product.image[0]} className='w-full h-24 object-contain mb-2' alt="" />
                                            <p className='text-[10px] font-black text-slate-800 truncate uppercase'>{product.name}</p>
                                            <p className='text-[10px] font-bold text-green-600'>{DisplayPriceInRupees(product.price)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AdminPermision>
    </div>
  )
}

export default AdminDashboard