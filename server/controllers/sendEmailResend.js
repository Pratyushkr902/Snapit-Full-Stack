import sendEmailBrevo from './sendEmail.js'
import { Resend } from 'resend'

let resend = null
function getResendClient() {
    if (!resend && process.env.RESEND_API_KEY) {
        resend = new Resend(process.env.RESEND_API_KEY)
    }
    return resend
}

const sendEmailResend = async ({ sendTo, subject, html }) => {
    try {
        if (!sendTo || typeof sendTo !== 'string') return null;
        const cleanTo = sendTo.trim().toLowerCase();

        // Skip synthetic / placeholder mobile-login emails
        if (cleanTo.endsWith('@snapit.in') || cleanTo.endsWith('@example.com') || cleanTo.endsWith('@localhost')) {
            console.log(`ℹ️ [sendEmail] Skipping synthetic email recipient: ${cleanTo}`);
            return null;
        }

        // 1. Primary Email Dispatch via Brevo (snapitxpress@gmail.com — zero domain renewal dependency)
        try {
            const brevoResult = await sendEmailBrevo({ sendTo, subject, html })
            if (brevoResult && (brevoResult.id || brevoResult.messageId)) {
                return brevoResult
            }
        } catch (brevoErr) {
            console.warn('⚠️ Brevo dispatch error, checking fallback:', brevoErr.message)
        }

        // 2. Optional secondary fallback via Resend (if configured)
        if (process.env.RESEND_API_KEY) {
            try {
                const fromEmail = process.env.RESEND_FROM_EMAIL || 'Snapit <otp@jovialflames.com>'
                const replyToEmail = process.env.RESEND_REPLY_TO || 'snapitxpress@gmail.com'

                const client = getResendClient()
                if (client) {
                    const { data, error } = await client.emails.send({
                        from: fromEmail,
                        to: [sendTo],
                        replyTo: replyToEmail,
                        subject,
                        html,
                    })
                    if (!error && data?.id) {
                        console.log('✅ OTP email sent via Resend fallback:', data.id)
                        return data
                    }
                }
            } catch (resendErr) {
                console.warn('⚠️ Resend fallback failed:', resendErr.message)
            }
        }

        return null
    } catch (error) {
        console.error('🚨 [sendEmail] Fatal error dispatching email:', error.message)
        return null
    }
}
export default sendEmailResend

