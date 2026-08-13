import UserModel from "../models/user.model.js"

// Accepts array of roles — SUPER_ADMIN always bypasses, ADMIN keeps working as before
const checkRole = (roles) => async (request, response, next) => {
  try {
    const userId = request.userId
    if (!userId) {
      return response.status(401).json({
        message: "Unauthorized",
        error: true,
        success: false
      })
    }

    const user = await UserModel.findById(userId)
    if (!user) {
      return response.status(403).json({
        message: "Permission denied",
        error: true,
        success: false
      })
    }

    // SUPER_ADMIN has unconditional access to every role-gated route
    if (user.role === 'SUPER_ADMIN') {
      request.user = user
      return next()
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles]
    if (!allowedRoles.includes(user.role)) {
      return response.status(403).json({
        message: "Permission denied",
        error: true,
        success: false
      })
    }

    request.user = user
    next()
  } catch (error) {
    return response.status(500).json({
      message: error.message || "Permission denied",
      error: true,
      success: false
    })
  }
}

export const superAdmin  = checkRole('SUPER_ADMIN')
export const admin       = checkRole('ADMIN')
export const seller      = checkRole(['SELLER', 'ADMIN'])
export const rider       = checkRole(['RIDER', 'ADMIN'])
export const restoSeller = checkRole(['RESTO_SELLER', 'ADMIN'])
