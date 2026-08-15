const mongoose = require("mongoose");
const User = require("../src/models/User");
const Case = require("../src/models/Case");
const Meeting = require("../src/models/Meeting");
const AIIndexJob = require("../src/models/AIIndexJob");
const meetingService = require("../src/services/meeting.service");
const indexingService = require("../src/services/ai/indexing.service");
const { registerMeetingHandlers } = require("../src/sockets/meetingHandlers");

describe("Meeting Speech-to-Text & Automatic RAG Indexing", () => {
  let user1;
  let user2;
  let unauthorizedUser;
  let testCase;

  beforeEach(async () => {
    user1 = await User.create({
      employeeId: "EMP001",
      name: "Alex Morgan",
      email: "alex@example.com",
      phone: "1234567890",
      passwordHash: "hashed_pwd",
      department: "Security",
    });

    user2 = await User.create({
      employeeId: "EMP002",
      name: "Sarah Chen",
      email: "sarah@example.com",
      phone: "1234567891",
      passwordHash: "hashed_pwd",
      department: "Forensics",
    });

    unauthorizedUser = await User.create({
      employeeId: "EMP003",
      name: "Eve Malory",
      email: "eve@example.com",
      phone: "1234567892",
      passwordHash: "hashed_pwd",
      department: "Unknown",
    });

    testCase = await Case.create({
      title: "Data Exfiltration Investigation",
      description: "Investigating suspicious egress traffic on port 443",
      creatorId: user1._id,
      status: "In Progress",
      priority: "High",
      category: "Incident",
      participants: [
        { user: user1._id, role: "Admin" },
        { user: user2._id, role: "Editor" },
      ],
    });
  });

  describe("1. Structured Meeting Transcripts & DB Persistence", () => {
    it("should atomically append structured transcript entries and sync transcript text", async () => {
      const meeting = await meetingService.findOrCreateMeeting(testCase._id, user1._id);
      await meetingService.addParticipant(meeting._id, user1._id);
      await meetingService.addParticipant(meeting._id, user2._id);

      const timestamp1 = new Date("2026-08-15T10:00:00Z");
      const result1 = await meetingService.appendTranscriptChunk(
        testCase._id,
        meeting._id,
        user1._id,
        user1.name,
        "We are analyzing the packet capture from server 10.0.1.5.",
        timestamp1,
      );

      expect(result1).toBeDefined();
      expect(result1.entry.senderName).toBe("Alex Morgan");
      expect(result1.entry.text).toBe("We are analyzing the packet capture from server 10.0.1.5.");
      expect(result1.formattedLine).toContain("Alex Morgan");
      expect(result1.formattedLine).toContain("We are analyzing the packet capture");

      const timestamp2 = new Date("2026-08-15T10:00:15Z");
      await meetingService.appendTranscriptChunk(
        testCase._id,
        meeting._id,
        user2._id,
        user2.name,
        "Confirmed 2.4 GB transferred to IP 185.91.22.14.",
        timestamp2,
      );

      const updatedMeeting = await Meeting.findById(meeting._id);
      expect(updatedMeeting.transcriptEntries.length).toBe(2);
      expect(updatedMeeting.transcriptEntries[0].senderName).toBe("Alex Morgan");
      expect(updatedMeeting.transcriptEntries[1].senderName).toBe("Sarah Chen");

      expect(updatedMeeting.transcript).toContain("Alex Morgan");
      expect(updatedMeeting.transcript).toContain("Sarah Chen");
      expect(updatedMeeting.transcript).toContain("185.91.22.14");
    });
  });

  describe("2. End-of-Meeting Batch Vector Indexing Trigger", () => {
    it("should automatically enqueue AIIndexJob for RAG vector store when meeting ends", async () => {
      const meeting = await meetingService.findOrCreateMeeting(testCase._id, user1._id);
      await meetingService.addParticipant(meeting._id, user1._id);

      await meetingService.appendTranscriptChunk(
        testCase._id,
        meeting._id,
        user1._id,
        user1.name,
        "Action item: Block malicious destination IP immediately.",
      );

      const endedMeeting = await meetingService.endMeeting(meeting._id);
      expect(endedMeeting.status).toBe("ended");

      // Check that an index job was automatically queued
      const queuedJob = await AIIndexJob.findOne({
        caseId: testCase._id,
        sourceType: "meeting",
        sourceId: meeting._id,
      });

      expect(queuedJob).toBeDefined();
      expect(queuedJob.action).toBe("upsert");
      expect(["queued", "processing", "complete"]).toContain(queuedJob.status);
    });
  });

  describe("3. Socket Event & Authorization Guardrails", () => {
    it("should prevent unauthorized users from submitting transcript chunks", async () => {
      const meeting = await meetingService.findOrCreateMeeting(testCase._id, user1._id);
      await meetingService.addParticipant(meeting._id, user1._id);

      const mockIo = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };

      const emittedErrors = [];
      const mockSocketUnauthorized = {
        user: unauthorizedUser,
        emit: jest.fn((event, data) => {
          if (event === "meeting:error") emittedErrors.push(data);
        }),
        on: jest.fn(),
      };

      // Register handlers
      const listeners = {};
      mockSocketUnauthorized.on.mockImplementation((event, handler) => {
        listeners[event] = handler;
      });
      registerMeetingHandlers(mockIo, mockSocketUnauthorized);

      // Attempt to send transcript chunk from unauthorized user
      await listeners["meeting:transcript-chunk"]({
        caseId: testCase._id.toString(),
        text: "Malicious spoofed speech text",
      });

      expect(emittedErrors.length).toBeGreaterThan(0);
      expect(emittedErrors[0].message).toContain("not an authorized participant");

      // Verify no transcript entries were added
      const checkMeeting = await Meeting.findById(meeting._id);
      expect(checkMeeting.transcriptEntries.length).toBe(0);
    });

    it("should derive sender from authenticated JWT socket and broadcast to room", async () => {
      const meeting = await meetingService.findOrCreateMeeting(testCase._id, user1._id);
      await meetingService.addParticipant(meeting._id, user1._id);

      const mockBroadcastRoom = {
        emit: jest.fn(),
      };
      const mockIo = {
        to: jest.fn().mockReturnValue(mockBroadcastRoom),
        emit: jest.fn(),
      };

      const mockSocketUser1 = {
        user: user1,
        emit: jest.fn(),
        on: jest.fn(),
      };

      const listeners = {};
      mockSocketUser1.on.mockImplementation((event, handler) => {
        listeners[event] = handler;
      });
      registerMeetingHandlers(mockIo, mockSocketUser1);

      await listeners["meeting:transcript-chunk"]({
        caseId: testCase._id.toString(),
        text: "Evidence uploaded to Media Vault.",
      });

      // Verify server derived Alex Morgan and broadcasted to meeting room
      expect(mockIo.to).toHaveBeenCalledWith(`meeting_${testCase._id}`);
      expect(mockBroadcastRoom.emit).toHaveBeenCalledWith(
        "meeting:transcript-chunk",
        expect.objectContaining({
          userId: user1._id.toString(),
          senderName: "Alex Morgan",
          text: "Evidence uploaded to Media Vault.",
        }),
      );

      const checkMeeting = await Meeting.findById(meeting._id);
      expect(checkMeeting.transcriptEntries.length).toBe(1);
      expect(checkMeeting.transcriptEntries[0].senderName).toBe("Alex Morgan");
    });
  });
});
