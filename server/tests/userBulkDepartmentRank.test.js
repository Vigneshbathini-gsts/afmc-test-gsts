const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

const userInsertParams = [];
const connection = {
  beginTransaction: async () => {},
  commit: async () => {},
  rollback: async () => {},
  release: () => {},
  execute: async (query, params = []) => {
    if (query.includes("SELECT DEPARTMENT_ID, DEPARTMENT_NAME")) {
      return [[{ DEPARTMENT_ID: 1, DEPARTMENT_NAME: "Administration" }]];
    }
    if (query.includes("SELECT RANK_ID, RANK_NAME")) {
      return [[{ RANK_ID: 2, RANK_NAME: "Captain" }]];
    }
    if (query.includes("UPPER(FIRST_NAME)")) return [[]];
    if (query.includes("UPPER(USER_NAME)")) return [[]];
    if (query.includes("FROM xxafmc_role")) {
      return [[{ ROLE_ID: 20, ROLE: "END USER" }]];
    }
    if (query.includes("COALESCE(MAX(OFFICER_ID)")) {
      return [[{ nextOfficerId: 10 }]];
    }
    if (query.includes("COALESCE(MAX(USER_ID)")) {
      return [[{ nextUserId: 20 }]];
    }
    if (query.includes("INSERT INTO xxafmc_users")) {
      userInsertParams.push(params);
    }
    return [{ affectedRows: 1 }];
  },
};

const dbPath = require.resolve("../config/db");
const dbModule = new Module(dbPath);
dbModule.filename = dbPath;
dbModule.loaded = true;
dbModule.exports = { getConnection: async () => connection };
require.cache[dbPath] = dbModule;

const authHelperPath = require.resolve("../helpers/authHelper");
const authHelperModule = new Module(authHelperPath);
authHelperModule.filename = authHelperPath;
authHelperModule.loaded = true;
authHelperModule.exports = {
  hashPassword: async (password) => `hashed:${password}`,
};
require.cache[authHelperPath] = authHelperModule;

const userModel = require("../models/userModel");

test("bulk upload stores catalog matches as IDs and unlisted values per user", async () => {
  userInsertParams.length = 0;

  const result = await userModel.createBulkUsers({
    createdBy: "SYSTEM",
    rows: [
      {
        loginType: "END USER",
        fullName: "Catalog User",
        firstName: "Catalog",
        lastName: "User",
        userName: "catalog@example.com",
        password: "password",
        email: "catalog@example.com",
        phoneNumber: "1234567890",
        departmentName: " administration ",
        rankName: "CAPTAIN",
      },
      {
        loginType: "END USER",
        fullName: "Custom User",
        firstName: "Custom",
        lastName: "User",
        userName: "custom@example.com",
        password: "password",
        email: "custom@example.com",
        phoneNumber: "1234567890",
        departmentName: "Research Services",
        rankName: "Flight Surgeon",
      },
    ],
  });

  assert.equal(result.insertedCount, 2);
  assert.deepEqual(userInsertParams[0].slice(18), [1, 2, null, null]);
  assert.deepEqual(userInsertParams[1].slice(18), [
    null,
    null,
    "Research Services",
    "Flight Surgeon",
  ]);
});
