const request = require("supertest");
const app = require("../src/app");
const { createTestUser, getAuthHeader } = require("./helpers/authHelper");

describe("User Search API", () => {
  let token;
  let aliceUser;
  let bobUser;

  beforeEach(async () => {
    const requester = await createTestUser(app, {
      employeeId: "REQ001",
      name: "Requester User",
      email: "requester@test.com",
    });
    token = requester.token;

    const alice = await createTestUser(app, {
      employeeId: "ALPHA001",
      name: "Alice Johnson",
      email: "alice@test.com",
    });
    aliceUser = alice.user;

    const bob = await createTestUser(app, {
      employeeId: "BETA002",
      name: "Bob Alpha",
      email: "bob@test.com",
    });
    bobUser = bob.user;

    await createTestUser(app, {
      employeeId: "CASE003",
      name: "Charlie Case",
      email: "charlie@test.com",
    });
  });

  it("searches users by partial name", async () => {
    const response = await request(app)
      .get("/api/v1/users/search?q=Alice")
      .set(getAuthHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].employeeId).toBe("ALPHA001");
  });

  it("searches users by partial employeeId", async () => {
    const response = await request(app)
      .get("/api/v1/users/search?q=BETA")
      .set(getAuthHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe("Bob Alpha");
  });

  it("matches search text case-insensitively", async () => {
    const response = await request(app)
      .get("/api/v1/users/search?q=alice")
      .set(getAuthHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe("Alice Johnson");
  });

  it("excludes users listed in excludeIds", async () => {
    const response = await request(app)
      .get(`/api/v1/users/search?q=Alpha&excludeIds=${bobUser._id},,invalid-id`)
      .set(getAuthHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]._id).toBe(aliceUser._id);
  });

  it("returns 400 when q is missing", async () => {
    const response = await request(app)
      .get("/api/v1/users/search")
      .set(getAuthHeader(token));

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Search query is required");
  });

  it("returns 400 when q is empty after trimming", async () => {
    const response = await request(app)
      .get("/api/v1/users/search?q=%20%20")
      .set(getAuthHeader(token));

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Search query is required");
  });

  it("returns 401 without a token", async () => {
    const response = await request(app).get("/api/v1/users/search?q=Alice");

    expect(response.status).toBe(401);
  });

  it("does not return passwordHash in user results", async () => {
    const response = await request(app)
      .get("/api/v1/users/search?q=Alice")
      .set(getAuthHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.data[0].passwordHash).toBeUndefined();
  });

  it("returns an empty array when no users match", async () => {
    const response = await request(app)
      .get("/api/v1/users/search?q=NoMatchUser")
      .set(getAuthHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });
});
