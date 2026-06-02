import UserModel from "../models/user.model.js"

// Reusable factory
const checkRole = (role) => async (request, response, next) => {
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

    if (!user || user.role !== role) {
      return response.status(403).json({
        message: "Permission denied",
        error: true,
        success: false
      })
    }

    request.user = user  // attach for use in controllers
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
export const seller = checkRole('SELLER')
export const rider  = checkRole('RIDER')