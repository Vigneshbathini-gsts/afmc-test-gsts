const test = require("node:test");
const assert = require("node:assert/strict");
const { hashPassword, comparePassword, validatePassword } = require("../helpers/authHelper");

test("validatePassword enforces length, bcrypt byte limit, common-password, and confirmation rules", () => {
  assert.equal(validatePassword("short"), "Password must be at least 6 characters");
  assert.equal(validatePassword("Good-6"), null);
  assert.equal(validatePassword("a".repeat(73)), "Password must be no more than 72 bytes");
  assert.equal(validatePassword("Password1234"), "Choose a less common password");
  assert.equal(validatePassword("Good-Phrase-2026", "Different-Phrase"), "Password and confirmation do not match");
  assert.equal(validatePassword("Good-Phrase-2026", "Good-Phrase-2026"), null);
});

test("new passwords are stored as bcrypt hashes and compare as non-legacy", async () => {
  const hash = await hashPassword("Good-Phrase-2026");

  assert.match(hash, /^\$2[aby]\$/);
  assert.deepEqual(await comparePassword("Good-Phrase-2026", hash), {
    valid: true,
    legacy: false,
  });
  assert.deepEqual(await comparePassword("wrong-password", hash), {
    valid: false,
    legacy: false,
  });
});
