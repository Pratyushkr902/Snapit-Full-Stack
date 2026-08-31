import jwt from 'jsonwebtoken'

// Mobile-first session: Access token valid for 30 days
const generatedAccessToken = async(userId, role)=>{
    const token = await jwt.sign(
        { id: userId, role: role },
        process.env.SECRET_KEY_ACCESS_TOKEN,
        { expiresIn : '30d'}
    )

    return token
}

export default generatedAccessToken