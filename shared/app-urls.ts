/**
 * Base URL for links we send people to from outside the app (reset emails,
 * welcome CTAs, webhook callbacks).
 *
 * The apex domain only redirects its bare root — every deep link under
 * https://cerosity.com answers 404, so a reset email built on the apex hands the
 * athlete a link that cannot load the form. Everything must go to the www host,
 * and an APP_BASE_URL accidentally set to the apex is corrected rather than
 * obeyed, so the outage cannot come back through configuration.
 */
export const DEFAULT_APP_BASE_URL = "https://www.cerosity.com";

const APEX_HOST = "cerosity.com";

export function resolveAppBaseUrl(configured?: string | null): string {
  const raw = typeof configured === "string" ? configured.trim() : "";
  if (!raw) return DEFAULT_APP_BASE_URL;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return DEFAULT_APP_BASE_URL;
  }

  if (url.hostname === APEX_HOST) return DEFAULT_APP_BASE_URL;

  return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
}

export function passwordResetUrl(token: string, configured?: string | null): string {
  return `${resolveAppBaseUrl(configured)}/reset-password?token=${encodeURIComponent(token)}`;
}
