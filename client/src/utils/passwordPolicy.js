const commonPasswords = new Set([
  "password1234",
  "password12345",
  "qwerty123456",
  "admin1234567",
  "welcome12345",
  "letmein12345",
]);

export const getPasswordPolicyError = (password, confirmation, minLength = 6) => {
  if (typeof password !== "string" || password.length < minLength) {
    return `Password must be at least ${minLength} characters.`;
  }
  if (new TextEncoder().encode(password).length > 72) {
    return "Password must be no more than 72 UTF-8 bytes.";
  }
  if (commonPasswords.has(password.toLowerCase())) {
    return "Choose a less common password.";
  }
  if (confirmation !== undefined && password !== confirmation) {
    return "Password and confirmation do not match.";
  }
  return null;
};
