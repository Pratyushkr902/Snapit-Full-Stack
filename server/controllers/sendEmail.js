import * as Brevo from '@getbrevo/brevo';
import dotenv from 'dotenv';
dotenv.config();

const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.authentications['apiKey'].apiKey = process.env.BREVO_API_KEY;

const sendEmail = async ({ sendTo, subject, html }) => {
    try {
        const sendSmtpEmail = new Brevo.SendSmtpEmail();
        sendSmtpEmail.to = [{ email: sendTo }];
        sendSmtpEmail.sender = { name: 'Snapit', email: 'snapitxpress@gmail.com' };
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.htmlContent = html;

        const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('✅ Email sent:', result.messageId);
        return result;
    } catch (error) {
        console.error('🚨 Email failed:', error.message);
        return null; // don't throw — registration succeeds even if email fails
    }
}

export default sendEmail;