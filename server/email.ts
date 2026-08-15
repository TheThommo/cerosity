import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = "mark.e.s.thompson@gmail.com";
const FROM_EMAIL = "FLO <flo@cerosity.com>";

/**
 * The Resend SDK resolves with `{ data, error }` — it does not throw on a
 * rejected send. Awaiting it inside a try/catch therefore proved nothing: an
 * unverified sending domain came back as a perfectly ordinary resolved promise,
 * and all three of these functions logged that the mail had gone out.
 *
 * Every send goes through here so that cannot happen again. Returns the Resend
 * message id, which is the only thing that actually evidences a send.
 */
async function deliver(
  label: string,
  payload: Parameters<typeof resend.emails.send>[0]
): Promise<string> {
  const { data, error } = await resend.emails.send(payload);

  if (error) {
    // Resend's own words. "The domain is not verified" is a different problem
    // from a bad key or a rate limit, and the log is where that has to be legible.
    throw new Error(`Resend rejected ${label}: ${error.name ?? "error"} — ${error.message}`);
  }

  return data?.id ?? "(accepted, no id returned)";
}

export async function sendLeadRegistrationEmail(lead: {
  name?: string | null;
  email: string;
  source: string;
}) {
  try {
    const id = await deliver("the registration email", {
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
    console.log(`[EMAIL] Registration email accepted by Resend for ${lead.email} (id ${id})`);
  } catch (error: any) {
    console.error(`[EMAIL] Registration email NOT sent to ${lead.email}: ${error?.message || error}`);
  }
}

/**
 * Password reset link. Unlike the lead emails this one rethrows: the caller
 * still answers the athlete with the same generic message either way, so the
 * endpoint cannot be used to discover which addresses have accounts — but a
 * send failure has to reach the logs, or a reset that never arrived looks
 * identical to one that was never requested.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string, firstName?: string | null) {
  const id = await deliver("the password reset email", {
    from: FROM_EMAIL,
    to,
    subject: "Reset your Cerosity password",
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Reset your password</h1>
        </div>
        <div style="padding: 32px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p>Hey${firstName ? ` ${firstName}` : ''},</p>
          <p>Someone asked to reset the password on your Cerosity account. Tap below to choose a new one.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Choose a new password</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">This link works once and expires in 60 minutes.</p>
          <p style="color: #64748b; font-size: 14px;">If you didn't ask for this, you can ignore this email — your password stays as it is.</p>
          <p style="color: #94a3b8; font-size: 12px; word-break: break-all;">If the button doesn't work, paste this into your browser:<br>${resetUrl}</p>
        </div>
      </div>
    `,
  });
  // Recipient and message id only — the URL carries the reset token, and a
  // token in a log file is a token anyone with log access can spend.
  console.log(`[EMAIL] Password reset accepted by Resend for ${to} (id ${id})`);
}

export async function sendAdminLeadNotification(lead: {
  name?: string | null;
  email: string;
  source: string;
  sportIndustry?: string | null;
  businessName?: string | null;
}) {
  try {
    const id = await deliver("the admin lead notification", {
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
    console.log(`[EMAIL] Admin notification accepted by Resend for ${lead.email} (id ${id})`);
  } catch (error: any) {
    console.error(`[EMAIL] Admin notification NOT sent for ${lead.email}: ${error?.message || error}`);
  }
}
