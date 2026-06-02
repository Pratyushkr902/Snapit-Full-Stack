import jwt from 'jsonwebtoken'

// ✅ FIXED: accepts role param and includes it in JWT payload
const generatedAccessToken = async(userId, role)=>{
    const token = await jwt.sign(
        { id: userId, role: role },
        process.env.SECRET_KEY_ACCESS_TOKEN,
        { expiresIn : '1h'}
    )

    return token
}

export default generatedAccessToken