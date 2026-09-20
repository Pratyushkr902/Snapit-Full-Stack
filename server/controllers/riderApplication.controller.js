import mongoose from 'mongoose'
import crypto from 'crypto'
import bcryptjs from 'bcryptjs'
import RiderApplicationModel from '../models/riderApplication.model.js'
import UserModel from '../models/user.model.js'

// ── 1. Public / Candidate Application Submission ────────────────────────────
export const applyRiderController = async (req, res) => {
  try {
    const {
      name,
      mobile,
      email,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      preferredHours,
      area
    } = req.body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Full name is required'
      })
    }

    const cleanDigits = String(mobile || '').replace(/\D/g, '')
    if (cleanDigits.length < 10) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'A valid 10-digit mobile number is required'
      })
    }
    const numMobile = Number(cleanDigits.slice(-10))

    // 1. Guard if candidate is already an active rider in the user system
    const existingRider = await UserModel.findOne({
      $or: [
        { mobile: numMobile },
        { mobile: String(numMobile) }
      ],
      role: 'RIDER'
    })
    if (existingRider) {
      return res.status(200).json({
        success: true,
        error: false,
        message: 'You are already registered as an active Snapit Rider! Please log in to your account to open your Rider Panel.',
        data: {
          _id: existingRider._id,
          name: existingRider.name,
          mobile: existingRider.mobile,
          status: 'APPROVED'
        }
      })
    }

    // 2. Guard against duplicate approved application
    const existingApproved = await RiderApplicationModel.findOne({
      mobile: numMobile,
      status: 'APPROVED'
    })
    if (existingApproved) {
      return res.status(200).json({
        success: true,
        error: false,
        message: 'Your rider application was already approved! Please log in with your mobile number and default PIN 1234.',
        data: existingApproved
      })
    }

    // 3. Guard against spamming duplicate pending applications for the same mobile
    const existingPending = await RiderApplicationModel.findOne({
      mobile: numMobile,
      status: 'PENDING'
    })

    if (existingPending) {
      return res.status(200).json({
        success: true,
        error: false,
        message: 'Your application is already received and is under review! Our team will contact you shortly.',
        data: existingPending
      })
    }

    const ALLOWED_VEHICLES = ['BIKE', 'SCOOTER', 'EV', 'BICYCLE']
    const cleanVehicle = ALLOWED_VEHICLES.includes(String(vehicleType || '').toUpperCase())
      ? String(vehicleType).toUpperCase()
      : 'BIKE'

    const ALLOWED_HOURS = ['FULL_TIME', 'MORNING', 'EVENING', 'WEEKEND']
    const cleanHours = ALLOWED_HOURS.includes(String(preferredHours || '').toUpperCase())
      ? String(preferredHours).toUpperCase()
      : 'FULL_TIME'

    const application = await RiderApplicationModel.create({
      name: name.trim(),
      mobile: numMobile,
      email: email ? String(email).trim().toLowerCase() : '',
      vehicleType: cleanVehicle,
      vehicleNumber: vehicleNumber ? String(vehicleNumber).trim().toUpperCase() : '',
      licenseNumber: licenseNumber ? String(licenseNumber).trim().toUpperCase() : '',
      preferredHours: cleanHours,
      area: area ? String(area).trim() : 'Paliganj',
      status: 'PENDING'
    })

    return res.status(201).json({
      success: true,
      error: false,
      message: 'Rider application submitted successfully! Snapit will contact you soon.',
      data: application
    })
  } catch (error) {
    console.error('applyRiderController error:', error)
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to submit application'
    })
  }
}

