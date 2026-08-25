// server/utils/emailNormalize.js
// Anti-Abuse Email Normalization & Disposable Domain Detector

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'guerrillamail.com',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'getnada.com',
  'mohmal.com',
  'dispostable.com',
  'crazymailing.com',
  'throwawaymail.com',
  'fakeinbox.com',
  'burnermail.io'
]);

/**
 * Normalizes email address by:
 * 1. Lowercasing & trimming
 * 2. Removing dots (.) from Gmail/Googlemail usernames (e.g. j.o.h.n -> john)
 * 3. Removing '+' aliases from Gmail/Googlemail (e.g. john+ref1 -> john)
 * 4. Normalizing googlemail.com to gmail.com
 */
export function normalizeEmail(rawEmail) {
  if (!rawEmail || typeof rawEmail !== 'string') return '';
  const trimmed = rawEmail.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex === -1) return trimmed;

  let local = trimmed.slice(0, atIndex);
  let domain = trimmed.slice(atIndex + 1);

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    domain = 'gmail.com';
    local = local.split('+')[0];
    local = local.replace(/\./g, '');
  } else if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com') {
    local = local.split('+')[0];
  }

  return `${local}@${domain}`;
}

/**
 * Checks if the email domain is a known temporary/disposable spam service
 */
export function isDisposableEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  return DISPOSABLE_DOMAINS.has(domain);
}
