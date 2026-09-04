import jwt from 'jsonwebtoken'
import UserModel from '../models/user.model.js'

const auth = async (request, response, next) => {
    try {
        let token = null

        const authHeader = request?.headers?.authorization || request?.headers?.Authorization
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1]
        }

        if (!token) {
            token = request.cookies?.accessToken || request.cookies?.accesstoken
        }

        if (!token) {
            return response.status(401).json({
                message: "Authentication token missing. Please log in again.",
                error: true,
                success: false
            })
        }

        const secretKey = process.env.SECRET_KEY_ACCESS_TOKEN
        const decode = jwt.verify(token, secretKey)

        if (!decode) {
            return response.status(401).json({
                message: "Unauthorized access token validation failed.",
                error: true,
                success: false
            })
        }

        request.userId = decode.id
        request.userRole = decode.role

        // Fast DB fallback to ensure promoted roles (ADMIN, RIDER, SUPER_ADMIN) take effect immediately
        if (!request.userRole || request.userRole === 'USER') {
            try {
                const liveUser = await UserModel.findById(decode.id).select('role').lean()
                if (liveUser?.role) {
                    request.userRole = liveUser.role
                }
            } catch (err) {
                // non-fatal fallback to token role
            }
        }

        if (!request.userId) {
            return response.status(401).json({
                message: "Invalid token structure: User reference property missing.",
                error: true,
                success: false
            })
        }

        next()

    } catch (error) {
        console.error("❌ [Auth Middleware Error]:", error.message)
        return response.status(401).json({
            message: "Session expired or invalid token. Please login again.",
            error: true,
            success: false
        })
    }
}

export const optionalAuth = async (request, response, next) => {
    try {
        let token = null
        const authHeader = request?.headers?.authorization || request?.headers?.Authorization
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1]
        }
        if (!token) {
            token = request.cookies?.accessToken || request.cookies?.accesstoken
        }
        if (token) {
            const secretKey = process.env.SECRET_KEY_ACCESS_TOKEN
            const decode = jwt.verify(token, secretKey)
            if (decode?.id) {
                request.userId = decode.id
                request.userRole = decode.role
            }
        }
    } catch {}
    next()
}

export default auth