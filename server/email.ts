// Outbound transactional mail, via Postmark.
//
// Postmark's HTTP API is used directly rather than the SDK: one POST with three
// headers is the whole integration, and it keeps a dependency out of the tree.
//
// Never log the reset URL. It carries the reset token, and a token in a log
// file is a token anyone with log access can spend.

const POSTMARK_ENDPOINT = "https://api.postmarkapp.com/email";
const ADMIN_EMAIL = "mark.e.s.thompson@gmail.com";
const FROM_EMAIL = "FLO <flo@cerosity.com>";

/** Postmark separates transactional from bulk; coaching mail is transactional. */
const MESSAGE_STREAM = process.env.POSTMARK_MESSAGE_STREAM || "outbound";

/**
 * The single place a message is handed to Postmark.
 *
 * Postmark signals failure two different ways and both have to be checked: a
 * non-2xx status, and a 200 carrying a non-zero `ErrorCode`. Treating "the call
 * returned" as "the mail was sent" is exactly how the previous provider hid an
 * unverified sending domain behind a success log.
 *
 * Returns the Postmark MessageID, which is the only thing that evidences a send.
 */
async function deliver(
  label: string,
  message: { to: string; cc?: string; subject: string; html: string }
): Promise<string> {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) {
    throw new Error(`POSTMARK_SERVER_TOKEN is not set — ${label} was not sent`);
  }

  const response = await fetch(POSTMARK_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify({
      From: FROM_EMAIL,
      To: message.to,
      ...(message.cc ? { Cc: message.cc } : {}),
      Subject: message.subject,
      HtmlBody: message.html,
      MessageStream: MESSAGE_STREAM,
    }),
  });

  const body: any = await response.json().catch(() => ({}));

  if (!response.ok || (body?.ErrorCode ?? 0) !== 0) {
    // Postmark's own words. "Signature not confirmed" is a different problem
    // from a bad token or a rate limit, and the log is where that has to be
    // legible enough to act on without guessing.
    throw new Error(
      `Postmark rejected ${label}: HTTP ${response.status} ErrorCode ${body?.ErrorCode ?? "?"} — ${body?.Message ?? "no message returned"}`
    );
  }

  return body?.MessageID ?? "(accepted, no id returned)";
}

export async function sendLeadRegistrationEmail(lead: {
  name?: string | null;
  email: string;
  source: string;
}) {
  try {
    const id = await deliver("the registration email", {
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
    console.log(`[EMAIL] Registration email accepted by Postmark for ${lead.email} (id ${id})`);
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
  // Recipient and message id only — never the URL, which carries the token.
  console.log(`[EMAIL] Password reset accepted by Postmark for ${to} (id ${id})`);
}

/**
 * Athlete-authored text ends up inside an HTML body, so it is escaped rather
 * than interpolated raw. The lead emails above only ever carry values the
 * athlete typed into short form fields; this one carries a free-text message.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * A request from an entitled athlete to their human coach.
 *
 * This rethrows. The three human-coaching endpoints used to answer "sent" while
 * doing nothing at all, and an unreported Postmark rejection would be the same
 * lie wearing a different hat — the caller turns a throw into a non-200 so the
 * athlete is told their message did not go.
 */
export async function sendCoachingRequestEmail(request: {
  coachEmail: string;
  coachName: string;
  kind: string;
  athleteName: string;
  athleteEmail: string;
  body: string;
}): Promise<string> {
  const id = await deliver("the coaching request", {
    to: request.coachEmail,
    // Mark sees every request while this is one coach and a handful of athletes.
    cc: ADMIN_EMAIL,
    subject: `Cerosity — ${request.kind} from ${request.athleteName}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${escapeHtml(request.kind)}</h1>
        </div>
        <div style="padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p>Hi ${escapeHtml(request.coachName)},</p>
          <p><strong>${escapeHtml(request.athleteName)}</strong> (${escapeHtml(request.athleteEmail)}) has sent you a request through Cerosity.</p>
          <div style="margin: 16px 0; padding: 16px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(request.body)}</div>
          <p style="color: #64748b; font-size: 14px;">Reply straight to ${escapeHtml(request.athleteEmail)} — Cerosity does not host this conversation yet.</p>
        </div>
      </div>
    `,
  });
  console.log(
    `[EMAIL] Coaching request (${request.kind}) accepted by Postmark for ${request.coachEmail} (id ${id})`
  );
  return id;
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
    console.log(`[EMAIL] Admin notification accepted by Postmark for ${lead.email} (id ${id})`);
  } catch (error: any) {
    console.error(`[EMAIL] Admin notification NOT sent for ${lead.email}: ${error?.message || error}`);
  }
}
