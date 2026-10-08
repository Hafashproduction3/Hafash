import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface PaymentReceiptProps {
  to: string;
  userName: string;
  planName: string;
  amount: number;
  orderId: string;
  paymentDate: string;
}

export async function sendPaymentReceiptEmail({
  to,
  userName,
  planName,
  amount,
  orderId,
  paymentDate,
}: PaymentReceiptProps) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Hafash <onboarding@resend.dev>',
      to: [to],
      subject: `✅ Payment Received — Hafash ${planName} Plan`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hafash Payment Receipt</title>
</head>

<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0a0a0a;padding:40px 20px;">
<tr>
<td align="center">

<table role="presentation" cellpadding="0" cellspacing="0" width="600"
style="max-width:600px;background:#111;border-radius:24px;border:1px solid #1a1a1a;overflow:hidden;">

<tr>
<td style="padding:40px 40px 20px;text-align:center;">
  <h1 style="margin:0;font-size:28px;font-weight:700;color:#d4af37;font-style:italic;">
    Hafash.pk
  </h1>

  <p style="margin:8px 0 0;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:3px;">
    Payment Receipt
  </p>
</td>
</tr>

<tr>
<td style="padding:0 40px;">
  <div style="height:1px;background:#d4af37;"></div>
</td>
</tr>

<tr>
<td style="padding:40px;">

<h2 style="margin:0 0 20px;font-size:24px;color:#fff;">
  Assalam o Alaikum, ${userName} 👋
</h2>

<p style="margin:0 0 24px;font-size:15px;color:#b0b0b0;line-height:1.7;">
  Your payment has been successfully received and your Hafash plan has been activated.
</p>

<table role="presentation" cellpadding="0" cellspacing="0" width="100%"
style="background:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;margin-bottom:24px;">

<tr>
<td style="padding:24px;">

<table role="presentation" cellpadding="0" cellspacing="0" width="100%">

<tr>
<td style="padding:9px 0;color:#777;font-size:11px;text-transform:uppercase;letter-spacing:1px;">
Plan
</td>
<td align="right" style="padding:9px 0;color:#fff;font-size:15px;font-weight:600;">
${planName}
</td>
</tr>

<tr>
<td style="padding:9px 0;color:#777;font-size:11px;text-transform:uppercase;letter-spacing:1px;">
Amount Paid
</td>
<td align="right" style="padding:9px 0;color:#d4af37;font-size:18px;font-weight:700;">
PKR ${amount.toLocaleString()}
</td>
</tr>

<tr>
<td style="padding:9px 0;color:#777;font-size:11px;text-transform:uppercase;letter-spacing:1px;">
Status
</td>
<td align="right" style="padding:9px 0;color:#4ade80;font-size:14px;font-weight:700;">
PAID
</td>
</tr>

<tr>
<td style="padding:9px 0;color:#777;font-size:11px;text-transform:uppercase;letter-spacing:1px;">
Payment Date
</td>
<td align="right" style="padding:9px 0;color:#fff;font-size:14px;">
${paymentDate}
</td>
</tr>

<tr>
<td style="padding:9px 0;color:#777;font-size:11px;text-transform:uppercase;letter-spacing:1px;">
Order ID
</td>
<td align="right" style="padding:9px 0;color:#b0b0b0;font-size:12px;word-break:break-all;">
${orderId}
</td>
</tr>

</table>

</td>
</tr>
</table>

<p style="margin:0 0 24px;font-size:14px;color:#b0b0b0;line-height:1.7;">
Thank you for choosing Hafash.pk for your photography workflow.
Your subscription is now active.
</p>

<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
<tr>
<td align="center">

<a href="https://hafash.pk/dashboard"
style="display:inline-block;background:#d4af37;color:#0a0a0a;text-decoration:none;padding:15px 35px;border-radius:14px;font-size:14px;font-weight:700;">
Open Hafash Dashboard →
</a>

</td>
</tr>
</table>

</td>
</tr>

<tr>
<td style="padding:24px 40px 40px;text-align:center;border-top:1px solid #1a1a1a;">

<p style="margin:0;font-size:11px;color:#444;line-height:1.6;">
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
      console.error('[RESEND] Payment receipt error:', error);
      return { success: false, error: error.message };
    }

    console.log('[RESEND] ✅ Payment receipt sent:', data?.id);
    return { success: true, emailId: data?.id };
  } catch (err: any) {
    console.error('[RESEND] Payment receipt fatal:', err);
    return { success: false, error: err.message };
  }
}
