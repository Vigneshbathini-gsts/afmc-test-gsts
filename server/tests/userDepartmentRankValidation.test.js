const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

const userModelPath = require.resolve("../models/userModel");
let updatedUserPayload;
let createdUserPayload;
const userModelMock = {
  createUser: async (payload) => {
    createdUserPayload = payload;
    return { USER_ID: 1 };
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

test("user creation allows department and rank to be omitted", async () => {
  createdUserPayload = null;
  const response = createResponse();
  await userController.createUser(
    { body: validCreatePayload },
    response
  );
  assert.equal(response.statusCode, 201);
  assert.equal(createdUserPayload.departmentId, null);
  assert.equal(createdUserPayload.rankId, null);
});

test("user creation accepts custom department and rank values", async () => {
  createdUserPayload = null;
  const response = createResponse();
  await userController.createUser(
    {
      body: {
        ...validCreatePayload,
        departmentId: "OTHER",
        rankId: "OTHER",
        otherDepartment: "Medical Research",
        otherRank: "Consultant",
      },
    },
    response
  );

  assert.equal(response.statusCode, 201);
  assert.equal(createdUserPayload.departmentId, null);
  assert.equal(createdUserPayload.rankId, null);
  assert.equal(createdUserPayload.otherDepartment, "Medical Research");
  assert.equal(createdUserPayload.otherRank, "Consultant");
});

test("custom department and rank are required when Others is selected", async () => {
  const response = createResponse();
  await userController.createUser(
    {
      body: {
        ...validCreatePayload,
        departmentId: "OTHER",
        rankId: "OTHER",
      },
    },
    response
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.payload.message, "Enter the department");
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

test("user updates accept and persist custom department and rank values", async () => {
  updatedUserPayload = null;
  const response = createResponse();
  await userController.updateUser(
    {
      params: { id: "1" },
      body: {
        ...validUpdatePayload,
        departmentId: "OTHER",
        rankId: "OTHER",
        otherDepartment: "Medical Research",
        otherRank: "Consultant",
      },
    },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(updatedUserPayload.departmentId, null);
  assert.equal(updatedUserPayload.rankId, null);
  assert.equal(updatedUserPayload.otherDepartment, "Medical Research");
  assert.equal(updatedUserPayload.otherRank, "Consultant");
});

test("user updates require a custom value for each selected Others option", async () => {
  const response = createResponse();
  await userController.updateUser(
    {
      params: { id: "1" },
      body: {
        ...validUpdatePayload,
        departmentId: "OTHER",
        rankId: "OTHER",
        otherDepartment: "Medical Research",
      },
    },
    response
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.payload.message, "Enter the rank");
});
