import jwt from 'jsonwebtoken'

const auth = async(request, response, next) => {
    try {
        // FIX: Check Authorization header first, then cookies
        let token = null

        // Method 1: Bearer token from Authorization header (used by frontend)
        const authHeader = request?.headers?.authorization
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1]
        }

        // Method 2: Cookie fallback
        if (!token) {
            token = request.cookies?.accessToken
        }

        if (!token) {
            return response.status(401).json({
                message: "Provide token",
                error:   true,
                success: false
            })
        }

        const decode = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN)

        if (!decode) {
            return response.status(401).json({
                message: "Unauthorized access",
                error:   true,
                success: false
            })
        }

        request.userId = decode.id
        next()

    } catch (error) {
        return response.status(401).json({
            message: "You are not logged in. Please login again.",
            error:   true,
            success: false
        })
    }
}

export default auth