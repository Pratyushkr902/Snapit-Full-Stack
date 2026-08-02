import jwt from 'jsonwebtoken'

// Like auth.js, but never blocks the request — just attaches req.userId
// if a valid token happens to be present. Used for endpoints guests can
// also access (e.g. support messages).
const optionalAuth = async (request, response, next) => {
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
            const decode = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN)
            if (decode?.id) {
                request.userId = decode.id
                request.userRole = decode.role
            }
        }
    } catch (error) {
        // Invalid/expired token — just proceed as a guest, don't block.
    }
    next()
}
export default optionalAuth
