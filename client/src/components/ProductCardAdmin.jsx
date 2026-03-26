import React, { useState } from 'react'
import EditProductAdmin from './EditProductAdmin' 
import { MdDelete } from "react-icons/md"; // Added Delete Icon
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import AxiosToastError from '../utils/AxiosToastError';

const ProductCardAdmin = ({ data, fetchProductData }) => {
  const [editOpen, setEditOpen] = useState(false)

  // FIXED: Added image error handler for the Admin panel to stop 404 lag
  const handleImgError = (e) => {
    e.target.onerror = null;
    e.target.src = "https://res.cloudinary.com/daso5ntlt/image/upload/v1773599668/Aashirvaad_Superior_MP_Whole_Wheat_Atta_z8tqsf.jpg"; 
  }

  // Function to handle opening the modal
  const handleOpenEdit = () => {
    setEditOpen(true)
  }

  // Function to handle closing the modal
  const handleCloseEdit = () => {
    setEditOpen(false)
  }

  // FIXED: Added Delete Functionality with proper Axios method
  const handleDelete = async () => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${data?.name}"?`);
    if (confirmDelete) {
      try {
        const response = await Axios({
          ...SummaryApi.deleteProduct,
          data: {
            _id: data?._id
          }
        });

        if (response.data.success) {
          toast.success(response.data.message);
          if (fetchProductData) {
            fetchProductData(); // Re-fetches the list to show the 151 remaining products
          }
        }
      } catch (error) {
        AxiosToastError(error);
      }
    }
  }

  return (
    <div className='border p-4 bg-white rounded-md shadow-sm relative group'>
      <div className='w-full h-32 bg-blue-50 rounded p-2'>
        <img 
          src={data?.image[0]} 
          alt={data?.name} 
          onError={handleImgError} // FIXED: Swaps 404s for a working link instantly
          className='w-full h-full object-scale-down' 
        />
      </div>
      
      <div className='mt-2'>
        <p className='font-medium text-sm line-clamp-2'>{data?.name}</p>
        <p className='text-xs text-neutral-500'>{data?.unit || "Unit not specified"}</p>
      </div>

      <div className='flex items-center justify-between mt-3 gap-2'>
        <button 
          type='button'
          onClick={handleOpenEdit} 
          className='flex-1 bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-bold hover:bg-green-200 cursor-pointer text-center'
        >
          Edit
        </button>

        {/* FIXED: Added Delete Button with Red styling */}
        <button 
          type='button'
          onClick={handleDelete}
          className='bg-red-100 text-red-700 p-1 rounded hover:bg-red-200 cursor-pointer flex items-center justify-center'
          title="Delete Product"
        >
          <MdDelete size={20} />
        </button>
      </div>

      {
        editOpen && (
          <EditProductAdmin 
            data={data} 
            close={handleCloseEdit} 
            fetchProductData={fetchProductData} 
          />
        )
      }
    </div>
  )
}

export default ProductCardAdmin