const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

const userModelPath = require.resolve("../models/userModel");
let updatedUserPayload;
const userModelMock = {
  createUser: async () => {
    throw new Error("createUser should not be called for invalid payloads");
  },
  updateUser: async (userId, payload) => {
    updatedUserPayload = payload;
    return { USER_ID: userId };
  },
};
const userModelModule = new Module(userModelPath);
userModelModule.filename = userModelPath;
userModelModule.loaded = true;
userModelModule.exports = userModelMock;
require.cache[userModelPath] = userModelModule;

const userController = require("../controllers/userController");

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

const validCreatePayload = {
  loginType: "Member",
  firstName: "Test",
  lastName: "User",
  userName: "test@example.com",
  password: "New-Admin-Password-2026",
  confirmPassword: "New-Admin-Password-2026",
  email: "test@example.com",
  phoneNumber: "1234567890",
};

const validUpdatePayload = {
  firstName: "Test User",
  loginType: "Member",
  roleId: 20,
  status: "Active",
  email: "test@example.com",
  phoneNumber: "1234567890",
};

test("user creation requires department and rank", async () => {
  const departmentResponse = createResponse();
  await userController.createUser(
    { body: { ...validCreatePayload, rankId: 1 } },
    departmentResponse
  );
  assert.equal(departmentResponse.statusCode, 400);
  assert.equal(departmentResponse.payload.message, "Department is required");

  const rankResponse = createResponse();
  await userController.createUser(
    { body: { ...validCreatePayload, departmentId: 1 } },
    rankResponse
  );
  assert.equal(rankResponse.statusCode, 400);
  assert.equal(rankResponse.payload.message, "Rank is required");
});

test("user updates allow department and rank to be omitted", async () => {
  updatedUserPayload = null;
  const response = createResponse();
  await userController.updateUser(
    { params: { id: "1" }, body: validUpdatePayload },
    response
  );
  assert.equal(response.statusCode, 200);
  assert.equal(updatedUserPayload.departmentId, null);
  assert.equal(updatedUserPayload.rankId, null);
});
