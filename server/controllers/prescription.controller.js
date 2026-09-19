import PrescriptionModel from '../models/prescription.model.js'
import UserModel from '../models/user.model.js'

export const uploadPrescriptionController = async (req, res) => {
  try {
    const userId = req.userId
    const { patientName, contactPhone, prescriptionImages, deliveryAddress, deliveryAddressText, notes } = req.body

    if (!patientName || !contactPhone) {
      return res.status(400).json({
        message: 'Patient name and contact phone are required',
        error: true,
        success: false,
      })
    }

    if (!prescriptionImages || !Array.isArray(prescriptionImages) || prescriptionImages.length === 0) {
      return res.status(400).json({
        message: 'Please attach at least one clear photo of your prescription',
        error: true,
        success: false,
      })
    }

    const prescription = await PrescriptionModel.create({
      userId,
      patientName: patientName.trim(),
      contactPhone: contactPhone.trim(),
      prescriptionImages,
      deliveryAddress: deliveryAddress || null,
      deliveryAddressText: deliveryAddressText || '',
      notes: notes ? notes.trim() : '',
      status: 'pending',
    })

    return res.status(201).json({
      message: 'Prescription uploaded successfully! Our pharmacist will review it and prepare your order.',
      data: prescription,
      success: true,
      error: false,
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    })
  }
}

export const getMyPrescriptionsController = async (req, res) => {
  try {
    const userId = req.userId
    const prescriptions = await PrescriptionModel.find({ userId })
      .populate('deliveryAddress')
      .sort({ createdAt: -1 })

    return res.json({
      message: 'My prescriptions list',
      data: prescriptions,
      success: true,
      error: false,
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    })
  }
}

export const getAllPrescriptionsAdminController = async (req, res) => {
  try {
    const { status } = req.query
    const filter = {}
    if (status) filter.status = status

    const prescriptions = await PrescriptionModel.find(filter)
      .populate('userId', 'name email mobile')
      .populate('deliveryAddress')
      .sort({ createdAt: -1 })
      .limit(100)

    return res.json({
      message: 'All prescriptions',
      data: prescriptions,
      success: true,
      error: false,
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    })
  }
}

export const updatePrescriptionStatusController = async (req, res) => {
  try {
    const { prescriptionId, status, adminNotes, estimatedBill } = req.body

    if (!prescriptionId) {
      return res.status(400).json({
        message: 'prescriptionId is required',
        error: true,
        success: false,
      })
    }

    const updated = await PrescriptionModel.findByIdAndUpdate(
      prescriptionId,
      {
        ...(status && { status }),
        ...(adminNotes !== undefined && { adminNotes }),
        ...(estimatedBill !== undefined && { estimatedBill: Number(estimatedBill) }),
      },
      { new: true }
    )

    if (!updated) {
      return res.status(404).json({
        message: 'Prescription not found',
        error: true,
        success: false,
      })
    }

    return res.json({
      message: 'Prescription status updated successfully',
      data: updated,
      success: true,
      error: false,
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message || error,
      error: true,
      success: false,
    })
  }
}

