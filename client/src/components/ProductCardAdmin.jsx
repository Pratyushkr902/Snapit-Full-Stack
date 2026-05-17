import React, { useState } from 'react'
import EditProductAdmin from './EditProductAdmin'
import { MdDelete } from "react-icons/md"
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'

// ─── CHANGE 1: Replace window.confirm with inline confirm UI ──────────────────
// window.confirm() blocks the main thread, looks like a browser bug alert, and
// can't be styled. This inline state shows a "Really delete?" prompt inside the
// card itself — same safety, no jarring browser dialog.

const ProductCardAdmin = ({ data, fetchProductData }) => {
  const [editOpen, setEditOpen] = useState(false)
  // ─── CHANGE 1 (continued) ─────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleImgError = (e) => {
    e.target.onerror = null
    e.target.src = "https://res.cloudinary.com/daso5ntlt/image/upload/v1773599668/Aashirvaad_Superior_MP_Whole_Wheat_Atta_z8tqsf.jpg"
  }

  // ─── CHANGE 2: Loading state during delete ────────────────────────────────
  // Old: no feedback between click and toast — user double-clicks thinking it failed.
  // New: button shows "Deleting…" and is disabled while the request is in flight.
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
    <div className='border border-slate-100 p-3 bg-white rounded-xl shadow-sm relative group hover:shadow-md transition-shadow'>

      {/* Product image */}
      <div className='w-full h-32 bg-slate-50 rounded-lg p-2 mb-2'>
        <img
          src={data?.image[0]}
          alt={data?.name}
          onError={handleImgError}
          className='w-full h-full object-scale-down'
          loading="lazy"
        />
      </div>

      {/* Product info */}
      <p className='font-semibold text-sm text-slate-800 line-clamp-2 mb-0.5'>{data?.name}</p>
      <p className='text-xs text-slate-400 mb-3'>{data?.unit || "Unit not specified"}</p>

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