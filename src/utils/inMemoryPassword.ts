/**
 * In-memory password store.
 *
 * Holds the plaintext password for the current unlocked session.
 * Set by AppContext on unlock/setup; cleared on lock or page reload.
 * Read by services/agent.ts to encrypt/decrypt API keys without
 * threading the password through every component and function call.
 */

let _password: string | null = null;

export function setPassword(pw: string | null): void {
  _password = pw;
}

export function getPassword(): string | null {
  return _password;
}
