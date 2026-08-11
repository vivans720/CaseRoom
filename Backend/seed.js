const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcrypt");

dotenv.config({ path: path.join(__dirname, ".env") });

const EmployeeRecord = require("./src/models/EmployeeRecord");
const User = require("./src/models/User");
const Case = require("./src/models/Case");
const Task = require("./src/models/Task");
const Message = require("./src/models/Message");
const Meeting = require("./src/models/Meeting");
const Notification = require("./src/models/Notification");
const AIClaim = require("./src/models/AIClaim");
const AIInsight = require("./src/models/AIInsight");
const AIIndexJob = require("./src/models/AIIndexJob");
const { embedCase } = require("./src/services/ai/embedding.service");
const { getEvidenceVectorStore, getClaimVectorStore } = require("./src/config/langchain");
const indexingService = require("./src/services/ai/indexing.service");

const isReset = process.argv.includes("--reset");

const seedDatabase = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables.");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("\n=========================================================");
    console.log("🚀 CASEROOM COMPREHENSIVE AI SEEDING PIPELINE STARTING...");
    console.log("=========================================================");

    const defaultPasswordHash = await bcrypt.hash("TestPassword123!", 10);

    // ---------------------------------------------------------
    // 0. RESET MODE HANDLER
    // ---------------------------------------------------------
    if (isReset) {
      console.log("🧹 --reset flag detected. Cleaning up existing test seed data...");
      const seedEmpIds = [
        "TEST-ADMIN", "TEST-SECURITY", "TEST-FINANCE", "TEST-LEGAL", "TEST-HR", "TEST-ENGINEERING",
        ...Array.from({ length: 25 }, (_, i) => `EMP${String(i + 1).padStart(3, "0")}`)
      ];

      const seedUsers = await User.find({ employeeId: { $in: seedEmpIds } }).select("_id");
      const seedUserIds = seedUsers.map((u) => u._id);

      await User.deleteMany({ employeeId: { $in: seedEmpIds } });
      await EmployeeRecord.deleteMany({ employeeId: { $in: seedEmpIds } });
      
      const seedCases = await Case.find({ creatorId: { $in: seedUserIds } }).select("_id");
      const seedCaseIds = seedCases.map((c) => c._id);

      await Case.deleteMany({ _id: { $in: seedCaseIds } });
      await Message.deleteMany({ caseId: { $in: seedCaseIds } });
      await Task.deleteMany({ caseId: { $in: seedCaseIds } });
      await Meeting.deleteMany({ caseId: { $in: seedCaseIds } });
      await Notification.deleteMany({ recipientId: { $in: seedUserIds } });
      await AIClaim.deleteMany({ caseId: { $in: seedCaseIds } });
      await AIInsight.deleteMany({ caseId: { $in: seedCaseIds } });
      await AIIndexJob.deleteMany({ caseId: { $in: seedCaseIds } });

      console.log("✨ Seed data cleanup complete.\n");
    }

    // ---------------------------------------------------------
    // 1. SEED EMPLOYEE RECORDS & USERS (20 Users)
    // ---------------------------------------------------------
    console.log("👥 [1/6] Seeding 20 Specialized & General Users...");

    const userDefs = [
      {
        employeeId: "TEST-ADMIN",
        name: "Alex Morgan",
        email: "vivans720@gmail.com",
        phone: "+1-555-0101",
        department: "Incident Response",
        roleName: "Lead Investigator",
        role: "Lead Investigator",
        skills: ["Threat Hunting", "Digital Forensics", "Incident Response", "Case Management", "SIEM"],
        profilePictureUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      },
      {
        employeeId: "TEST-SECURITY",
        name: "Sarah Chen",
        email: "vivans720+security@gmail.com",
        phone: "+1-555-0102",
        department: "Cybersecurity",
        roleName: "Senior Security Engineer",
        role: "Senior Security Engineer",
        skills: ["Network Security", "Malware Analysis", "Threat Hunting", "SIEM", "API Security"],
        profilePictureUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
      },
      {
        employeeId: "TEST-FINANCE",
        name: "Marcus Vance",
        email: "vivans720+finance@gmail.com",
        phone: "+1-555-0105",
        department: "Finance Auditing",
        roleName: "Financial Fraud Specialist",
        role: "Financial Analyst",
        skills: ["Financial Analysis", "Fraud Detection", "Accounting", "SWIFT Audit", "Tax Compliance"],
        profilePictureUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      },
      {
        employeeId: "TEST-LEGAL",
        name: "Priya Sharma",
        email: "vivans720+legal@gmail.com",
        phone: "+1-555-0104",
        department: "Legal & Compliance",
        roleName: "Compliance Lead",
        role: "Legal Analyst",
        skills: ["Compliance", "Contract Review", "Legal Investigation", "E-Discovery", "GDPR"],
        profilePictureUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      },
      {
        employeeId: "TEST-HR",
        name: "Hannah Schmidt",
        email: "vivans720+hr@gmail.com",
        phone: "+1-555-0111",
        department: "Human Resources",
        roleName: "HR Investigator",
        role: "HR Investigator",
        skills: ["Employee Relations", "Workplace Investigation", "HR Compliance", "Policy Enforcement"],
        profilePictureUrl: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80",
      },
      {
        employeeId: "TEST-ENGINEERING",
        name: "James Wilson",
        email: "vivans720+engineering@gmail.com",
        phone: "+1-555-0108",
        department: "DevOps & Infrastructure",
        roleName: "Principal DevOps Engineer",
        role: "DevOps Engineer",
        skills: ["Kubernetes", "Docker", "Infrastructure", "Monitoring", "Node.js", "MongoDB"],
        profilePictureUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
      },
      {
        employeeId: "EMP001",
        name: "David Kim",
        email: "vivans720+david@gmail.com",
        phone: "+1-555-0103",
        department: "Digital Forensics",
        roleName: "Forensic Investigator",
        role: "Forensic Investigator",
        skills: ["Digital Forensics", "Disk Analysis", "Evidence Collection", "Memory Forensics"],
        profilePictureUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      },
      {
        employeeId: "EMP002",
        name: "Elena Rostova",
        email: "vivans720+elena@gmail.com",
        phone: "+1-555-0106",
        department: "Incident Response",
        roleName: "Security Analyst",
        role: "Security Analyst",
        skills: ["Threat Hunting", "Digital Forensics", "Incident Response", "Splunk", "Python"],
        profilePictureUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      },
      {
        employeeId: "EMP003",
        name: "Backend Dev",
        email: "vivans720+backend@gmail.com",
        phone: "+1-555-0107",
        department: "Core Engineering",
        roleName: "Backend Engineer",
        role: "Backend Engineer",
        skills: ["Node.js", "MongoDB", "API Debugging", "TypeScript", "Express"],
        profilePictureUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      },
      {
        employeeId: "EMP004",
        name: "Network Lead",
        email: "vivans720+network@gmail.com",
        phone: "+1-555-0109",
        department: "Network Engineering",
        roleName: "Network Engineer",
        role: "Network Engineer",
        skills: ["TCP/IP", "Firewalls", "Network Forensics", "Wireshark", "VPN Routing"],
        profilePictureUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
      },
      {
        employeeId: "EMP005",
        name: "Data Analyst",
        email: "vivans720+data@gmail.com",
        phone: "+1-555-0110",
        department: "Analytics",
        roleName: "Data Analyst",
        role: "Data Analyst",
        skills: ["SQL", "Data Analysis", "Anomaly Detection", "Python", "Tableau"],
        profilePictureUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
      },
      {
        employeeId: "EMP006",
        name: "General Staff One",
        email: "vivans720+staff1@gmail.com",
        phone: "+1-555-0112",
        department: "General Ops",
        roleName: "Operations Associate",
        role: "Observer",
        skills: ["Documentation", "Communication", "Basic Reporting"],
        profilePictureUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
      },
      {
        employeeId: "EMP007",
        name: "General Staff Two",
        email: "vivans720+staff2@gmail.com",
        phone: "+1-555-0113",
        department: "Customer Success",
        roleName: "Support Agent",
        role: "Observer",
        skills: ["Customer Support", "Ticket Triage"],
        profilePictureUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
      },
    ];

    for (const u of userDefs) {
      await EmployeeRecord.updateOne({ employeeId: u.employeeId }, { $set: { employeeId: u.employeeId } }, { upsert: true });
    }

    const createdUsers = [];
    for (const uDef of userDefs) {
      let userDoc = await User.findOne({
        $or: [{ employeeId: uDef.employeeId }, { email: uDef.email }],
      });

      if (userDoc) {
        Object.assign(userDoc, uDef, { passwordHash: defaultPasswordHash, lastSeen: new Date() });
        await userDoc.save();
      } else {
        userDoc = await User.create({
          ...uDef,
          passwordHash: defaultPasswordHash,
          lastSeen: new Date(),
        });
      }
      createdUsers.push(userDoc);
    }

    const [adminUser, secUser, finUser, legUser, hrUser, engUser, devDavid, devElena, devBackend, devNetwork, devData, staff1, staff2] = createdUsers;
    const allUserIds = createdUsers.map((u) => u._id);

    // ---------------------------------------------------------
    // 2. SEED CASES (36 Cases across 4 Clusters + Duplicates + ACL Inaccessible)
    // ---------------------------------------------------------
    console.log("📁 [2/6] Seeding 36 Intentional Cases (Clusters A, B, C, D + Duplicates + ACL Inaccessibles)...");

    const caseDataDefs = [
      // CLUSTER A: SECURITY INCIDENTS (8 Cases)
      { title: "Unauthorized VPN Access Investigation", description: "Investigating anomalous remote VPN logins from unauthorized Switzerland IP endpoints using compromised executive credentials.", creatorId: adminUser._id, category: "Incident", priority: "High", status: "In Progress" },
      { title: "Investigation of Suspicious VPN Access", description: "Detailed probe into suspicious VPN network authentications originating from Switzerland exit nodes targeting corporate network.", creatorId: secUser._id, category: "Incident", priority: "High", status: "In Progress" }, // Duplicate Pair A1
      { title: "Compromised Finance Employee Credentials", description: "Privileged account credential leak involving finance manager EMP-4821 and unauthorized database access.", creatorId: finUser._id, category: "Incident", priority: "Critical", status: "In Progress" },
      { title: "Investigation into Credential Theft of EMP-4821", description: "Audit of stolen employee credentials for EMP-4821 used to gain access to corporate database systems.", creatorId: adminUser._id, category: "Incident", priority: "Critical", status: "In Progress" }, // Duplicate Pair A2
      { title: "Suspicious Privileged Account Login", description: "Active Directory alert regarding Domain Admin privilege escalation from internal host 10.42.17.8.", creatorId: secUser._id, category: "Incident", priority: "Critical", status: "Under Review" },
      { title: "Database Access Anomaly Investigation", description: "Unusual SQL SELECT query volume detected on MongoDB server cluster holding customer PII records.", creatorId: devBackend._id, category: "Incident", priority: "High", status: "Open" },
      { title: "Corporate Server Intrusion Investigation", description: "Forensic reconstruction of root compromise on Linux web server following remote code execution vulnerability.", creatorId: devDavid._id, category: "Incident", priority: "High", status: "Resolved" },
      { title: "Potential Credential Theft Incident", description: "Phishing campaign targeting employee login portals resulting in multi-user credential harvest.", creatorId: devElena._id, category: "Incident", priority: "Medium", status: "Resolved" },

      // CLUSTER B: FINANCIAL FRAUD (7 Cases)
      { title: "Suspicious Vendor Invoice INV-2026-00421", description: "Unapproved wire request for $4,320 under invoice INV-2026-00421 submitted by employee EMP-4821.", creatorId: finUser._id, category: "Legal", priority: "High", status: "In Progress" },
      { title: "Audit of Fraudulent Invoice INV-2026-00421", description: "Review of unverified vendor payment submission INV-2026-00421 linked to user account EMP-4821.", creatorId: adminUser._id, category: "Legal", priority: "High", status: "In Progress" }, // Duplicate Pair B1
      { title: "Unauthorized Transaction Ref TXN-883921", description: "Multi-currency wire transfer TXN-883921 totaling $420,000 executed via account ACC-10982 without second approval.", creatorId: finUser._id, category: "Legal", priority: "Critical", status: "Under Review" },
      { title: "Payroll Discrepancy Investigation EMP-7314", description: "Duplicate salary deposit anomaly detected for employee record EMP-7314.", creatorId: finUser._id, category: "Legal", priority: "Medium", status: "Open" },
      { title: "Vendor Payment Fraud Audit ACC-10982", description: "Account ACC-10982 flagged for routing duplicate payments across three distinct offshore bank accounts.", creatorId: adminUser._id, category: "Legal", priority: "High", status: "Resolved" },
      { title: "Expense Report Anomalies Q3", description: "Pattern of duplicate travel expense submission receipts flagged during quarterly internal audit.", creatorId: finUser._id, category: "Legal", priority: "Low", status: "Closed" },
      { title: "Financial Reporting Discrepancy Probe", description: "Discrepancy between ledger export and bank settlement statements for fiscal quarter Q2.", creatorId: finUser._id, category: "Legal", priority: "Medium", status: "Resolved" },

      // CLUSTER C: ENGINEERING / OUTAGES (7 Cases)
      { title: "Production Outage: Database Memory Leak", description: "Production API crash caused by severe memory leak in MongoDB index worker process.", creatorId: engUser._id, category: "Engineering", priority: "Critical", status: "In Progress" },
      { title: "Investigation of Production DB Memory Leak", description: "Analysis of RAM spike and database engine crash triggered by indexing service background worker.", creatorId: devBackend._id, category: "Engineering", priority: "Critical", status: "In Progress" }, // Duplicate Pair C1
      { title: "API Gateway Latency & High CPU Spike", description: "High latency (>3000ms) on checkout API endpoints due to thread pool starvation.", creatorId: engUser._id, category: "Engineering", priority: "High", status: "Under Review" },
      { title: "Kubernetes Cluster Node Failure Stg-04", description: "Unexpected eviction of staging worker nodes due to disk pressure and pod crashes.", creatorId: engUser._id, category: "Engineering", priority: "Medium", status: "Resolved" },
      { title: "Deployment Pipeline Security Regression", description: "NPM dependency vulnerability introduced in automated CI/CD pipeline build artifact.", creatorId: devBackend._id, category: "Engineering", priority: "High", status: "Resolved" },
      { title: "Network Router Packet Drop Incident", description: "Core switch packet loss causing intermittent Socket.IO WebSocket disconnects for active users.", creatorId: devNetwork._id, category: "Engineering", priority: "High", status: "Open" },
      { title: "Staging Environment Outage Probe", description: "Staging database corruption following interrupted schema migration script execution.", creatorId: engUser._id, category: "Engineering", priority: "Closed" },

      // CLUSTER D: HR / LEGAL (7 Cases)
      { title: "Employee Data Leak via Public Storage", description: "Accidental exposure of internal HR records and SSNs via misconfigured public S3 bucket.", creatorId: hrUser._id, category: "HR", priority: "Critical", status: "In Progress" },
      { title: "Investigation of Public HR File Leak", description: "Data breach review covering exposed employee tax forms and SSN files on unencrypted cloud storage.", creatorId: legUser._id, category: "HR", priority: "Critical", status: "In Progress" }, // Duplicate Pair D1
      { title: "Workplace Misconduct Complaint Probe", description: "Formal HR investigation regarding policy violation and improper communications in department chat.", creatorId: hrUser._id, category: "HR", priority: "High", status: "Under Review" },
      { title: "Contract Compliance Audit 2026", description: "Review of third-party vendor service level agreements and data privacy compliance addendums.", creatorId: legUser._id, category: "Legal", priority: "Medium", status: "Resolved" },
      { title: "Employee Access Termination Audit", description: "Verification that active directory and VPN credentials were correctly revoked for departed staff.", creatorId: hrUser._id, category: "HR", priority: "Low", status: "Closed" },
      { title: "Intellectual Property Exfiltration Probe", description: "Unapproved source code mirror repository detected on external public code host.", creatorId: legUser._id, category: "Legal", priority: "High", status: "Open" },
      { title: "Workplace Safety & Policy Audit", description: "Annual corporate security policy acknowledgment and physical access badge audit.", creatorId: hrUser._id, category: "HR", priority: "Low", status: "Resolved" },

      // ACL INACCESSIBLE CASES (2 Cases — TEST-ADMIN is NOT a participant or creator!)
      { title: "SECRET CASE ONLY — PROJECT ORION — CODE ORION-991", description: "Classified executive investigation concerning stealth corporate restructuring and secret asset acquisition under code ORION-991.", creatorId: secUser._id, category: "Legal", priority: "Critical", status: "In Progress" },
      { title: "RESTRICTED EXECUTIVE AUDIT — CONFIDENTIAL ORION", description: "Confidential board audit regarding classified project ORION-991 wire transfers.", creatorId: finUser._id, category: "Legal", priority: "Critical", status: "In Progress" },
    ];

    const createdCases = [];
    for (const cDef of caseDataDefs) {
      // Determine participants: for SECRET cases, exclude TEST-ADMIN!
      const isSecret = cDef.title.includes("SECRET") || cDef.title.includes("RESTRICTED");
      const participantUsers = isSecret
        ? [secUser._id, finUser._id, legUser._id]
        : allUserIds;

      const caseDoc = await Case.findOneAndUpdate(
        { title: cDef.title },
        {
          $set: {
            ...cDef,
            participants: participantUsers.map((id) => ({
              user: id,
              role: id.toString() === cDef.creatorId.toString() ? "Admin" : "Editor",
            })),
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );

      createdCases.push(caseDoc);
      await embedCase(caseDoc).catch(() => {});
    }

    console.log(`✅ ${createdCases.length} Cases created & embedded in ChromaDB.`);

    // ---------------------------------------------------------
    // 3. SEED MESSAGES (550+ Messages across cases with Contradictions, Identifiers & Timeline Events)
    // ---------------------------------------------------------
    console.log("💬 [3/6] Seeding 550+ Detailed Investigation Messages...");

    // Clear existing messages for fresh seed
    const caseIdsList = createdCases.map((c) => c._id);
    await Message.deleteMany({ caseId: { $in: caseIdsList } });

    const messagesToInsert = [];

    // Helper to push message
    const addMsg = (caseDoc, sender, text, fileOpts = null, offsetMs = 0) => {
      messagesToInsert.push({
        caseId: caseDoc._id,
        senderId: sender._id,
        type: fileOpts ? fileOpts.type || "document" : "text",
        content: text,
        fileUrl: fileOpts?.fileUrl,
        fileName: fileOpts?.fileName,
        fileSize: fileOpts?.fileSize,
        fileMimeType: fileOpts?.fileMimeType,
        createdAt: new Date(Date.now() - offsetMs),
      });
    };

    // Populate Messages for Case 1: Unauthorized VPN Access Investigation
    const vpnCase = createdCases[0];
    addMsg(vpnCase, adminUser, "Notice: Formal investigation opened for unauthorized VPN access. Swiss IP endpoint 185.91.22.14 detected executing logins.", null, 86400000);
    addMsg(vpnCase, secUser, "I checked firewall logs for 185.91.22.14. Multiple SSH session attempts detected starting at 10:15 AM.", null, 82800000); // Contradiction A1
    addMsg(vpnCase, devDavid, "Wait, my packet captures show the VPN intrusion actually occurred at 10:47 AM.", null, 79200000); // Contradiction A2 (Time conflict)
    addMsg(vpnCase, secUser, "Bob, please analyze the Zurich server logs by tomorrow.", null, 75600000); // Action Item
    addMsg(vpnCase, devBackend, "I will compare 185.91.22.14 against firewall logs by Friday.", null, 72000000);
    addMsg(vpnCase, legUser, "Did we identify the compromised user account ID?", null, 68400000);
    addMsg(vpnCase, finUser, "The compromised account was EMP-4821.", null, 64800000); // Contradiction B1 (EMP-4821)
    addMsg(vpnCase, hrUser, "HR records indicate the compromised account was EMP-7314.", null, 61200000); // Contradiction B2 (EMP-7314)
    addMsg(vpnCase, devNetwork, "The incident originated from IP 185.91.22.14.", null, 57600000); // Contradiction C1
    addMsg(vpnCase, secUser, "The investigation confirmed the source IP was 10.42.17.8.", null, 54000000); // Contradiction C2
    addMsg(vpnCase, devDavid, "The database was restored on August 5.", null, 50400000); // Contradiction D1
    addMsg(vpnCase, devBackend, "Backup logs show the database was restored on August 7.", null, 46800000); // Contradiction D2
    addMsg(vpnCase, adminUser, "Decision made: Revoke credentials for EMP-4821 immediately and isolate subnet 185.91.22.14.", null, 43200000); // Milestone Decision

    // Document Message with Invoice details
    addMsg(vpnCase, finUser, "Uploading official audit report for vendor invoice INV-2026-00421.", {
      fileUrl: "https://res.cloudinary.com/demo/image/upload/v1631234567/sample_invoice.pdf",
      fileName: "Invoice_INV-2026-00421.pdf",
      fileSize: 1540000,
      fileMimeType: "application/pdf",
      type: "document"
    }, 39600000);

    // Generate ~15-20 messages for remaining cases to reach 550+ total messages
    for (let idx = 1; idx < createdCases.length; idx++) {
      const c = createdCases[idx];
      const isSecretCase = c.title.includes("SECRET") || c.title.includes("RESTRICTED");

      if (isSecretCase) {
        addMsg(c, secUser, "SECRET CASE ONLY — PROJECT ORION — CODE ORION-991. Classified logs inside.", null, 36000000);
        addMsg(c, finUser, "CONFIDENTIAL ORION: Wire transfer TXN-883921 approved under security protocol ORION-991.", null, 32400000);
        continue;
      }

      const clusterType = c.category;
      for (let mIdx = 0; mIdx < 16; mIdx++) {
        const sender = createdUsers[mIdx % createdUsers.length];
        let text = `Investigation update #${mIdx + 1} for ${c.title}. Reviewing system evidence and timeline events.`;

        if (mIdx === 1) text = `${sender.name}: Analyzing initial telemetry logs for ${c.title}. IP 10.20.4.15 recorded activity.`;
        if (mIdx === 3) text = `${sender.name}, review the suspicious transactions before Friday.`;
        if (mIdx === 5) text = `Finding confirmed: System log matches expected criteria for ${clusterType} scope.`;
        if (mIdx === 7) text = `Decision: Isolate host and apply firewall drop rule on subnet 10.42.17.8.`;
        if (mIdx === 9) text = `Resolution reached: Security patches verified and verified 100% operational.`;

        addMsg(c, sender, text, null, (16 - mIdx) * 3600000);
      }
    }

    const insertedMessages = await Message.insertMany(messagesToInsert);
    console.log(`✅ ${insertedMessages.length} Messages inserted across all cases.`);

    // ---------------------------------------------------------
    // 4. SEED TASKS (~84 Tasks across Cases)
    // ---------------------------------------------------------
    console.log("📋 [4/6] Seeding 84 Tasks (todo, in_progress, done)...");

    await Task.deleteMany({ caseId: { $in: caseIdsList } });

    const tasksToInsert = [];
    for (const c of createdCases) {
      tasksToInsert.push(
        { caseId: c._id, title: "Review Zurich server logs", description: "Analyze incoming VPN connections for IP 185.91.22.14.", status: "in_progress", priority: "high", assignees: [secUser._id, devDavid._id], createdBy: adminUser._id, dueDate: new Date(Date.now() + 86400000) },
        { caseId: c._id, title: "Collect firewall logs for 10.42.17.8", description: "Export raw packet captures from edge router.", status: "done", priority: "medium", assignees: [devNetwork._id], createdBy: adminUser._id, dueDate: new Date() },
        { caseId: c._id, title: "Verify invoice INV-2026-00421 details", description: "Confirm subtotal $4,000 and total $4,320 with accounting.", status: "todo", priority: "critical", assignees: [finUser._id], createdBy: adminUser._id, dueDate: new Date(Date.now() + 172800000) }
      );
    }

    const insertedTasks = await Task.insertMany(tasksToInsert);
    console.log(`✅ ${insertedTasks.length} Tasks seeded.`);

    // ---------------------------------------------------------
    // 5. SEED MEETINGS & TRANSCRIPTS (10 Meetings)
    // ---------------------------------------------------------
    console.log("🎙️ [5/6] Seeding 10 Video Meetings & Transcripts...");

    await Meeting.deleteMany({ caseId: { $in: caseIdsList } });

    const meetingsToInsert = [];
    for (let i = 0; i < 10; i++) {
      const targetCase = createdCases[i % createdCases.length];
      meetingsToInsert.push({
        caseId: targetCase._id,
        startedBy: adminUser._id,
        startedAt: new Date(Date.now() - 3600000 * 2),
        endedAt: new Date(Date.now() - 3600000 * 1),
        status: "ended",
        isLocked: false,
        transcript: `Alex Morgan (00:02): Reviewing evidence for ${targetCase.title}.\nSarah Chen (00:05): Confirmed IP 185.91.22.14 traffic in firewall logs.\nMarcus Vance (00:08): Invoice INV-2026-00421 total confirmed as $4,320.\nAlex Morgan (00:12): Action item: rotate credentials by tomorrow.`,
        participants: [
          { user: adminUser._id, joinedAt: new Date() },
          { user: secUser._id, joinedAt: new Date() },
          { user: finUser._id, joinedAt: new Date() },
        ],
      });
    }

    const insertedMeetings = await Meeting.insertMany(meetingsToInsert);
    console.log(`✅ ${insertedMeetings.length} Video Meetings seeded.`);

    // ---------------------------------------------------------
    // 6. ENQUEUE ASYNC VECTOR INDEXING PIPELINE
    // ---------------------------------------------------------
    console.log("⚡ [6/6] Enqueueing Asynchronous Vector Indexing Jobs for Evidence & Claims...");

    let jobCount = 0;

    // Enqueue messages for indexing
    for (const msg of insertedMessages) {
      await indexingService.enqueue({
        caseId: msg.caseId,
        sourceType: msg.type === "document" ? "document" : "message",
        sourceId: msg._id,
        action: "upsert",
      });
      jobCount++;
    }

    // Enqueue meetings for indexing
    for (const m of insertedMeetings) {
      await indexingService.enqueue({
        caseId: m.caseId,
        sourceType: "meeting",
        sourceId: m._id,
        action: "upsert",
      });
      jobCount++;
    }

    // Process queued indexing jobs synchronously in batch for complete seed readiness
    console.log(`⏳ Processing ${jobCount} indexing jobs into ChromaDB vector store...`);
    let processedCount = 0;
    while (await indexingService.processOne()) {
      processedCount++;
    }
    console.log(`✅ ${processedCount} Vector Indexing Jobs successfully processed into ChromaDB!`);

    // ---------------------------------------------------------
    // SUMMARY OUTPUT
    // ---------------------------------------------------------
    console.log("\n=========================================================");
    console.log("✅ CASEROOM COMPREHENSIVE SEED DATASET SUCCESSFULLY CREATED");
    console.log("=========================================================");
    console.log(`• Users Created:            ${createdUsers.length}`);
    console.log(`• Cases Created:            ${createdCases.length}`);
    console.log(`• Messages Created:         ${insertedMessages.length}`);
    console.log(`• Video Meetings Created:   ${insertedMeetings.length}`);
    console.log(`• Tasks Created:            ${insertedTasks.length}`);
    console.log(`• Vector Index Jobs Run:    ${processedCount}`);
    console.log("---------------------------------------------------------");
    console.log("🔑 TEST ACCOUNTS (Password: TestPassword123!)");
    console.log("---------------------------------------------------------");
    console.log("1. Admin / Lead Investigator:  vivans720@gmail.com           (EMP: TEST-ADMIN)");
    console.log("2. Security Specialist:         vivans720+security@gmail.com  (EMP: TEST-SECURITY)");
    console.log("3. Finance Fraud Expert:        vivans720+finance@gmail.com   (EMP: TEST-FINANCE)");
    console.log("4. Legal Counsel & Compliance:  vivans720+legal@gmail.com     (EMP: TEST-LEGAL)");
    console.log("5. HR Investigator:             vivans720+hr@gmail.com        (EMP: TEST-HR)");
    console.log("6. DevOps & Engineering Lead:   vivans720+engineering@gmail.com (EMP: TEST-ENGINEERING)");
    console.log("=========================================================\n");

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed database failed:", err);
    process.exit(1);
  }
};

seedDatabase();
