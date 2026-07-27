const request = require("supertest");
const app = require("../src/app");
const { createTestUser, getAuthHeader } = require("./helpers/authHelper");
const { createTestCase } = require("./helpers/caseHelper");
const Message = require("../src/models/Message");
const caseService = require("../src/services/case.service");
const { getMimeCategory } = require("../src/config/upload");
const path = require("path");
const fs = require("fs");

// Mock the Cloudinary storage engine to prevent actual cloud uploads during tests
jest.mock("multer-storage-cloudinary", () => {
  return {
    CloudinaryStorage: jest.fn().mockImplementation(() => {
      return {
        _handleFile: (req, file, cb) => {
          // Drain the incoming stream to prevent multer from hanging
          const chunks = [];
          file.stream.on("data", (chunk) => chunks.push(chunk));
          file.stream.on("end", () => {
            cb(null, {
              path: "https://res.cloudinary.com/caseroom/test_image.jpg",
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

// Create dummy files for upload testing
const dummyTxtFilePath = path.join(__dirname, "dummy.txt");
const dummyImgFilePath = path.join(__dirname, "dummy.png");

beforeAll(() => {
  fs.writeFileSync(dummyTxtFilePath, "Hello world doc");
  fs.writeFileSync(dummyImgFilePath, "fake image content");
});

afterAll(() => {
  if (fs.existsSync(dummyTxtFilePath)) fs.unlinkSync(dummyTxtFilePath);
  if (fs.existsSync(dummyImgFilePath)) fs.unlinkSync(dummyImgFilePath);
});

describe("File Upload in Chat API (Phase 8)", () => {
  let user1, token1;
  let user2, token2;
  let testCase;

  beforeEach(async () => {
    const u1 = await createTestUser(app, {
      employeeId: "EMP001",
      email: "user1@test.com",
      password: "Password123",
    });
    user1 = u1.user;
    token1 = u1.token;

    const u2 = await createTestUser(app, {
      employeeId: "EMP002",
      email: "user2@test.com",
      password: "Password123",
    });
    user2 = u2.user;
    token2 = u2.token;

    testCase = await createTestCase(app, token1);
  });

  describe("Utility: getMimeCategory", () => {
    it("should return 'image' for 'image/png'", () => {
      expect(getMimeCategory("image/png")).toBe("image");
    });

    it("should return 'audio' for 'audio/mpeg'", () => {
      expect(getMimeCategory("audio/mpeg")).toBe("audio");
    });

    it("should return null for unknown MIME types", () => {
      expect(getMimeCategory("application/unknown")).toBeNull();
    });
  });

  describe("POST /cases/:id/messages/upload", () => {
    it("should upload an image with a valid MIME type and return 201", async () => {
      // Create a mock socket IO instance on the app
      const mockEmit = jest.fn();
      const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
      app.set("io", { to: mockTo });

      const res = await request(app)
        .post(`/api/v1/cases/${testCase._id}/messages/upload`)
        .set(getAuthHeader(token1))
        .attach("file", dummyImgFilePath, { contentType: "image/png" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe("image");
      expect(res.body.data.fileUrl).toBe("https://res.cloudinary.com/caseroom/test_image.jpg");
      expect(res.body.data.fileName).toBe("dummy.png");
      expect(res.body.data.fileSize).toBeGreaterThan(0);
      expect(res.body.data.fileMimeType).toBe("image/png");
      expect(res.body.data.content).toBe(""); // no caption provided

      expect(mockTo).toHaveBeenCalledWith(`case_${testCase._id}`);
      expect(mockEmit).toHaveBeenCalledWith("new_message", expect.anything());
    });

    it("should upload a document (TXT) and return 201", async () => {
      const res = await request(app)
        .post(`/api/v1/cases/${testCase._id}/messages/upload`)
        .set(getAuthHeader(token1))
        .attach("file", dummyTxtFilePath, { contentType: "text/plain" });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe("document");
    });

    it("should upload with an optional caption", async () => {
      const res = await request(app)
        .post(`/api/v1/cases/${testCase._id}/messages/upload`)
        .set(getAuthHeader(token1))
        .field("content", "Check out this file")
        .attach("file", dummyImgFilePath, { contentType: "image/png" });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe("Check out this file");
    });

    it("should return 400 if no file is provided", async () => {
      const res = await request(app)
        .post(`/api/v1/cases/${testCase._id}/messages/upload`)
        .set(getAuthHeader(token1))
        .field("content", "No file here");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("No file provided");
    });

    it("should return 404 if case does not exist", async () => {
      const fakeId = "60c72b2f9b1d8b001c8e4b8a";
      const res = await request(app)
        .post(`/api/v1/cases/${fakeId}/messages/upload`)
        .set(getAuthHeader(token1))
        .attach("file", dummyImgFilePath, { contentType: "image/png" });

      expect(res.status).toBe(404);
    });

    it("should return 403 if user is not a participant", async () => {
      const res = await request(app)
        .post(`/api/v1/cases/${testCase._id}/messages/upload`)
        .set(getAuthHeader(token2)) // user 2 is not in the case
        .attach("file", dummyImgFilePath, { contentType: "image/png" });

      expect(res.status).toBe(403);
    });

    it("should return 400 if the case is archived", async () => {
      // Archive the case
      await caseService.archiveCase(testCase._id, user1._id);

      const res = await request(app)
        .post(`/api/v1/cases/${testCase._id}/messages/upload`)
        .set(getAuthHeader(token1))
        .attach("file", dummyImgFilePath, { contentType: "image/png" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/archived/i);
    });

    it("should reject disallowed MIME types with 400", async () => {
      const res = await request(app)
        .post(`/api/v1/cases/${testCase._id}/messages/upload`)
        .set(getAuthHeader(token1))
        .attach("file", dummyTxtFilePath, { contentType: "application/x-msdownload" }); // Not allowed

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/not allowed/i);
    });
  });

  describe("GET /cases/:id/messages integration", () => {
    it("should return messages with file fields populated", async () => {
      // Create a file message first
      await request(app)
        .post(`/api/v1/cases/${testCase._id}/messages/upload`)
        .set(getAuthHeader(token1))
        .field("content", "A file message")
        .attach("file", dummyImgFilePath, { contentType: "image/png" });
        
      // Fetch messages
      const res = await request(app)
        .get(`/api/v1/cases/${testCase._id}/messages`)
        .set(getAuthHeader(token1));

      expect(res.status).toBe(200);
      expect(res.body.data.messages.length).toBe(1);
      
      const msg = res.body.data.messages[0];
      expect(msg.type).toBe("image");
      expect(msg.fileUrl).toBeDefined();
      expect(msg.fileName).toBe("dummy.png");
      expect(msg.fileSize).toBeGreaterThan(0);
    });
  });
});
