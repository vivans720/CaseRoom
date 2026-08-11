const Case = require("../../models/Case");
const User = require("../../models/User");
const { getVectorStore } = require("../../config/langchain");

const throwError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

/**
 * Production-Grade Multi-Factor Participant Recommendation Engine
 * Normalized scoring formula: Skills (35%) + Historical Experience (30%) + Role/Category (20%) + Availability (15%)
 */
const recommendParticipants = async (caseId, requesterId, topK = 5) => {
  const caseDoc = await Case.findById(caseId);
  if (!caseDoc) {
    throwError("Case not found", 404);
  }
  if (!caseDoc.isParticipant(requesterId)) {
    throwError("Access denied. You are not a participant in this case", 403);
  }

  // Current participant IDs to exclude
  const existingParticipantIds = new Set(
    caseDoc.participants.map((p) => (p.user ? p.user.toString() : p.toString()))
  );
  if (caseDoc.creatorId) {
    existingParticipantIds.add(caseDoc.creatorId.toString());
  }

  const caseText = `${caseDoc.title} ${caseDoc.description || ""} ${caseDoc.category || ""}`.toLowerCase();

  // Step 1: Historical Vector Similarity Search for past cases
  const similarCaseMap = new Map(); // caseId -> title
  try {
    const vectorStore = await getVectorStore();
    const vectorResults = await vectorStore.similaritySearchWithScore(`${caseDoc.title}. ${caseDoc.description || ""}`, 8);

    for (const [doc] of vectorResults) {
      const cId = doc.metadata?.caseId;
      if (cId && cId !== caseId.toString()) {
        similarCaseMap.set(cId, doc.metadata?.title || "Past Case");
      }
    }
  } catch (err) {
    console.warn("[ChromaDB] Vector lookup fallback in participant recommendation:", err.message);
  }

  if (similarCaseMap.size === 0) {
    const categoryCases = await Case.find({
      _id: { $ne: caseId },
      category: caseDoc.category || "Incident",
    })
      .limit(8)
      .select("title")
      .lean();
    for (const c of categoryCases) {
      similarCaseMap.set(c._id.toString(), c.title);
    }
  }

  // Step 2: Historical Participation & Past Case Titles Map
  const userPastCasesMap = new Map(); // userId -> Array<caseTitle>
  if (similarCaseMap.size > 0) {
    const pastCases = await Case.find({ _id: { $in: Array.from(similarCaseMap.keys()) } })
      .select("title participants creatorId")
      .lean();

    for (const pCase of pastCases) {
      const allP = [...(pCase.participants || []).map((p) => p.user?.toString() || p.toString()), pCase.creatorId?.toString()].filter(Boolean);
      for (const uId of allP) {
        if (!existingParticipantIds.has(uId)) {
          const list = userPastCasesMap.get(uId) || [];
          if (!list.includes(pCase.title)) list.push(pCase.title);
          userPastCasesMap.set(uId, list);
        }
      }
    }
  }

  // Step 3: Candidate Users
  const candidates = await User.find({
    _id: { $nin: Array.from(existingParticipantIds) },
  })
    .select("name email employeeId roleName skills profilePictureUrl department")
    .lean();

  if (candidates.length === 0) {
    return [];
  }

  // Step 4: Active Workload Map for Candidates
  const candidateIds = candidates.map((c) => c._id);
  const activeWorkloadCases = await Case.find({
    "participants.user": { $in: candidateIds },
    status: { $in: ["Open", "In Progress"] },
  })
    .select("participants.user")
    .lean();

  const workloadMap = new Map(); // userId -> active count
  for (const cWork of activeWorkloadCases) {
    for (const p of cWork.participants || []) {
      const uId = p.user?.toString();
      if (uId) {
        workloadMap.set(uId, (workloadMap.get(uId) || 0) + 1);
      }
    }
  }

  // Step 5: Multi-Factor Scoring
  const scoredCandidates = candidates.map((u) => {
    const uIdStr = u._id.toString();
    const matchingSkills = [];

    // 1. Skill Score (Weight 35%)
    let skillScore = 0;
    if (Array.isArray(u.skills) && u.skills.length > 0) {
      for (const skill of u.skills) {
        if (skill && caseText.includes(skill.toLowerCase())) {
          matchingSkills.push(skill);
        }
      }
      skillScore = Math.min(1.0, matchingSkills.length / Math.max(1, Math.min(3, u.skills.length)));
    }

    // 2. Experience Score (Weight 30%)
    const pastCasesHandled = userPastCasesMap.get(uIdStr) || [];
    const experienceScore = Math.min(1.0, pastCasesHandled.length / 2.5);

    // 3. Role/Category Score (Weight 20%)
    let roleScore = 0.4; // baseline
    if (u.roleName && u.roleName.trim()) {
      const rName = u.roleName.toLowerCase();
      const cat = (caseDoc.category || "").toLowerCase();
      if (caseText.includes(rName) || (cat && (rName.includes(cat) || cat.includes(rName)))) {
        roleScore = 1.0;
      }
    }

    // 4. Availability/Workload Score (Weight 15%)
    const activeCount = workloadMap.get(uIdStr) || 0;
    const availabilityScore = Math.max(0.2, 1.0 - activeCount * 0.2);
    const availabilityStatus = activeCount <= 1 ? "High Availability" : activeCount <= 3 ? "Moderate Workload" : "High Workload";

    // Weighted Final Match Score (0 to 100)
    const weightedSum = skillScore * 0.35 + experienceScore * 0.30 + roleScore * 0.20 + availabilityScore * 0.15;
    const matchPercentage = Math.min(99, Math.max(30, Math.round(weightedSum * 100)));

    // Recommendation Rationale
    const reasons = [];
    if (roleScore === 1.0) reasons.push(`Role (${u.roleName || "Specialist"}) aligns with ${caseDoc.category || "case"}`);
    if (matchingSkills.length > 0) reasons.push(`Skills: ${matchingSkills.join(", ")}`);
    if (pastCasesHandled.length > 0) reasons.push(`Handled ${pastCasesHandled.length} related investigation${pastCasesHandled.length > 1 ? "s" : ""}`);
    reasons.push(availabilityStatus);

    return {
      user: u,
      matchPercentage,
      matchingSkills,
      pastCasesCount: pastCasesHandled.length,
      pastCasesTitles: pastCasesHandled,
      availabilityStatus,
      reason: reasons.join(" • "),
    };
  });

  // Filter out candidates with score < 40 and sort descending
  return scoredCandidates
    .filter((cand) => cand.matchPercentage >= 40)
    .sort((a, b) => b.matchPercentage - a.matchPercentage)
    .slice(0, topK);
};

module.exports = {
  recommendParticipants,
};
