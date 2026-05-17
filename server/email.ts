import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = "mark.e.s.thompson@gmail.com";
const FROM_EMAIL = "FLO <flo@cerosity.com>";

export async function sendLeadRegistrationEmail(lead: {
  name?: string | null;
  email: string;
  source: string;
}) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: lead.email,
      subject: "Welcome to Cerosity — Your Red2Blue Journey Starts Here",
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
          <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Cerosity</h1>
            <p style="color: #bfdbfe; margin: 8px 0 0;">AI Mental Performance Coaching</p>
          </div>
          <div style="padding: 32px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p>Hey${lead.name ? ` ${lead.name}` : ''},</p>
            <p>Thanks for your interest in Cerosity. You've taken the first step toward mastering your mental game.</p>
            <p>FLO — your AI mental performance coach — is ready to help you shift from Red Head to Blue Head using the proven Red2Blue methodology.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="https://cerosity.com" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Talk to FLO Now</a>
            </div>
            <p style="color: #64748b; font-size: 14px;">You're receiving this because you signed up via ${lead.source} on cerosity.com.</p>
          </div>
        </div>
      `,
    });
    console.log(`[EMAIL] Registration email sent to ${lead.email}`);
  } catch (error) {
    console.error(`[EMAIL] Failed to send registration email:`, error);
  }
}

export async function sendAdminLeadNotification(lead: {
  name?: string | null;
  email: string;
  source: string;
  sportIndustry?: string | null;
  businessName?: string | null;
}) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `New Cerosity Lead: ${lead.name || lead.email} (${lead.source})`,
      html: `
        <div style="font-family: -apple-system, sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="margin: 0 0 16px;">New Lead Captured</h2>
          <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 8px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Name</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${lead.name || '—'}</td></tr>
            <tr><td style="padding: 8px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Email</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${lead.email}</td></tr>
            <tr><td style="padding: 8px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Source</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${lead.source}</td></tr>
            <tr><td style="padding: 8px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Sport</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${lead.sportIndustry || '—'}</td></tr>
            <tr><td style="padding: 8px; font-weight: 600;">Business</td><td style="padding: 8px;">${lead.businessName || '—'}</td></tr>
          </table>
          <p style="margin-top: 16px;"><a href="https://hq.cerosity.com/console">View in HQ Console</a></p>
        </div>
      `,
    });
    console.log(`[EMAIL] Admin notification sent for ${lead.email}`);
  } catch (error) {
    console.error(`[EMAIL] Failed to send admin notification:`, error);
  }
}
