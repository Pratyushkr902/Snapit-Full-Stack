import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'

export default function PrescriptionUploadModal({ isOpen, onClose, onSuccess }) {
  const user = useSelector(state => state.user)
  const addressList = useSelector(state => state.addresses?.addressList || [])

  const [patientName, setPatientName] = useState(user?.name || '')
  const [contactPhone, setContactPhone] = useState(user?.mobile || '')
  const [notes, setNotes] = useState('')
  const [selectedAddressId, setSelectedAddressId] = useState(addressList[0]?._id || '')
  const [manualAddress, setManualAddress] = useState('')
  const [images, setImages] = useState([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submittedSuccess, setSubmittedSuccess] = useState(false)

  if (!isOpen) return null

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit')
      return
    }

    const formData = new FormData()
    formData.append('image', file)

    setUploadingImage(true)
    try {
      const res = await Axios({
        method: 'POST',
        url: '/api/file/upload',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const uploadedUrl = res.data?.data?.url || res.data?.url || res.data?.data?.secure_url
      if (uploadedUrl) {
        setImages(prev => [...prev, uploadedUrl])
        toast.success('Prescription image attached')
      } else {
        toast.error('Failed to parse uploaded image URL')
      }
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to upload photo')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!patientName.trim()) {
      toast.error('Please enter patient name')
      return
    }
    if (!contactPhone.trim()) {
      toast.error('Please enter contact phone number')
      return
    }
    if (images.length === 0) {
      toast.error('Please attach at least one photo of your prescription')
      return
    }

    setSubmitting(true)
    try {
      const res = await Axios({
        method: 'POST',
        url: '/api/prescription/upload',
        data: {
          patientName,
          contactPhone,
          prescriptionImages: images,
          deliveryAddress: selectedAddressId || null,
          deliveryAddressText: manualAddress,
          notes,
        },
      })

      if (res.data?.success) {
        setSubmittedSuccess(true)
        if (onSuccess) onSuccess(res.data.data)
      } else {
        toast.error(res.data?.message || 'Failed to submit prescription')
      }
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to submit prescription')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-linear-to-r from-teal-600 to-emerald-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📸</span>
            <div>
              <h3 className="text-base font-black tracking-tight">Order with Prescription</h3>
              <p className="text-[11px] text-teal-100">Upload doctor's slip & get doorstep delivery in 10 mins</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        {submittedSuccess ? (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mb-4">
              ✓
            </div>
            <h4 className="text-lg font-black text-gray-900 mb-1">Prescription Received!</h4>
            <p className="text-xs text-gray-600 max-w-sm mb-6">
              Our registered pharmacist is reviewing your doctor's slip. We will prepare your cart and contact you at <strong className="text-gray-900">{contactPhone}</strong> within 5 minutes.
            </p>
            <button
              onClick={() => {
                setSubmittedSuccess(false)
                onClose()
              }}
              className="w-full max-w-xs py-3 bg-emerald-600 text-white font-black rounded-2xl shadow-md hover:bg-emerald-700 transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
            {/* Image Attachments */}
            <div>
              <label className="block font-bold text-gray-800 mb-1.5">
                Doctor's Prescription Slip <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-3 gap-2.5 mb-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                    <img src={img} alt="prescription" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <label className="border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/50 hover:bg-teal-50/80 rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer transition p-2 text-center">
                  <span className="text-2xl mb-1">{uploadingImage ? '⏳' : '📷'}</span>
                  <span className="text-[10px] font-bold text-teal-800">
                    {uploadingImage ? 'Uploading...' : '+ Add Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={handleImagePick}
                  />
                </label>
              </div>
              <p className="text-[10px] text-gray-400">
                Ensure doctor's signature and medicine names are clearly visible.
              </p>
            </div>

            {/* Patient Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-teal-500 focus:outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  Contact Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-teal-500 focus:outline-hidden font-medium"
                />
              </div>
            </div>

            {/* Delivery Address */}
            <div>
              <label className="block font-bold text-gray-800 mb-1">
                Delivery Address
              </label>
              {addressList.length > 0 ? (
                <select
                  value={selectedAddressId}
                  onChange={(e) => setSelectedAddressId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-teal-500 focus:outline-hidden font-medium bg-white"
                >
                  {addressList.map(addr => (
                    <option key={addr._id} value={addr._id}>
                      {addr.address_line || addr.city} ({addr.address_type || 'Address'})
                    </option>
                  ))}
                  <option value="">+ Other / Type Manually</option>
                </select>
              ) : null}

              {(!selectedAddressId || addressList.length === 0) && (
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Enter house/room number, landmark, area"
                  className="w-full mt-2 px-3 py-2.5 rounded-xl border border-gray-200 focus:border-teal-500 focus:outline-hidden font-medium"
                />
              )}
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block font-bold text-gray-800 mb-1">
                Specific Medicine / Dosage Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Send 1 strip of Paracetamol 650mg and 1 bottle of Benadryl syrup"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-teal-500 focus:outline-hidden font-medium resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || uploadingImage || images.length === 0}
                className="px-6 py-2.5 rounded-xl font-black bg-teal-600 hover:bg-teal-700 active:scale-95 text-white transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {submitting ? 'Submitting...' : 'Upload & Order Now 🚀'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

