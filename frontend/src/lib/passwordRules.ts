/** Return a validation message when a new password fails the account rules. */
export function validateNewPassword(password: string): string | null {
  if (password.length < 8 || password.length > 72) {
    return "Password must be between 8 and 72 characters.";
  }
  if (!password.trim()) {
    return "Password cannot contain only spaces.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include an uppercase letter.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include a lowercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include a number.";
  }
  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return "Password must include a symbol.";
  }
  return null;
}