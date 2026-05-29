import UserModel from '../models/user.model.js'

const updateStreak = async (userId) => {
    const user = await UserModel.findById(userId)
    if (!user) return

    const now = new Date()
    const todayStr = now.toDateString()
    const lastOrderStr = user.lastOrderDate ? new Date(user.lastOrderDate).toDateString() : null
    const yesterdayStr = new Date(now - 86400000).toDateString()

    if (lastOrderStr === todayStr) {
        // Already ordered today — no streak change
        return
    } else if (lastOrderStr === yesterdayStr) {
        // Consecutive day — increment streak
        user.currentStreak += 1
    } else {
        // Streak broken or first order ever
        user.currentStreak = 1
    }

    user.lastOrderDate = now
    await user.save()
}

export default updateStreak