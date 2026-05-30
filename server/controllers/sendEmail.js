import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,  // snapitxpress@gmail.com
        pass: process.env.EMAIL_PASS   // Gmail App Password (16 chars)
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
        console.error("🚨 Email Transport Failure:", error.message);
        throw error;
    }
}

export default sendEmail;