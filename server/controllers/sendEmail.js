import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async ({ sendTo, subject, html }) => {
    try {
        const info = await transporter.sendMail({
            from: `Snapit <${process.env.EMAIL_USER}>`,
            to: sendTo,
            subject: subject,
            html: html,
        });
        console.log("✅ Email sent:", info.messageId);
        return info;
    } catch (error) {
        console.error("🚨 Email failed:", error.message);
        return null; // don't throw — registration/OTP succeeds even if email fails
    }
}

export default sendEmail;