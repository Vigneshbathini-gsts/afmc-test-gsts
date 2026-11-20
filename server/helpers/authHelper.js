const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const COMMON_PASSWORDS = new Set([
  "password1234",
  "password12345",
  "qwerty123456",
  "admin1234567",
  "welcome12345",
  "letmein12345",
]);

const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const hashPassword = (password) => bcrypt.hash(password, 12);

const validatePassword = (password, confirmPassword) => {
  if (typeof password !== "string" || password.length < 12) {
    return "Password must be at least 12 characters";
  }

  if (Buffer.byteLength(password, "utf8") > 72) {
    return "Password must be no more than 72 bytes";
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return "Choose a less common password";
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return "Password and confirmation do not match";
  }

  return null;
};

const comparePassword = async (plainPassword, storedPassword) => {
  if (!plainPassword || !storedPassword) return { valid: false, legacy: false };
  if (/^\$2[aby]?\$\d{2}\$/.test(storedPassword)) {
    return { valid: await bcrypt.compare(plainPassword, storedPassword), legacy: false };
  }

  const legacyHash = crypto.createHash("md5").update(plainPassword).digest("hex").toUpperCase();
  const candidate = String(storedPassword).toUpperCase();
  return {
    valid: candidate.length === legacyHash.length &&
      crypto.timingSafeEqual(Buffer.from(legacyHash), Buffer.from(candidate)),
    legacy: true,
  };
};

module.exports = {
  generateResetToken,
  hashResetToken,
  hashPassword,
  validatePassword,
  comparePassword,
};

