/**
 * Addresses are stored and compared lowercased. Without this an athlete handed
 * "Sarah.Guerra1981@gmail.com" could not sign in by typing it in lower case,
 * because the lookup was an exact string match.
 */
export function normalizeEmail(raw: string | null | undefined): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}
