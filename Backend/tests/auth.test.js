const request = require("supertest");
const app = require("../src/app");
const {
  createTestUser,
  getAuthHeader,
  defaultUserData,
} = require("./helpers/authHelper");
const EmployeeRecord = require("../src/models/EmployeeRecord");
const path = require("path");
const fs = require("fs");

jest.mock("multer-storage-cloudinary", () => {
  return {
    CloudinaryStorage: jest.fn().mockImplementation(() => {
      return {
        _handleFile: (req, file, cb) => {
          const chunks = [];
          file.stream.on("data", (chunk) => chunks.push(chunk));
          file.stream.on("end", () => {
            cb(null, {
              path: "https://res.cloudinary.com/caseroom/profile.jpg",
              size: Buffer.concat(chunks).length,
              filename: file.originalname,
            });
          });
          file.stream.on("error", (err) => cb(err));
        },
        _removeFile: (req, file, cb) => {
          cb(null);
        },
      };
    }),
  };
});

const dummyTxtFilePath = path.join(__dirname, "auth-dummy.txt");
const dummyImgFilePath = path.join(__dirname, "auth-dummy.png");

beforeAll(() => {
  fs.writeFileSync(dummyTxtFilePath, "Hello world doc");
  fs.writeFileSync(dummyImgFilePath, "fake image content");
});

afterAll(() => {
  if (fs.existsSync(dummyTxtFilePath)) fs.unlinkSync(dummyTxtFilePath);
  if (fs.existsSync(dummyImgFilePath)) fs.unlinkSync(dummyImgFilePath);
});

