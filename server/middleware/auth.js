import jwt from 'jsonwebtoken'

const auth = async(request, response, next) => {
    try {
        let token = null

        // 1. Extract Bearer token from Authorization header
        const authHeader = request?.headers?.authorization || request?.headers?.Authorization
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1]
        }

        // 2. Cookie fallback lookups checking both casing schemas
        if (!token) {
            token = request.cookies?.accessToken || request.cookies?.accesstoken
        }

        if (!token) {
            return response.status(401).json({
                message: "Authentication token missing. Please log in again.",
                error:   true,
                success: false
            })
        }

        // ✅ FIX: Verify using your true environment string variables
        // We fallback check both SECRET_KEY_JWT and SECRET_KEY_ACCESS_TOKEN to be safe
        const secretKey = process.env.SECRET_KEY_JWT || process.env.SECRET_KEY_ACCESS_TOKEN;
        
        const decode = jwt.verify(token, secretKey)

        if (!decode) {
            return response.status(401).json({
                message: "Unauthorized access token validation failed.",
                error:   true,
                success: false
            })
        }

        // Pass the decoded user ID to the next controllers loop
        request.userId = decode.id
        next()

    } catch (error) {
        console.error("❌ [Auth Middleware Error]:", error.message);
        return response.status(401).json({
            message: "Session expired or invalid token. Please login again.",
            error:   true,
            success: false
        })
    }
}

export default auth