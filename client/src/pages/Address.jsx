import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import AddAddress from '../components/AddAddress'
import { MdDelete } from "react-icons/md";
import { MdEdit } from "react-icons/md";
import { IoArrowBack } from "react-icons/io5";
import EditAddressDetails from '../components/EditAddressDetails';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import AxiosToastError from '../utils/AxiosToastError';
import { useGlobalContext } from '../provider/GlobalProvider';

const Address = () => {
  const navigate = useNavigate()
  const addressList = useSelector(state => state.addresses.addressList)
  const [openAddress,setOpenAddress] = useState(false)
  const [OpenEdit,setOpenEdit] = useState(false)
  const [editData,setEditData] = useState({})
  const { fetchAddress } = useGlobalContext() || {}

  const handleDisableAddress = async(id)=>{
    try {
      const response = await Axios({
        ...SummaryApi.disableAddress,
        data : {
          _id : id
        }
      })
      if(response.data.success){
        toast.success("Address Remove")
        if(fetchAddress){
          fetchAddress()
        }
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }
  return (
    <div className=''>
        <div className='bg-white shadow-lg px-2 py-2 flex justify-between gap-4 items-center '>
            <div className='flex items-center gap-2'>
                <button onClick={()=>navigate(-1)} className='p-1.5 rounded-full hover:bg-gray-100'>
                    <IoArrowBack size={20}/>
                </button>
                <h2 className='font-semibold text-ellipsis line-clamp-1'>Address</h2>
            </div>
            <button onClick={()=>setOpenAddress(true)} className='border border-primary-200 text-primary-200 px-3 hover:bg-primary-200 hover:text-black py-1 rounded-full'>
                Add Address
            </button>
        </div>
        <div className='bg-blue-50 p-2 grid gap-4'>
              {
                addressList.map((address,index)=>{
                  const isRecipient = Boolean(address.recipient_name)
                  return(
                      <div key={address._id || index} className={`border border-slate-200 rounded-2xl p-4 flex justify-between gap-3 bg-white shadow-sm hover:shadow-md transition-shadow ${!address.status && 'hidden'}`}>
                          <div className='w-full space-y-1'>
                            <div className='flex items-center gap-2 mb-1.5'>
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                                isRecipient || address.address_type === 'FRIENDS_FAMILY'
                                  ? 'bg-amber-100 text-amber-800'
                                  : address.address_type === 'WORK'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {isRecipient || address.address_type === 'FRIENDS_FAMILY' ? '🎁 Friends & Family' : address.address_type || '🏠 Home'}
                              </span>

                              {address.lat && address.lng && (
                                <span className='text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded-md font-bold'>
                                  📍 Pinned
                                </span>
                              )}
                            </div>

                            {isRecipient && (
                              <p className='text-xs font-black text-slate-800 flex items-center gap-1.5'>
                                <span>Recipient:</span>
                                <span className='text-emerald-700'>{address.recipient_name}</span>
                                {address.recipient_mobile && <span className='text-slate-500 font-medium'>({address.recipient_mobile})</span>}
                              </p>
                            )}

                            {address.floor_door && (
                              <p className='text-xs text-slate-600 font-semibold'>{address.floor_door}</p>
                            )}
                            <p className='text-xs text-slate-700 font-medium'>{address.address_line}</p>
                            {address.landmark && (
                              <p className='text-[11px] text-slate-500'>Landmark: {address.landmark}</p>
                            )}
                            <p className='text-xs font-bold text-slate-800'>{address.city}, {address.state} - {address.pincode}</p>
                            <p className='text-xs text-slate-500'>Contact: +91 {address.mobile}</p>
                          </div>
                          <div className='flex flex-col gap-2 justify-center'>
                            <button onClick={()=>{
                              setOpenEdit(true)
                              setEditData(address)
                            }} className='p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors'>
                              <MdEdit size={16}/>
                            </button>
                            <button onClick={()=>
                              handleDisableAddress(address._id)
                            } className='p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors'>
                              <MdDelete size={16}/>  
                            </button>
                          </div>
                      </div>
                  )
                })
              }
              <div onClick={()=>setOpenAddress(true)} className='h-16 bg-blue-50 border-2 border-dashed flex justify-center items-center cursor-pointer'>
                Add address
              </div>
        </div>

        {
          openAddress && (
            <AddAddress close={()=>setOpenAddress(false)}/>
          )
        }

        {
          OpenEdit && (
            <EditAddressDetails data={editData} close={()=>setOpenEdit(false)}/>
          )
        }
    </div>
  )
}

export default Address