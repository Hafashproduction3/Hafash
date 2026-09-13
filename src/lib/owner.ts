/**
 * Hafash Owner Account
 * Used to give the app owner's own account unlimited access without
 * going through Safepay checkout.
 */

const OWNER_EMAILS = ['hafashgroup60@gmail.com'];

export function isOwnerAccount(email?: string | null): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.toLowerCase().trim());
}