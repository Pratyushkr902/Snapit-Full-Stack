import React, { useState } from 'react'
import EditProductAdmin from './EditProductAdmin'
import { MdDelete } from "react-icons/md"
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'
import { optimizeImage } from '../utils/optimizeImage'

// ─── CHANGE 1: Replace window.confirm with inline confirm UI ──────────────────
// window.confirm() blocks the main thread, looks like a browser bug alert, and
// can't be styled. This inline state shows a "Really delete?" prompt inside the
// card itself — same safety, no jarring browser dialog.

const ProductCardAdmin = ({ data, fetchProductData }) => {
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [quickStockLoading, setQuickStockLoading] = useState(false)
  const [showCustomStock, setShowCustomStock] = useState(false)
  const [customStockVal, setCustomStockVal] = useState('')

  const currentStock = Number(data?.stock) || 0

  const handleQuickRestock = async (qtyToAdd) => {
    try {
      setQuickStockLoading(true)
      const newStock = Math.max(0, currentStock + Number(qtyToAdd))
      const response = await Axios({
        ...SummaryApi.updateProductDetails,
        data: {
          _id: data?._id,
          stock: newStock,
          publish: true,
        }
      })
      if (response.data.success) {
        toast.success(`⚡ Restocked ${data?.name?.slice(0, 18)}... to ${newStock} units!`, { id: `restock-${data?._id}` })
        if (fetchProductData) fetchProductData()
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setQuickStockLoading(false)
      setShowCustomStock(false)
      setCustomStockVal('')
    }
  }

  const handleSetExactStock = async (e) => {
    e?.preventDefault()
    const parsed = parseInt(customStockVal, 10)
    if (isNaN(parsed) || parsed < 0) {
      toast.error('Please enter a valid stock quantity')
      return
    }
    try {
      setQuickStockLoading(true)
      const response = await Axios({
        ...SummaryApi.updateProductDetails,
        data: {
          _id: data?._id,
          stock: parsed,
          publish: true,
        }
      })
      if (response.data.success) {
        toast.success(`⚡ Stock updated to ${parsed} units!`, { id: `restock-${data?._id}` })
        if (fetchProductData) fetchProductData()
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setQuickStockLoading(false)
      setShowCustomStock(false)
      setCustomStockVal('')
    }
  }

  const handleImgError = (e) => {
    e.target.onerror = null
    e.target.src = "https://res.cloudinary.com/daso5ntlt/image/upload/v1773599668/Aashirvaad_Superior_MP_Whole_Wheat_Atta_z8tqsf.jpg"
  }

  // ─── CHANGE 2: Loading state during delete ────────────────────────────────
  const handleDelete = async () => {
    try {
      setDeleting(true)
      const response = await Axios({
        ...SummaryApi.deleteProduct,
        data: { _id: data?._id }
      })
      if (response.data.success) {
        toast.success(response.data.message)
        if (fetchProductData) fetchProductData()
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className='border border-slate-100 p-3 bg-white rounded-xl shadow-sm relative group hover:shadow-md transition-shadow flex flex-col justify-between h-full'>
      <div>
        {/* Product image */}
        <div className='w-full h-32 bg-slate-50 rounded-lg p-2 mb-2'>
          <img
            src={optimizeImage(data?.image?.[0], 300)}
            alt={data?.name}
            onError={handleImgError}
            className='w-full h-full object-scale-down'
            loading="lazy"
          />
        </div>

        {/* Product info */}
        <p className='font-semibold text-sm text-slate-800 line-clamp-2 mb-0.5'>{data?.name}</p>
        <p className='text-xs text-slate-400 mb-2'>{data?.unit || "Unit not specified"}</p>

        {/* Stock status indicator */}
        <div className='flex items-center justify-between gap-1 mb-2'>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
            currentStock <= 0
              ? 'bg-red-100 text-red-700 border border-red-200'
              : currentStock < 5
              ? 'bg-amber-100 text-amber-800 border border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {currentStock <= 0 ? '❌ Out of Stock' : `📦 Stock: ${currentStock}`}
          </span>
          
          <button
            type="button"
            onClick={() => setShowCustomStock(prev => !prev)}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
          >
            {showCustomStock ? 'Cancel' : 'Set Stock'}
          </button>
        </div>

        {/* Quick 1-tap restock row */}
        {showCustomStock ? (
          <form onSubmit={handleSetExactStock} className='flex gap-1 mb-2.5'>
            <input
              type='number'
              min='0'
              placeholder='Qty'
              value={customStockVal}
              onChange={e => setCustomStockVal(e.target.value)}
              className='w-16 px-1.5 py-1 text-xs border border-slate-300 rounded outline-none focus:border-emerald-500 font-bold'
              autoFocus
            />
            <button
              type='submit'
              disabled={quickStockLoading}
              className='flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded py-1 disabled:opacity-50'
            >
              {quickStockLoading ? '...' : 'Save'}
            </button>
          </form>
        ) : (
          <div className='flex items-center gap-1 mb-2.5'>
            <span className='text-[9px] font-bold text-slate-400'>+Add:</span>
            <button
              type='button'
              onClick={() => handleQuickRestock(10)}
              disabled={quickStockLoading}
              className='flex-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 py-1 rounded text-[10px] font-bold transition-all disabled:opacity-50'
              title="Quick add 10 units"
            >
              +10
            </button>
            <button
              type='button'
              onClick={() => handleQuickRestock(25)}
              disabled={quickStockLoading}
              className='flex-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 py-1 rounded text-[10px] font-bold transition-all disabled:opacity-50'
              title="Quick add 25 units"
            >
              +25
            </button>
            <button
              type='button'
              onClick={() => handleQuickRestock(50)}
              disabled={quickStockLoading}
              className='flex-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 py-1 rounded text-[10px] font-bold transition-all disabled:opacity-50'
              title="Quick add 50 units"
            >
              +50
            </button>
          </div>
        )}
      </div>

      {/* ─── CHANGE 1: Inline delete confirm ─────────────────────────────────
          Normal state: Edit + Delete buttons side by side.
          Confirm state: "Really delete?" with Yes/Cancel inside the same card. */}
      {confirmDelete ? (
        <div className='bg-red-50 border border-red-100 rounded-lg p-2.5'>
          <p className='text-xs text-red-700 font-semibold mb-2'>Delete this product?</p>
          <div className='flex gap-1.5'>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className='flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-xs font-bold py-1.5 rounded-lg transition-colors'
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className='flex-1 bg-white border border-slate-200 text-slate-600 text-xs font-semibold py-1.5 rounded-lg hover:bg-slate-50 transition-colors'
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className='flex gap-2'>
          <button
            type='button'
            onClick={() => setEditOpen(true)}
            className='flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-1.5 rounded-lg text-xs font-bold transition-colors'
          >
            Edit
          </button>
          <button
            type='button'
            onClick={() => setConfirmDelete(true)}
            className='bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-lg transition-colors flex items-center justify-center'
            title="Delete Product"
          >
            <MdDelete size={18} />
          </button>
        </div>
      )}

      {editOpen && (
        <EditProductAdmin
          data={data}
          close={() => setEditOpen(false)}
          fetchProductData={fetchProductData}
        />
      )}
    </div>
  )
}

export default ProductCardAdmin