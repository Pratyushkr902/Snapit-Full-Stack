import { Resend } from 'resend'
import sendEmailBrevo from './sendEmail.js'

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
            console.warn('🚨 Resend returned error, falling back to Brevo:', JSON.stringify(error))
            return await sendEmailBrevo({ sendTo, subject, html })
        }
        console.log('✅ OTP email sent via Resend:', data?.id)
        return data
    } catch (error) {
        console.warn('🚨 Resend exception, falling back to Brevo:', error.message)
        try {
            return await sendEmailBrevo({ sendTo, subject, html })
        } catch (brevoErr) {
            console.error('🚨 Brevo fallback also failed:', brevoErr.message)
            return null
        }
    }
}
export default sendEmailResend

