// Backend/tests/pdf.test.js
const request = require("supertest");
const app = require("../src/app");
const { createTestUser, getAuthHeader } = require("./helpers/authHelper");
const { createTestCase } = require("./helpers/caseHelper");

describe("Case Chat PDF Export API", () => {
  let creatorToken, creatorUser;
  let participantToken, participantUser;
  let nonParticipantToken, nonParticipantUser;

  beforeEach(async () => {
    // Setup users
    const creator = await createTestUser(app, {
      employeeId: "CREATOR",
      email: "creator@test.com",
    });
    creatorToken = creator.token;
    creatorUser = creator.user;

    const participant = await createTestUser(app, {
      employeeId: "PARTICIPANT",
      email: "participant@test.com",
    });
    participantToken = participant.token;
    participantUser = participant.user;

    const nonParticipant = await createTestUser(app, {
      employeeId: "OTHER",
      email: "other@test.com",
    });
    nonParticipantToken = nonParticipant.token;
    nonParticipantUser = nonParticipant.user;
  });

  describe("GET /api/v1/cases/:id/export-pdf", () => {
    let testCase;

    beforeEach(async () => {
      // Creator creates a case
      testCase = await createTestCase(app, creatorToken);

      // Add participant to the case
      await request(app)
        .put(`/api/v1/cases/${testCase._id}/participants`)
        .set(getAuthHeader(creatorToken))
        .send({ action: "add", userId: participantUser._id });
    });

    it("should fail without token (401)", async () => {
      const response = await request(app)
        .get(`/api/v1/cases/${testCase._id}/export-pdf`);
      expect(response.status).toBe(401);
    });

    it("should fail for non-participant (403)", async () => {
      const response = await request(app)
        .get(`/api/v1/cases/${testCase._id}/export-pdf`)
        .set(getAuthHeader(nonParticipantToken));
      expect(response.status).toBe(403);
      expect(response.body.message).toContain("Access denied");
    });

    it("should fail if the case is active (400)", async () => {
      const response = await request(app)
        .get(`/api/v1/cases/${testCase._id}/export-pdf`)
        .set(getAuthHeader(creatorToken));
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Only archived cases can be exported");
    });

    it("should succeed and return PDF content when case is archived (200)", async () => {
      // Archive case first
      await request(app)
        .put(`/api/v1/cases/${testCase._id}/archive`)
        .set(getAuthHeader(creatorToken));

      const response = await request(app)
        .get(`/api/v1/cases/${testCase._id}/export-pdf`)
        .set(getAuthHeader(participantToken)); // Participant exports it

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe("application/pdf");
      expect(response.headers["content-disposition"]).toContain("attachment");
      expect(response.headers["content-disposition"]).toContain(`Case-Chat-Export-${testCase._id}.pdf`);
      expect(response.body).toBeDefined();
    });
  });

  describe("cleanTextForPdf Unicode/Emoji cleaning utility", () => {
    const { cleanTextForPdf } = require("../src/services/pdf.service");

    it("should map common emojis to text equivalents", () => {
      expect(cleanTextForPdf("Hello 👍")).toBe("Hello [Like]");
      expect(cleanTextForPdf("Love ❤️ and Laugh 😂")).toBe("Love [Heart] and Laugh [Haha]");
      expect(cleanTextForPdf("Delete 🚫 symbol")).toBe("Delete [Deleted] symbol");
    });

    it("should strip other high Unicode characters outside ISO-8859-1", () => {
      // Unsupported emoji should be stripped
      expect(cleanTextForPdf("Special 🌟 symbol")).toBe("Special  symbol");
      // Accented characters in ISO-8859-1 should remain
      expect(cleanTextForPdf("Café, naïve, garçon")).toBe("Café, naïve, garçon");
    });
  });
});
