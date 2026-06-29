import React, { useEffect, useState } from 'react'
import UploadSubCategoryModel from '../components/UploadSubCategoryModel'
import AxiosToastError from '../utils/AxiosToastError'
import Axios from '../utils/Axios'
import SummaryApi from '../common/SummaryApi'
import DisplayTable from '../components/DisplayTable'
import { createColumnHelper } from '@tanstack/react-table'
import ViewImage from '../components/ViewImage'
import { MdDelete } from "react-icons/md"
import { HiPencil } from "react-icons/hi"
import EditSubCategory from '../components/EditSubCategory'
import CofirmBox from '../components/ConfirmBox'
import toast from 'react-hot-toast'

const BACKEND_URL = import.meta.env.VITE_API_URL || "https://snapit-full-stack-production.up.railway.app"

// ✅ Inline SVG fallback — never fails
const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f3f4f6'/%3E%3Ctext x='75' y='80' text-anchor='middle' fill='%239ca3af' font-size='11' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E"

// ✅ Safely resolve image whether it's a string, array, relative, or absolute URL
const resolveImage = (image) => {
  const raw = Array.isArray(image) ? image[0] : image
  if (!raw || typeof raw !== 'string') return FALLBACK_IMG
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  if (raw.startsWith('/')) return `${BACKEND_URL}${raw}`
  return FALLBACK_IMG
}

const SubCategoryPage = () => {
  const [openAddSubCategory, setOpenAddSubCategory] = useState(false)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const columnHelper = createColumnHelper()
  const [ImageURL, setImageURL] = useState("")
  const [openEdit, setOpenEdit] = useState(false)
  const [editData, setEditData] = useState({ _id: "" })
  const [deleteSubCategory, setDeleteSubCategory] = useState({ _id: "" })
  const [openDeleteConfirmBox, setOpenDeleteConfirmBox] = useState(false)

  const fetchSubCategory = async () => {
    try {
      setLoading(true)
      const response = await Axios({ ...SummaryApi.getSubCategory })
      const { data: responseData } = response
      if (responseData.success) {
        setData(responseData.data)
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSubCategory() }, [])

  const column = [
    columnHelper.accessor('name', {
      header: "Name"
    }),
    columnHelper.accessor('image', {
      header: "Image",
      cell: ({ row }) => {
        // ✅ FIXED: resolveImage handles array OR string image field safely
        const src = resolveImage(row.original.image)
        return (
          <div className='flex justify-center items-center'>
            <img
              src={src}
              alt={row.original.name}
              className='w-8 h-8 cursor-pointer object-contain'
              loading="eager"
              onClick={() => setImageURL(src)}
              onError={(e) => {
                e.target.onerror = null
                e.target.src = FALLBACK_IMG
              }}
            />
          </div>
        )
      }
    }),
    columnHelper.accessor("category", {
      header: "Category",
      cell: ({ row }) => {
        return (
          <div className='flex flex-wrap gap-2 justify-center'>
            {
              // ✅ FIXED: guard against category being undefined/null
              Array.isArray(row.original.category)
                ? row.original.category.map((c) => (
                  <p key={c._id + "table"} className='shadow-md px-1 inline-block bg-white text-xs'>
                    {c.name}
                  </p>
                ))
                : null
            }
          </div>
        )
      }
    }),
    columnHelper.accessor("_id", {
      header: "Action",
      cell: ({ row }) => {
        return (
          <div className='flex items-center justify-center gap-3'>
            <button
              onClick={() => { setOpenEdit(true); setEditData(row.original) }}
              className='p-2 bg-green-100 rounded-full hover:text-green-600 transition-colors'
            >
              <HiPencil size={20} />
            </button>
            <button
              onClick={() => { setOpenDeleteConfirmBox(true); setDeleteSubCategory(row.original) }}
              className='p-2 bg-red-100 rounded-full text-red-500 hover:text-red-600 transition-colors'
            >
              <MdDelete size={20} />
            </button>
          </div>
        )
      }
    })
  ]

  const handleDeleteSubCategory = async () => {
    try {
      const response = await Axios({
        ...SummaryApi.deleteSubCategory,
        data: deleteSubCategory
      })
      const { data: responseData } = response
      if (responseData.success) {
        toast.success(responseData.message)
        fetchSubCategory()
        setOpenDeleteConfirmBox(false)
        setDeleteSubCategory({ _id: "" })
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }

  return (
    <section className=''>
      <div className='p-2 bg-white shadow-md flex items-center justify-between'>
        <h2 className='font-semibold'>Sub Category</h2>
        <button
          onClick={() => setOpenAddSubCategory(true)}
          className='text-sm border border-primary-200 hover:bg-primary-200 px-3 py-1 rounded transition-colors'
        >
          Add Sub Category
        </button>
      </div>

      <div className='overflow-auto w-full max-w-[95vw]'>
        <DisplayTable data={data} column={column} />
      </div>

      {openAddSubCategory && (
        <UploadSubCategoryModel
          close={() => setOpenAddSubCategory(false)}
          fetchData={fetchSubCategory}
        />
      )}

      {ImageURL && (
        <ViewImage url={ImageURL} close={() => setImageURL("")} />
      )}

      {openEdit && (
        <EditSubCategory
          data={editData}
          close={() => setOpenEdit(false)}
          fetchData={fetchSubCategory}
        />
      )}

      {openDeleteConfirmBox && (
        <CofirmBox
          cancel={() => setOpenDeleteConfirmBox(false)}
          close={() => setOpenDeleteConfirmBox(false)}
          confirm={handleDeleteSubCategory}
        />
      )}
    </section>
  )
}

export default SubCategoryPage