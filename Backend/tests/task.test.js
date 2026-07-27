const request = require("supertest");
const app = require("../src/app");
const { createTestUser, getAuthHeader } = require("./helpers/authHelper");
const { createTestCase, defaultCaseData } = require("./helpers/caseHelper");

describe("Task / Action Items API", () => {
  let creatorToken, creatorUser;
  let participantToken, participantUser;
  let nonParticipantToken, nonParticipantUser;
  let testCase;

  beforeEach(async () => {
    const creator = await createTestUser(app, {
      employeeId: "TASK_CREATOR",
      email: "task_creator@test.com",
    });
    creatorToken = creator.token;
    creatorUser = creator.user;

    const participant = await createTestUser(app, {
      employeeId: "TASK_PARTICIPANT",
      email: "task_participant@test.com",
    });
    participantToken = participant.token;
    participantUser = participant.user;

    const nonParticipant = await createTestUser(app, {
      employeeId: "TASK_OTHER",
      email: "task_other@test.com",
    });
    nonParticipantToken = nonParticipant.token;
    nonParticipantUser = nonParticipant.user;

    // Create a case with creator and add participant
    testCase = await createTestCase(app, creatorToken, defaultCaseData);
    await request(app)
      .put(`/api/v1/cases/${testCase._id}/participants`)
      .set(getAuthHeader(creatorToken))
      .send({
        action: "add",
        userId: participantUser._id,
        role: "Editor",
      });
  });

  describe("POST /api/v1/cases/:caseId/tasks", () => {
    it("should create a task successfully", async () => {
      const taskPayload = {
        title: "Review Evidence File",
        description: "Examine attached PDF report",
        priority: "high",
        assignees: [participantUser._id],
      };

      const res = await request(app)
        .post(`/api/v1/cases/${testCase._id}/tasks`)
        .set(getAuthHeader(creatorToken))
        .send(taskPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Review Evidence File");
      expect(res.body.data.priority).toBe("high");
      expect(res.body.data.status).toBe("todo");
      expect(res.body.data.assignees.length).toBe(1);
    });

    it("should reject creation if non-participant", async () => {
      const res = await request(app)
        .post(`/api/v1/cases/${testCase._id}/tasks`)
        .set(getAuthHeader(nonParticipantToken))
        .send({ title: "Unauthorized task" });

      expect(res.status).toBe(403);
    });

    it("should reject creation without title", async () => {
      const res = await request(app)
        .post(`/api/v1/cases/${testCase._id}/tasks`)
        .set(getAuthHeader(creatorToken))
        .send({ title: "   " });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/cases/:caseId/tasks", () => {
    it("should list tasks for a participant", async () => {
      // Create task first
      await request(app)
        .post(`/api/v1/cases/${testCase._id}/tasks`)
        .set(getAuthHeader(creatorToken))
        .send({ title: "Task 1" });

      const res = await request(app)
        .get(`/api/v1/cases/${testCase._id}/tasks`)
        .set(getAuthHeader(participantToken));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe("Task 1");
    });
  });

  describe("PATCH /api/v1/cases/:caseId/tasks/:taskId", () => {
    it("should update status to done and set completedBy & completedAt", async () => {
      const createRes = await request(app)
        .post(`/api/v1/cases/${testCase._id}/tasks`)
        .set(getAuthHeader(creatorToken))
        .send({ title: "Task to complete", assignees: [participantUser._id] });

      const taskId = createRes.body.data._id;

      const updateRes = await request(app)
        .patch(`/api/v1/cases/${testCase._id}/tasks/${taskId}`)
        .set(getAuthHeader(participantToken))
        .send({ status: "done" });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.status).toBe("done");
      expect(updateRes.body.data.completedBy._id).toBe(participantUser._id);
      expect(updateRes.body.data.completedAt).not.toBeNull();
    });
  });

  describe("DELETE /api/v1/cases/:caseId/tasks/:taskId", () => {
    it("should allow creator to delete task", async () => {
      const createRes = await request(app)
        .post(`/api/v1/cases/${testCase._id}/tasks`)
        .set(getAuthHeader(creatorToken))
        .send({ title: "Task to delete" });

      const taskId = createRes.body.data._id;

      const deleteRes = await request(app)
        .delete(`/api/v1/cases/${testCase._id}/tasks/${taskId}`)
        .set(getAuthHeader(creatorToken));

      expect(deleteRes.status).toBe(200);

      const listRes = await request(app)
        .get(`/api/v1/cases/${testCase._id}/tasks`)
        .set(getAuthHeader(creatorToken));

      expect(listRes.body.data.length).toBe(0);
    });
  });
});
