const request = require("supertest");
const { getAuthHeader } = require("./authHelper");

const defaultCaseData = {
  title: "Test Case Title",
  description: "Test Case Description",
};

const createTestCase = async (app, token, overrides = {}) => {
  const caseData = { ...defaultCaseData, ...overrides };
  
  const response = await request(app)
    .post("/api/v1/cases")
    .set(getAuthHeader(token))
    .send(caseData);
    
  return response.body.data;
};

module.exports = {
  createTestCase,
  defaultCaseData,
};
