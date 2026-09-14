const sendEmail = async ({ sendTo, subject, html }) => {
    try {
        if (!sendTo || typeof sendTo !== 'string') return null;
        const cleanTo = sendTo.trim().toLowerCase();

        // Skip synthetic / placeholder mobile-login emails (e.g. 8102298726@snapit.in)
        // because snapit.in has no mail server and causes Brevo connection timeout / deferred logs.
        if (cleanTo.endsWith('@snapit.in') || cleanTo.endsWith('@example.com') || cleanTo.endsWith('@localhost')) {
            console.log(`ℹ️ [sendEmail] Skipping synthetic email recipient: ${cleanTo}`);
            return null;
        }

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.BREVO_API_KEY
            },
            body: JSON.stringify({
                sender: { name: 'Snapit', email: 'snapitxpress@gmail.com' },
                to: [{ email: sendTo }],
                subject: subject,
                htmlContent: html
            })
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('🚨 Brevo error:', JSON.stringify(data));
            return null;
        }
        console.log('✅ Email sent:', data.messageId);
        return data;
    } catch (error) {
        console.error('🚨 Email failed:', error.message);
        return null; // don't throw — registration succeeds even if email fails
    }
}
export default sendEmail;
