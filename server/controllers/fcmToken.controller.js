import UserModel from '../models/user.model.js'

// Called from frontend when user opens app — saves their device token
export async function saveFcmToken(request, response) {
    try {
        const userId = request.userId
        const { fcmToken } = request.body

        if (!fcmToken) {
            return response.status(400).json({
                message: "fcmToken is required",
                error: true,
                success: false
            })
        }

        await UserModel.findByIdAndUpdate(userId, { fcmToken })

        return response.json({
            message: "FCM token saved",
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}