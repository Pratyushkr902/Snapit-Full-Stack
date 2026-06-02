import UserModel from "../models/user.model.js"

// ✅ FIXED: accepts array of roles so ADMIN can access seller/rider routes
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
    const allowedRoles = Array.isArray(roles) ? roles : [roles]
    if (!user || !allowedRoles.includes(user.role)) {
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

export const admin  = checkRole('ADMIN')
export const seller = checkRole(['SELLER', 'ADMIN'])  // ✅ ADMIN can access seller routes
export const rider  = checkRole(['RIDER', 'ADMIN'])   // ✅ ADMIN can access rider routes