describe("Auth API", () => {
  describe("POST /api/v1/auth/register", () => {
    it("should register a user with valid data", async () => {
      const userData = {
        employeeId: "EMP002",
        name: "Test User",
        email: "testuser@gmail.com",
        phone: "9876543210",
        password: "Password123",
      };

      // 1. Seed Employee ID
      await EmployeeRecord.create({ employeeId: userData.employeeId });

      // 2. Send OTP
      const otpRes = await request(app)
        .post("/api/v1/auth/register/send-otp")
        .send(userData);
      expect(otpRes.status).toBe(200);

      // 3. Register with OTP
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({ ...userData, otp: "123456" });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
    });

    it("should fail if required fields are missing", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        employeeId: "EMP003",
        // missing name, email, etc.
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("All fields and OTP are required!");
    });

    it("should fail if employeeId is duplicate", async () => {
      await createTestUser(app); // creates default user

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          ...defaultUserData,
          email: "different@gmail.com", // Ensure email is different
          otp: "123456",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "User with this Employee ID already exists",
      );
    });

    it("should fail if email is duplicate", async () => {
      await createTestUser(app);

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          ...defaultUserData,
          employeeId: "EMP999", // Ensure employeeId is different
          otp: "123456",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("User with this Email already exists");
    });

    it("should not return passwordHash in response", async () => {
      const { user } = await createTestUser(app);
      expect(user.passwordHash).toBeUndefined();
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should login with valid credentials and verify OTP", async () => {
      const { user, rawPassword } = await createTestUser(app);

      // 1. Initial Login
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        employeeId: user.employeeId,
        password: rawPassword,
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.requireOtp).toBe(true);
      expect(loginRes.body.tempToken).toBeDefined();

      // 2. Verify OTP
      const response = await request(app)
        .post("/api/v1/auth/login/verify")
        .send({
          tempToken: loginRes.body.tempToken,
          otp: "123456",
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.employeeId).toBe(user.employeeId);
    });

    it("should fail with wrong password", async () => {
      const { user } = await createTestUser(app);

      const response = await request(app).post("/api/v1/auth/login").send({
        employeeId: user.employeeId,
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid Employee ID or Password");
    });

    it("should fail with non-existent employeeId", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        employeeId: "INVALID",
        password: "password123",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid Employee ID or Password");
    });

    it("should fail if fields are missing", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        employeeId: "EMP001",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Employee ID and password are required",
      );
    });
  });

  describe("POST /api/v1/auth/resend-otp", () => {
    it("should resend OTP for registration", async () => {
      const response = await request(app)
        .post("/api/v1/auth/resend-otp")
        .send({
          email: "resend_reg@gmail.com",
          type: "registration",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("OTP resent to email successfully");
    });

    it("should resend OTP for login if user exists", async () => {
      const { user } = await createTestUser(app);

      const response = await request(app)
        .post("/api/v1/auth/resend-otp")
        .send({
          email: user.email,
          type: "login",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("OTP resent to email successfully");
    });

    it("should fail to resend OTP for login if user does not exist", async () => {
      const response = await request(app)
        .post("/api/v1/auth/resend-otp")
        .send({
          email: "nonexistent@gmail.com",
          type: "login",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("No account found with this email address");
    });

    it("should fail if email is missing", async () => {
      const response = await request(app)
        .post("/api/v1/auth/resend-otp")
        .send({ type: "registration" });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/v1/auth/signout", () => {
    it("should signout successfully", async () => {
      const response = await request(app).post("/api/v1/auth/signout").send();

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("User logged out successfully");
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("should get profile with valid token", async () => {
      const { user, token } = await createTestUser(app);

      const response = await request(app)
        .get("/api/v1/auth/me")
        .set(getAuthHeader(token));

      expect(response.status).toBe(200);
      expect(response.body.user.employeeId).toBe(user.employeeId);
    });

    it("should fail without token", async () => {
      const response = await request(app).get("/api/v1/auth/me");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Not authorized, no token");
    });

    it("should fail with invalid token", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set(getAuthHeader("invalid.token.here"));

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Not authorized, token failed");
    });
  });

  describe("PATCH /api/v1/auth/profile-picture", () => {
    it("should upload profile picture and return updated user", async () => {
      const { token } = await createTestUser(app);

      const response = await request(app)
        .patch("/api/v1/auth/profile-picture")
        .set(getAuthHeader(token))
        .attach("file", dummyImgFilePath, { contentType: "image/png" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.profilePictureUrl).toBe(
        "https://res.cloudinary.com/caseroom/profile.jpg",
      );
    });

    it("should reject non-image uploads", async () => {
      const { token } = await createTestUser(app);

      const response = await request(app)
        .patch("/api/v1/auth/profile-picture")
        .set(getAuthHeader(token))
        .attach("file", dummyTxtFilePath, {
          contentType: "application/x-msdownload",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/not allowed/i);
    });
  });

  describe("POST /api/v1/auth/change-password", () => {
    it("should change password with correct current password", async () => {
      const { user, rawPassword, token } = await createTestUser(app);

      const response = await request(app)
        .post("/api/v1/auth/change-password")
        .set(getAuthHeader(token))
        .send({
          currentPassword: rawPassword,
          newPassword: "NewPassword123",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Password change successfully");
    });

    it("should fail with wrong current password", async () => {
      const { token } = await createTestUser(app);

      const response = await request(app)
        .post("/api/v1/auth/change-password")
        .set(getAuthHeader(token))
        .send({
          currentPassword: "wrongpassword",
          newPassword: "NewPassword123",
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Incorrect current password");
    });

    it("should fail if new password is same as current", async () => {
      const { rawPassword, token } = await createTestUser(app);

      const response = await request(app)
        .post("/api/v1/auth/change-password")
        .set(getAuthHeader(token))
        .send({
          currentPassword: rawPassword,
          newPassword: rawPassword,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "New password must be different from current password",
      );
    });

    it("should fail if fields are missing", async () => {
      const { rawPassword, token } = await createTestUser(app);

      const response = await request(app)
        .post("/api/v1/auth/change-password")
        .set(getAuthHeader(token))
        .send({
          currentPassword: rawPassword,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Current password and new password are required",
      );
    });

    it("should not allow login with old password after change", async () => {
      const { user, rawPassword, token } = await createTestUser(app);

      // Change password
      await request(app)
        .post("/api/v1/auth/change-password")
        .set(getAuthHeader(token))
        .send({
          currentPassword: rawPassword,
          newPassword: "NewPassword123",
        });

      // Try login with old password
      const response = await request(app).post("/api/v1/auth/login").send({
        employeeId: user.employeeId,
        password: rawPassword,
      });

      expect(response.status).toBe(401);
    });

    it("should register successfully and then login with OTP", async () => {
      // Full end-to-end flow test
      const userData = {
        employeeId: "EMP_FLOW_001",
        name: "Flow User",
        email: "flow@gmail.com",
        phone: "1122334455",
        password: "Password123",
      };

      await EmployeeRecord.create({ employeeId: userData.employeeId });

      // Send Register OTP
      await request(app).post("/api/v1/auth/register/send-otp").send(userData);

      // Register
      await request(app)
        .post("/api/v1/auth/register")
        .send({ ...userData, otp: "123456" });

      // Login
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        employeeId: userData.employeeId,
        password: userData.password,
      });

      // Verify Login OTP
      const finalRes = await request(app)
        .post("/api/v1/auth/login/verify")
        .send({
          tempToken: loginRes.body.tempToken,
          otp: "123456",
        });

      expect(finalRes.status).toBe(200);
      expect(finalRes.body.token).toBeDefined();
    });

    it("should update user phone number when authenticated", async () => {
      const { token } = await createTestUser(app);

      const response = await request(app)
        .patch("/api/v1/auth/phone")
        .set(getAuthHeader(token))
        .send({ phone: "+19876543210" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.phone).toBe("+19876543210");
    });

    it("should fail updating phone with invalid format", async () => {
      const { token } = await createTestUser(app);

      const response = await request(app)
        .patch("/api/v1/auth/phone")
        .set(getAuthHeader(token))
        .send({ phone: "abc" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Phone number must be valid");
    });
  });
});
