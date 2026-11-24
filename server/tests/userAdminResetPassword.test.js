const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

const dbPath = require.resolve("../config/db");
const dbMock = {
  execute: async () => [{ affectedRows: 1 }],
};
const dbModule = new Module(dbPath);
dbModule.filename = dbPath;
dbModule.loaded = true;
dbModule.exports = dbMock;
require.cache[dbPath] = dbModule;

const userController = require("../controllers/userController");
const { comparePassword } = require("../helpers/authHelper");

const createResponse = () => ({
  statusCode: null,
  payload: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.payload = payload;
    return this;
  },
});

test("admin reset stores a password hash and invalidates existing reset tokens", async () => {
  let executedQuery;
  let executedParams;
  dbMock.execute = async (query, params) => {
    executedQuery = query;
    executedParams = params;
    return [{ affectedRows: 1 }];
  };

  const response = createResponse();
  const password = "New-Admin-Password-2026";

  await userController.resetUserPassword(
    {
      params: { id: "42" },
      body: { newPassword: password, confirmPassword: password },
    },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.success, true);
  assert.doesNotMatch(executedQuery, /SELECT/i);
  assert.match(executedQuery, /RESET_TOKEN\s*=\s*NULL/i);
  assert.match(executedQuery, /RESET_EXPIRY\s*=\s*NULL/i);
  assert.match(executedQuery, /REQUIRED_PASSWORD_CHANGE\s*=\s*'N'/i);
  assert.match(executedQuery, /ROLE_ID NOT IN \(50, 60, 70\)/i);
  assert.equal(executedParams[1], "42");
  assert.deepEqual(await comparePassword(password, executedParams[0]), {
    valid: true,
    legacy: false,
  });
  assert.equal(JSON.stringify(response.payload).includes(password), false);
});

test("admin reset rejects mismatched passwords without updating the user", async () => {
  let updateAttempted = false;
  dbMock.execute = async () => {
    updateAttempted = true;
    return [{ affectedRows: 1 }];
  };

  const response = createResponse();
  await userController.resetUserPassword(
    {
      params: { id: "42" },
      body: {
        newPassword: "New-Admin-Password-2026",
        confirmPassword: "Different-Password-2026",
      },
    },
    response
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.payload.success, false);
  assert.match(response.payload.message, /do not match/i);
  assert.equal(updateAttempted, false);
});
