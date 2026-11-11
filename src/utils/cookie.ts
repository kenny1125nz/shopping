/**
 * Cookie helpers for persisting the unlock password across browser sessions.
 *
 * SameSite=Strict prevents the cookie from being sent on cross-site requests
 * (CSRF protection). The password is NOT marked HttpOnly because the browser
 * needs to read it via JS — this is acceptable since the whole app is
 * client-side with no server to protect.
 *
 * Add "; Secure" to restrict to HTTPS-only origins if deploying publicly.
 */

const COOKIE_NAME = 'smartshop_nz_pw';
const MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export function savePasswordCookie(password: string): void {
  document.cookie = [
    `${COOKIE_NAME}=${encodeURIComponent(password)}`,
    `SameSite=Strict`,
    `max-age=${MAX_AGE}`,
    `path=/`,
  ].join('; ');
}

export function loadPasswordCookie(): string | null {
  const entry = document.cookie
    .split('; ')
    .find(c => c.startsWith(`${COOKIE_NAME}=`));
  return entry ? decodeURIComponent(entry.slice(COOKIE_NAME.length + 1)) : null;
}

export function clearPasswordCookie(): void {
  document.cookie = `${COOKIE_NAME}=; SameSite=Strict; max-age=0; path=/`;
}
