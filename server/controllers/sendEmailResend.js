import { Resend } from 'resend'

let resend = null
function getResendClient() {
    if (!resend) {
        if (!process.env.RESEND_API_KEY) {
            throw new Error('Missing RESEND_API_KEY in .env')
        }
        resend = new Resend(process.env.RESEND_API_KEY)
    }
    return resend
}

const sendEmailResend = async ({ sendTo, subject, html }) => {
    try {
        const client = getResendClient()
        const { data, error } = await client.emails.send({
            from: 'Snapit <otp@jovialflames.com>',
            to: [sendTo],
            replyTo: 'snapitxpress@gmail.com',
            subject,
            html,
        })
        if (error) {
            console.error('🚨 Resend error:', JSON.stringify(error))
            return null
        }
        console.log('✅ OTP email sent via Resend:', data?.id)
        return data
    } catch (error) {
        console.error('🚨 Resend failed:', error.message)
        return null
    }
}
export default sendEmailResend
