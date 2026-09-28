import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ExpiryEmailProps {
  to: string;
  userName: string;
  planName: string;
  daysLeft: number;
  expiryDate: string;
  renewUrl: string;
}

export async function sendExpiryReminderEmail({
  to,
  userName,
  planName,
  daysLeft,
  expiryDate,
  renewUrl,
}: ExpiryEmailProps) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Hafash <onboarding@resend.dev>',
      to: [to],
      subject: `⏰ Aapka Hafash ${planName} plan ${daysLeft} din mein expire hoga`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plan Expiry Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #111111; border-radius: 24px; border: 1px solid #1a1a1a; overflow: hidden;">
          
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #d4af37; font-style: italic; letter-spacing: -0.5px;">
                Hafash.pk
              </h1>
              <p style="margin: 8px 0 0; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 3px;">
                Deliver Memories Beautifully
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background: linear-gradient(90deg, transparent, #d4af37, transparent);"></div>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 24px; color: #ffffff; font-weight: 700; line-height: 1.3;">
                Assalam o Alaikum, ${userName} 👋
              </h2>
              
              <p style="margin: 0 0 24px; font-size: 15px; color: #b0b0b0; line-height: 1.7;">
                Aapka <strong style="color: #d4af37;">Hafash ${planName}</strong> plan 
                <strong style="color: #ff6b35;">${daysLeft} din</strong> mein expire ho raha hai.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1a1a1a; border-radius: 16px; border: 1px solid #2a2a2a; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Plan</span>
                          <p style="margin: 4px 0 0; font-size: 15px; color: #ffffff; font-weight: 600;">${planName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Expiry Date</span>
                          <p style="margin: 4px 0 0; font-size: 15px; color: #ffffff; font-weight: 600;">${expiryDate}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Days Left</span>
                          <p style="margin: 4px 0 0; font-size: 15px; color: #ff6b35; font-weight: 700;">${daysLeft} din</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px; font-size: 15px; color: #b0b0b0; line-height: 1.7;">
                Renew karein taake aapki <strong style="color: #ffffff;">galleries, uploads, aur Hafash Drive</strong> chalu rahein. 
                Plan expire hone par naye uploads band ho jayenge (aapki existing galleries clients ko dikhti rahengi).
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${renewUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37, #b8941f); color: #0a0a0a; text-decoration: none; padding: 16px 40px; border-radius: 14px; font-size: 15px; font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 10px 30px rgba(212, 175, 55, 0.3);">
                      Renew Plan Now →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; color: #666; line-height: 1.6; text-align: center;">
                Ya phir <a href="${renewUrl}" style="color: #d4af37; text-decoration: none;">hafash.pk/storage</a> par jayein
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 40px 40px; text-align: center; border-top: 1px solid #1a1a1a;">
              <p style="margin: 0; font-size: 11px; color: #444; line-height: 1.6;">
                © 2026 Hafash.pk — All rights reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error('[RESEND] Email error:', error);
      return { success: false, error: error.message };
    }

    console.log('[RESEND] ✅ Email sent:', data?.id);
    return { success: true, emailId: data?.id };
  } catch (err: any) {
    console.error('[RESEND] FATAL:', err);
    return { success: false, error: err.message };
  }
}