import jwt from 'jsonwebtoken'

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

        request.userId = decode.id  // ✅ FIXED: was decode._id || decode.id

        if (!request.userId) {
            return response.status(401).json({
                message: "Invalid token structure: User reference property missing.",
                error: true,
                success: false
            })
        }

        next()

    } catch (error) {
        console.error("❌ [Auth Middleware Error]:", error.message);
        return response.status(401).json({
            message: "Session expired or invalid token. Please login again.",
            error: true,
            success: false
        })
    }
}

export default auth
import UserModel from "../models/user.model.js"

export const admin = async (request, response, next) => {
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

        if (!user || user.role !== 'ADMIN') {
            return response.status(403).json({
                message: "Permission denied",
                error: true,
                success: false
            })
        }

        next()

    } catch (error) {
        return response.status(500).json({
            message: error.message || "Permission denied",
            error: true,
            success: false
        })
    }
}
