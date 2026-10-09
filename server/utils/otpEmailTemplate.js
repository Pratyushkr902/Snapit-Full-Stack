export function otpEmailTemplate({ otp, purpose = 'login', name = 'Customer', expiryMinutes = 10 }) {
  const isPasswordReset = purpose === 'reset' || purpose === 'forgot_password';
  const title = isPasswordReset ? 'Reset Your Password' : 'Verify Your Login';
  const subtitle = isPasswordReset 
    ? 'Use the One-Time Password (OTP) below to reset your Snapit account password.'
    : 'Use the One-Time Password (OTP) below to securely log in to your Snapit account.';

  const formattedOtp = String(otp || '').trim();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} · Snapit</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 480px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0;">
          
          <!-- Top Brand Header with Official Snapit Logo -->
          <tr>
            <td style="padding: 28px 32px 20px; border-bottom: 1px solid #f1f5f9;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="vertical-align: middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                          <img src="https://snapit.pages.dev/snapit-icon-192.png" alt="Snapit" width="44" height="44" style="display: block; width: 44px; height: 44px; border-radius: 12px; border: 0; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);" />
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.6px; line-height: 1.1;">
                            Snap<span style="color: #10b981;">it</span>
                          </div>
                          <div style="font-size: 11px; font-weight: 600; color: #64748b; letter-spacing: 0.4px; text-transform: uppercase; margin-top: 3px;">
                            Instant Grocery Delivery
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; color: #059669; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 20px; letter-spacing: 0.3px;">
                      ● Official OTP
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Email Content -->
          <tr>
            <td style="padding: 28px 32px 24px;">
              <h1 style="margin: 0 0 10px; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px;">
                ${title}
              </h1>
              
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
                Hello${name && name !== 'Customer' ? ` <strong>${name}</strong>` : ''},<br/>
                ${subtitle}
              </p>

              <!-- High-Visibility OTP Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #f0fdf4; border: 2px dashed #10b981; border-radius: 16px; margin: 0 0 24px;">
                <tr>
                  <td style="padding: 24px 16px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.8px; color: #059669; margin-bottom: 10px;">
                      Verification Code (OTP)
                    </div>
                    <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace; font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #064e3b; margin: 0; line-height: 1; padding-left: 12px;">
                      ${formattedOtp}
                    </div>
                    <div style="margin-top: 12px; font-size: 12px; font-weight: 700; color: #047857;">
                      ⏱️ Valid for ${expiryMinutes} minutes
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Advisory Notice -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0; font-size: 12.5px; line-height: 1.5; color: #92400e;">
                      <strong>🔒 Security Tip:</strong> Snapit support executives and delivery partners will <u>never</u> ask you for this code. Do not share it with anyone.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12.5px; line-height: 1.5; color: #64748b;">
                If you did not make this request, you can safely ignore this email. Your Snapit account remains secure.
              </p>
            </td>
          </tr>

          <!-- Clean Global Footer -->
          <tr>
            <td style="padding: 24px 32px 28px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 10px;">
                <tr>
                  <td style="vertical-align: middle; padding-right: 8px;">
                    <img src="https://snapit.pages.dev/snapit-icon-192.png" alt="Snapit" width="20" height="20" style="display: block; width: 20px; height: 20px; border-radius: 5px;" />
                  </td>
                  <td style="vertical-align: middle;">
                    <span style="font-size: 14px; font-weight: 800; color: #1e293b; letter-spacing: -0.3px;">
                      Snap<span style="color: #10b981;">it</span>
                    </span>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 6px; font-size: 12px; color: #64748b;">
                Fresh Groceries & Essentials Delivered in Minutes
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                Need help? Contact support at <a href="mailto:snapitxpress@gmail.com" style="color: #10b981; text-decoration: none; font-weight: 600;">snapitxpress@gmail.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export default otpEmailTemplate;
