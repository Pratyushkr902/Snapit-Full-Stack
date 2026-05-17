import React, { useEffect, useState } from 'react'
import UploadCategoryModel from '../components/UploadCategoryModel'
import Loading from '../components/Loading'
import NoData from '../components/NoData'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import EditCategory from '../components/EditCategory'
import CofirmBox from '../components/ConfirmBox'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'

// ─── REMOVED: Dead commented-out Redux selector (useSelector import + allCategory).
// The direct API approach is cleaner — keep one data-fetching strategy per page.

const CategoryPage = () => {
  const [openUploadCategory, setOpenUploadCategory] = useState(false)
  const [loading, setLoading] = useState(false)
  const [categoryData, setCategoryData] = useState([])
  const [openEdit, setOpenEdit] = useState(false)
  const [editData, setEditData] = useState({ name: "", image: "" })
  const [openConfimBoxDelete, setOpenConfirmBoxDelete] = useState(false)
  const [deleteCategory, setDeleteCategory] = useState({ _id: "" })

  const fetchCategory = async () => {
    try {
      setLoading(true)
      const response = await Axios({ ...SummaryApi.getCategory })
      const { data: responseData } = response
      if (responseData.success) {
        setCategoryData(responseData.data)
      }
    } catch (error) {
      AxiosToastError(error)  // ─── FIXED: Was silently swallowing errors
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCategory() }, [])

  const handleDeleteCategory = async () => {
    try {
      const response = await Axios({
        ...SummaryApi.deleteCategory,
        data: deleteCategory
      })
      const { data: responseData } = response
      if (responseData.success) {
        toast.success(responseData.message)
        fetchCategory()
        setOpenConfirmBoxDelete(false)
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }

  return (
    <section className='min-h-screen bg-slate-50'>

      {/* ─── CHANGE 1: Page header with count badge ───────────────────────────
          Shows how many categories exist — useful at a glance in admin.      */}
      <div className='bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10'>
        <div className='flex items-center gap-2'>
          <h2 className='font-semibold text-slate-800'>Categories</h2>
          {/* ─── CHANGE 2: Live count badge ─────────────────────────────────── */}
          {!loading && categoryData.length > 0 && (
            <span className='bg-slate-100 text-slate-500 text-xs font-semibold px-2 py-0.5 rounded-full'>
              {categoryData.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setOpenUploadCategory(true)}
          className='text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg font-medium transition-colors'
        >
          + Add Category
        </button>
      </div>

      {/* Loading skeletons */}
      {loading && (
        // ─── CHANGE 3: Skeleton grid matches card shape ──────────────────────
        // Old: a generic <Loading/> spinner in the middle of nowhere.
        // New: skeleton cards that match the real card layout — no layout shift.
        <div className='p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3'>
          {new Array(12).fill(null).map((_, i) => (
            <div key={i} className='bg-white rounded-xl shadow-sm overflow-hidden'>
              <div className='bg-slate-100 w-full aspect-square animate-pulse' />
              <div className='p-2 flex gap-2'>
                <div className='bg-slate-100 h-7 flex-1 rounded animate-pulse' />
                <div className='bg-slate-100 h-7 flex-1 rounded animate-pulse' />
              </div>
            </div>
          ))}
        </div>
      )}

      {!categoryData[0] && !loading && <NoData />}

      {/* ─── CHANGE 4: Card redesign ────────────────────────────────────────────
          Old: w-32 h-56 fixed — breaks on small screens, image overflow issues.
          New: fluid grid with aspect-square image + clean action row.          */}
      {!loading && (
        <div className='p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3'>
          {categoryData.map((category) => (
            <div
              key={category._id}
              className='bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 hover:shadow-md transition-shadow'
            >
              {/* ─── CHANGE 5: aspect-square image container ─────────────────
                  Old: img directly with object-scale-down, no container = height issues.
                  New: fixed-ratio container, image fills it cleanly.           */}
              <div className='w-full aspect-square bg-slate-50 flex items-center justify-center p-3'>
                <img
                  alt={category.name}
                  src={category.image}
                  className='w-full h-full object-contain'
                  loading="lazy"
                />
              </div>
              <div className='px-2 py-1.5'>
                <p className='text-xs font-semibold text-slate-700 line-clamp-1 mb-2'>{category.name}</p>
                <div className='flex gap-1.5'>
                  <button
                    onClick={() => { setOpenEdit(true); setEditData(category) }}
                    className='flex-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold py-1.5 rounded-lg transition-colors'
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => { setOpenConfirmBoxDelete(true); setDeleteCategory(category) }}
                    className='flex-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold py-1.5 rounded-lg transition-colors'
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {openUploadCategory && (
        <UploadCategoryModel fetchData={fetchCategory} close={() => setOpenUploadCategory(false)} />
      )}
      {openEdit && (
        <EditCategory data={editData} close={() => setOpenEdit(false)} fetchData={fetchCategory} />
      )}
      {openConfimBoxDelete && (
        <CofirmBox
          close={() => setOpenConfirmBoxDelete(false)}
          cancel={() => setOpenConfirmBoxDelete(false)}
          confirm={handleDeleteCategory}
        />
      )}
    </section>
  )
}

export default CategoryPage