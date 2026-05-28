import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

// ✅ Dual-check standard naming variations to prevent configuration mismatches
const apiKey = process.env.RESEND_API || process.env.RESEND_API_KEY;

if (!apiKey) {
    console.log("🚨 WARNING: Provide RESEND_API or RESEND_API_KEY inside your environment configurations.");
}

const resend = new Resend(apiKey);

const sendEmail = async ({ sendTo, subject, html }) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Snapit <onboarding@resend.dev>',
            to: sendTo,  // ✅ use actual recipient
            subject: subject,
            html: html,
        });

        if (error) {
            console.error("🚨 Resend Provider Validation Rejection:", error);
            throw new Error(error.message || "Resend failed to validate email payload.");
        }

        return data;
    } catch (error) {
        console.error("🚨 Core Email Transport Failure:", error.message);
        throw error; // ✅ Crucial: Throw the error so your controller catches it and alerts your UI
    }
}

export default sendEmail;