// ── 2. Admin: Get All Applications ──────────────────────────────────────────
export const getAllRiderApplicationsController = async (req, res) => {
  try {
    const { status } = req.query
    const filter = {}
    if (status && status !== 'ALL') {
      filter.status = status.toUpperCase()
    }

    const applications = await RiderApplicationModel.find(filter)
      .populate('reviewedBy', 'name email mobile')
      .sort({ createdAt: -1 })
      .limit(100)

    const pendingCount = await RiderApplicationModel.countDocuments({ status: 'PENDING' })

    return res.json({
      success: true,
      error: false,
      message: 'Rider applications fetched',
      data: {
        applications,
        pendingCount
      }
    })
  } catch (error) {
    console.error('getAllRiderApplicationsController error:', error)
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to fetch applications'
    })
  }
}

// ── 3. Admin: 1-Tap Approve Application ─────────────────────────────────────
export const approveRiderApplicationController = async (req, res) => {
  try {
    const { applicationId, adminNotes } = req.body
    const reviewerId = req.userId

    if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'A valid applicationId is required'
      })
    }

    const application = await RiderApplicationModel.findById(applicationId)
    if (!application) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Rider application not found'
      })
    }

    const numMobile = application.mobile
    const cleanEmail = application.email ? application.email.trim().toLowerCase() : `${numMobile}@snapit.in`

    // Check if user already exists across mobile number and email variations
    let user = await UserModel.findOne({
      $or: [
        { mobile: numMobile },
        { mobile: String(numMobile) },
        { email: cleanEmail },
        { email: `${numMobile}@snapit.in` },
        { email: `${numMobile}@snapit.express` }
      ]
    })

    const DEFAULT_RIDER_PIN = '1234'

    if (user) {
      user.role = 'RIDER'
      user.status = 'Active'
      if (!user.name || user.name === 'Snapit Customer') {
        user.name = application.name
      }
      user.verify_email = true
      user.is_phone_verified = true

      // Set default PIN '1234' so rider can log in immediately with the PIN sent by admin
      const salt = await bcryptjs.genSalt(10)
      user.password = await bcryptjs.hash(DEFAULT_RIDER_PIN, salt)
      await user.save()
    } else {
      // Create user with default 4-digit PIN '1234' for immediate mobile login
      const salt = await bcryptjs.genSalt(10)
      const hashedPassword = await bcryptjs.hash(DEFAULT_RIDER_PIN, salt)

      user = await UserModel.create({
        name: application.name,
        mobile: numMobile,
        email: cleanEmail,
        password: hashedPassword,
        role: 'RIDER',
        status: 'Active',
        verify_email: true,
        is_phone_verified: true
      })
    }

    application.status = 'APPROVED'
    application.adminNotes = adminNotes || 'Approved by Admin'
    application.reviewedBy = reviewerId || null
    application.reviewedAt = new Date()
    await application.save()

    return res.json({
      success: true,
      error: false,
      message: `🎉 Rider ${user.name} approved & activated! Default PIN is 1234. Share with candidate to log in.`,
      data: {
        application,
        defaultPin: DEFAULT_RIDER_PIN,
        rider: {
          _id: user._id,
          name: user.name,
          mobile: user.mobile,
          email: user.email,
          role: user.role,
          status: user.status
        }
      }
    })
  } catch (error) {
    console.error('approveRiderApplicationController error:', error)
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to approve application'
    })
  }
}

// ── 4. Admin: Reject Application ────────────────────────────────────────────
export const rejectRiderApplicationController = async (req, res) => {
  try {
    const { applicationId, adminNotes } = req.body
    const reviewerId = req.userId

    if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'A valid applicationId is required'
      })
    }

    const application = await RiderApplicationModel.findById(applicationId)
    if (!application) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'Rider application not found'
      })
    }

    application.status = 'REJECTED'
    application.adminNotes = adminNotes || 'Rejected by Admin'
    application.reviewedBy = reviewerId || null
    application.reviewedAt = new Date()
    await application.save()

    return res.json({
      success: true,
      error: false,
      message: `Application for ${application.name} marked as Rejected.`,
      data: application
    })
  } catch (error) {
    console.error('rejectRiderApplicationController error:', error)
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || 'Failed to reject application'
    })
  }
}

