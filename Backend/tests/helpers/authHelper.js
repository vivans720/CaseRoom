const request = require("supertest");
const EmployeeRecord = require("../../src/models/EmployeeRecord");


const defaultUserData = {
  employeeId: "EMP001",
  name: "Vivan",
  email: "vivan@gmail.com",
  phone: "1234567890",
  password: "Password123",
};

const createTestUser = async (app, overrides = {}) => {
  const userData = { ...defaultUserData, ...overrides };

  // 1. Seed EmployeeRecord if it doesn't exist
  try {
    const existing = await EmployeeRecord.findOne({ employeeId: userData.employeeId });
    if (!existing) {
      await EmployeeRecord.create({ employeeId: userData.employeeId });
    }
  } catch (err) {
    // Ignore duplicate key errors if they somehow happen
  }

  // 2. Request OTP
  await request(app)
    .post("/api/v1/auth/register/send-otp")
    .send(userData);


  // 3. Register with fixed OTP from mock (123456)
  const response = await request(app)
    .post("/api/v1/auth/register")
    .send({ ...userData, otp: "123456" });

  if (response.status !== 201) {
    throw new Error(`Test user creation failed: ${JSON.stringify(response.body)}`);
  }


  return {
    user: response.body.user,
    token: response.body.token,
    rawPassword: userData.password,
  };
};


const getAuthHeader = (token) => {
  return { Authorization: `Bearer ${token}` };
};

module.exports = {
  createTestUser,
  getAuthHeader,
  defaultUserData,
};
