const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const dotenv = require("dotenv");

//load test env variables

dotenv.config({ path: ".env.test" });
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key-for-unit-testing-12345";

// Mock services globally for tests
jest.mock("../src/services/otp.service", () => {
  return {
    generateOTP: jest.fn().mockReturnValue("123456"),
    createOTP: jest.fn().mockResolvedValue("123456"),
    verifyOTP: jest.fn().mockImplementation(async (email, otp, type) => {
      if (otp === "123456") return true;
      const error = new Error("Incorrect OTP.");
      error.statusCode = 400;
      throw error;
    }),
  };
});


jest.mock("../src/services/email.service", () => ({
  sendOTP: jest.fn().mockResolvedValue(true),
}));


let mongoServer;

//start the in memory MongoDB instance and connect mongoose before tests run

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri);
});

//clear all data collections after every single test runs

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

//drop database, disconnect mongoose, stop server after all tests finish

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});
