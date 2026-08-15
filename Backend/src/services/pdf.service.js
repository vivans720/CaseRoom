const PDFDocument = require("pdfkit");
const axios = require("axios");

/**
 * Formats a Date/Timestamp into a professional format
 */
const formatDateTime = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Cleans text to prevent Unicode rendering issues with standard PDFKit fonts
 */
const cleanTextForPdf = (text) => {
  if (!text) return "";
  
  // Replace emojis with text equivalents
  let cleaned = text
    .replace(/👍/g, "[Like]")
    .replace(/❤️/g, "[Heart]")
    .replace(/😂/g, "[Haha]")
    .replace(/😮/g, "[Wow]")
    .replace(/😢/g, "[Sad]")
    .replace(/🙏/g, "[Thanks]")
    .replace(/😊/g, "[Smile]")
    .replace(/🎉/g, "[Celebrate]")
    .replace(/🔥/g, "[Fire]")
    .replace(/✨/g, "[Sparkles]")
    .replace(/🤔/g, "[Thinking]")
    .replace(/🚫/g, "[Deleted]")
    .replace(/👥/g, "")
    .replace(/📄/g, "[File]")
    .replace(/📷/g, "[Image]")
    .replace(/⚙️/g, "")
    .replace(/🔍/g, "");

  // Remove non-WinAnsiEncoding characters (anything above \u00FF)
  cleaned = cleaned.replace(/[^\u0000-\u00FF]/g, "");
  
  return cleaned;
};

/**
 * Fetch an image from a URL as a buffer
 */
const fetchImageBuffer = async (url) => {
  if (!url) return null;
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 5000,
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error(`Failed to download image from ${url}:`, error.message);
    return null;
  }
};

/**
 * Renders message content, formatting mentions in bold and primary color
 */
const renderTextWithMentions = (doc, text, mentions, colors, startX = 65, width = 460) => {
  if (!text) return;
  
  const cleanText = cleanTextForPdf(text);
  const mentionUsers = (mentions || []).filter(m => typeof m === "object" && m !== null && m.name);
  if (mentionUsers.length === 0) {
    doc.text(cleanText, startX, doc.y, { lineGap: 3, width });
    return;
  }
  
  const mentionNames = mentionUsers.map(u => u.name.trim());
  const pattern = mentionNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(^|\\s)@(${pattern})(?=$|\\s|[.,!?;:])`, "gi");
  
  let lastIndex = 0;
  let match;
  const tokens = [];
  
  while ((match = regex.exec(cleanText)) !== null) {
    const leadingSpace = match[1] || "";
    const name = match[2];
    const matchIndex = match.index;
    
    if (matchIndex > lastIndex) {
      tokens.push({
        type: "text",
        value: cleanText.slice(lastIndex, matchIndex + leadingSpace.length)
      });
    }
    
    tokens.push({
      type: "mention",
      value: `@${name}`
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < cleanText.length) {
    tokens.push({
      type: "text",
      value: cleanText.slice(lastIndex)
    });
  }
  
  if (tokens.length === 0) {
    doc.text(cleanText, startX, doc.y, { lineGap: 3, width });
    return;
  }
  
  tokens.forEach((token, index) => {
    const isLast = index === tokens.length - 1;
    if (token.type === "mention") {
      doc.font("Helvetica-Bold").fillColor(colors.primary);
    } else {
      doc.font("Helvetica").fillColor(colors.textDark);
    }
    
    if (index === 0) {
      doc.text(token.value, startX, doc.y, { continued: !isLast, lineGap: 3, width });
    } else {
      doc.text(token.value, { continued: !isLast, lineGap: 3, width });
    }
  });
};

/**
 * Checks if message is a special investigation event (Decision, Finding, Resolution, Action Item)
 */
const getSpecialEventInfo = (content) => {
  if (!content) return null;
  const trimmed = content.trim();

  if (/^Decision:/i.test(trimmed)) {
    return { tag: "DECISION", color: "#276749", bg: "#f0fff4", border: "#9ae6b4" }; // Green
  }
  if (/^Finding confirmed:/i.test(trimmed)) {
    return { tag: "FINDING CONFIRMED", color: "#b7791f", bg: "#fffaf0", border: "#fbd38d" }; // Amber
  }
  if (/^Resolution reached:/i.test(trimmed)) {
    return { tag: "RESOLUTION REACHED", color: "#2b6cb0", bg: "#ebf8ff", border: "#bee3f8" }; // Blue
  }
  if (/^Action item:/i.test(trimmed)) {
    return { tag: "ACTION ITEM", color: "#805ad5", bg: "#faf5ff", border: "#e9d8fd" }; // Purple
  }
  return null;
};

/**
 * Calculates estimated vertical space required for a message block in points
 */
const getMessageHeight = (doc, message, colors) => {
  let height = 0;
  
  // Sender name row height + hairline divider
  height += 18;

  const contentWidth = 460;

  if (message.isDeleted) {
    height += 20;
  } else {
    // Reply box height calculation
    if (message.replyTo) {
      let replyText = "";
      const replySender = message.replyTo.senderId?.name || "User";
      if (message.replyTo.isDeleted) {
        replyText = "Original message was deleted";
      } else {
        replyText = message.replyTo.type === "text" 
          ? message.replyTo.content 
          : message.replyTo.fileName || "Attachment";
      }
      const replyClean = cleanTextForPdf(`Reply to ${replySender}: "${replyText}"`);
      doc.font("Helvetica-Oblique").fontSize(8.5);
      const textHeight = doc.heightOfString(replyClean, { width: 430 });
      height += textHeight + 18;
    }

    // Special event callout box calculation
    const eventInfo = getSpecialEventInfo(message.content);
    if (eventInfo) {
      doc.font("Helvetica").fontSize(9);
      const eventText = cleanTextForPdf(message.content);
      const textHeight = doc.heightOfString(eventText, { width: 435 });
      height += textHeight + 24;
    } else if (message.content) {
      doc.font("Helvetica").fontSize(9.5);
      const textClean = cleanTextForPdf(message.content);
      const textHeight = doc.heightOfString(textClean, { lineGap: 3, width: contentWidth });
      height += textHeight + 4;
    }

    // Attachment height spacing
    if (message.type !== "text") {
      if (message.type === "image") {
        height += 175; // image container + link
      } else {
        height += 55; // standard document card box
      }
    }
  }

  // Margin spacing below the message
  height += 14;

  return height;
};

/**
 * Draws the cover page of the PDF document
 */
const drawCoverPage = (doc, caseDoc, colors, totalMessages, totalAttachments, totalTasks, creatorName, archiveDate) => {
  // Top accent bar
  doc.save().rect(0, 0, 595, 12).fill(colors.primary).restore();

  doc.y = 45;
  doc.fillColor(colors.textMuted).fontSize(9).font("Helvetica-Bold").text("CASE DOSSIER & AUDIT RECORD", { tracking: 0.1 });
  doc.moveDown(0.8);

  const cleanTitle = cleanTextForPdf(caseDoc.title);
  doc.fillColor(colors.primary).fontSize(20).font("Helvetica-Bold").text(cleanTitle, { lineGap: 4, width: 495 });
  doc.moveDown(0.4);

  // Subtitle
  doc.fillColor(colors.textMuted).fontSize(9).font("Helvetica").text("Automatically generated case dossier containing the archived case record, communications, action items, and associated evidence available at the time of export.", { width: 495, lineGap: 2 });
  doc.moveDown(0.8);

  if (caseDoc.description) {
    const cleanDesc = cleanTextForPdf(caseDoc.description);
    doc.fillColor(colors.textDark).fontSize(9).font("Helvetica-Oblique").text(cleanDesc, {
      lineGap: 3,
      width: 495
    });
    doc.moveDown(0.9);
  }

  // ==================== BOX 1: CASE SUMMARY & METADATA ====================
  const boxStartY = doc.y;
  const boxHeight = 110;

  doc.save()
     .rect(50, boxStartY, 495, boxHeight)
     .fillAndStroke(colors.bgBox, colors.borderBox);

  doc.fillColor(colors.primary).font("Helvetica-Bold").fontSize(10);
  doc.text("CASE SUMMARY", 65, boxStartY + 8);
  doc.strokeColor(colors.borderBox).lineWidth(0.8).moveTo(65, boxStartY + 21).lineTo(530, boxStartY + 21).stroke();

  const caseIdStr = caseDoc._id ? `CR-CASE-${caseDoc._id.toString().slice(-8).toUpperCase()}` : "CR-CASE-RECORD";
  const priorityStr = (caseDoc.priority || "Medium").toUpperCase();
  const categoryStr = caseDoc.category || "General";

  // Left Column
  doc.fillColor(colors.textDark).font("Helvetica-Bold").fontSize(8.5);
  doc.text("Document ID:", 65, boxStartY + 28);
  doc.font("Helvetica").text(caseIdStr, 140, boxStartY + 28);

  doc.font("Helvetica-Bold").text("Status:", 65, boxStartY + 42);
  doc.font("Helvetica").text("Archived (Completed)", 140, boxStartY + 42);

  doc.font("Helvetica-Bold").text("Priority:", 65, boxStartY + 56);
  doc.font("Helvetica-Bold").fillColor(priorityStr === "CRITICAL" ? "#c53030" : colors.primary).text(priorityStr, 140, boxStartY + 56);
  doc.fillColor(colors.textDark);

  doc.font("Helvetica-Bold").text("Category:", 65, boxStartY + 70);
  doc.font("Helvetica").text(categoryStr, 140, boxStartY + 70);

  doc.font("Helvetica-Bold").text("Case Creator:", 65, boxStartY + 84);
  doc.font("Helvetica").text(creatorName, 140, boxStartY + 84);

  // Right Column
  doc.font("Helvetica-Bold").text("Archive Date:", 310, boxStartY + 28);
  doc.font("Helvetica").text(archiveDate, 390, boxStartY + 28);

  doc.font("Helvetica-Bold").text("Export Date:", 310, boxStartY + 42);
  doc.font("Helvetica").text(formatDateTime(new Date()), 390, boxStartY + 42);

  doc.font("Helvetica-Bold").text("Export Version:", 310, boxStartY + 56);
  doc.font("Helvetica").text("1.0 (Official)", 390, boxStartY + 56);

  doc.font("Helvetica-Bold").text("Record Type:", 310, boxStartY + 70);
  doc.font("Helvetica").text("Point-in-time Audit", 390, boxStartY + 70);

  doc.restore();

  // ==================== BOX 2: METRICS & DOSSIER CONTENTS ====================
  const contentsY = boxStartY + boxHeight + 10;
  const contentsHeight = 85;

  doc.save()
     .rect(50, contentsY, 495, contentsHeight)
     .fillAndStroke(colors.bgBox, colors.borderBox);

  doc.fillColor(colors.primary).font("Helvetica-Bold").fontSize(10);
  doc.text("INVESTIGATION METRICS & CONTENTS", 65, contentsY + 8);
  doc.strokeColor(colors.borderBox).lineWidth(0.8).moveTo(65, contentsY + 21).lineTo(530, contentsY + 21).stroke();

  // Quick stats row
  doc.fillColor(colors.textDark).font("Helvetica-Bold").fontSize(8.5);
  doc.text(`${caseDoc.participants?.length || 0} Participants   •   ${totalMessages} Messages   •   ${totalTasks} Tasks   •   ${totalAttachments} Evidence Files`, 65, contentsY + 27);

  // Contents
  doc.font("Helvetica").fontSize(8);
  doc.text("01  Chronological Transcript", 65, contentsY + 44);
  doc.fillColor(colors.textMuted).text(`Full interaction log with quote references & mentions (${totalMessages} records)`, 200, contentsY + 44);

  doc.fillColor(colors.textDark).text("02  Action Items & Task Register", 65, contentsY + 56);
  doc.fillColor(colors.textMuted).text(`Comprehensive task tracking ledger (${totalTasks} items tracked)`, 200, contentsY + 56);

  doc.fillColor(colors.textDark).text("03  Evidence & Attachment Index", 65, contentsY + 68);
  doc.fillColor(colors.textMuted).text(`Catalog of files, documents, and media artifacts (${totalAttachments} files)`, 200, contentsY + 68);

  doc.restore();

  // ==================== PARTICIPANT ROSTER ====================
  doc.y = contentsY + contentsHeight + 10;
  doc.fillColor(colors.primary).font("Helvetica-Bold").fontSize(10.5).text("PARTICIPANT ROSTER");
  doc.strokeColor(colors.borderBox).lineWidth(0.8).moveTo(50, doc.y + 3).lineTo(545, doc.y + 3).stroke();
  doc.y += 8;

  // Safe extraction of participant objects
  const participantsList = (caseDoc.participants || []).map((p) => {
    const userObj = (p && typeof p.user === "object" && p.user !== null) ? p.user : p;
    const name = cleanTextForPdf(userObj?.name || p?.name || "Unknown User");
    const email = (userObj?.email || p?.email) ? `${userObj?.email || p?.email}` : "";
    const role = p?.role ? `[${p.role}]` : "[Member]";
    return { name, email, role };
  });

  // Render participants in a compact 2-column layout to preserve page space
  const colWidth = 240;
  const startX1 = 50;
  const startX2 = 305;
  let currentRosterY = doc.y;

  participantsList.forEach((p, idx) => {
    const isCol2 = idx % 2 === 1;
    const posX = isCol2 ? startX2 : startX1;
    const posY = currentRosterY;

    doc.fillColor(colors.textDark).font("Helvetica-Bold").fontSize(8);
    doc.text(`• ${p.name}`, posX, posY, { continued: true });
    
    doc.fillColor(colors.textMuted).font("Helvetica").fontSize(7.5);
    if (p.email) {
      doc.text(` (${p.email}) `, { continued: true });
    }
    doc.fillColor(colors.primary).font("Helvetica-Bold").fontSize(7.5).text(p.role);

    if (isCol2 || idx === participantsList.length - 1) {
      currentRosterY += 13;
    }
  });

  doc.y = currentRosterY + 5;

  // Temporarily set bottom margin to 0 for the cover page to allow the footer note
  doc.page.margins.bottom = 0;

  // Cover Page Footer Notice (properly spaced above page number)
  doc.fillColor(colors.textMuted).font("Helvetica").fontSize(7.5);
  doc.text("Export integrity: This document represents an official point-in-time export of the CaseRoom case workspace.", 50, doc.page.height - 48, { align: "center", width: 495 });
  doc.text("CaseRoom Document Repository • Private & Confidential", 50, doc.page.height - 36, { align: "center", width: 495 });

  // Restore bottom margin to 55 for next pages
  doc.page.margins.bottom = 55;
};

/**
 * Draws a single transcript message in the PDF document
 */
const drawMessage = async (doc, message, colors) => {
  const timestamp = formatDateTime(message.createdAt);

  if (message.isDeleted) {
    const senderName = cleanTextForPdf(message.senderId?.name || "Deleted User");
    
    // Sender Row
    doc.fillColor(colors.textDark).font("Helvetica-Bold").fontSize(9);
    doc.text(senderName, 50, doc.y, { continued: true });
    doc.fillColor(colors.textMuted).font("Helvetica").fontSize(8).text(timestamp, { align: "right" });
    
    // Hairline divider
    doc.strokeColor(colors.borderBox).lineWidth(0.4).moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke();
    doc.y += 6;

    doc.fillColor(colors.textMuted).font("Helvetica-Oblique").fontSize(8.5).text("[Message Deleted]", 65, doc.y);
    doc.moveDown(1.0);
    return;
  }

  const senderName = cleanTextForPdf(message.senderId?.name || "Unknown User");

  // Sender Header Row
  doc.fillColor(colors.textDark).font("Helvetica-Bold").fontSize(9);
  doc.text(senderName, 50, doc.y, { continued: true });
  doc.fillColor(colors.textMuted).font("Helvetica").fontSize(8).text(timestamp, { align: "right" });

  // Hairline divider
  doc.strokeColor(colors.borderBox).lineWidth(0.4).moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke();
  doc.y += 6;

  // Quote Reply Box
  if (message.replyTo) {
    let replyText = "";
    const replySender = cleanTextForPdf(message.replyTo.senderId?.name || "User");
    if (message.replyTo.isDeleted) {
      replyText = "Original message was deleted";
    } else {
      replyText = message.replyTo.type === "text" 
        ? message.replyTo.content 
        : message.replyTo.fileName || "Attachment";
    }

    const replyClean = cleanTextForPdf(replyText);
    const replyY = doc.y;
    
    doc.save();
    doc.fontSize(8).font("Helvetica-Oblique");
    const quoteHeight = doc.heightOfString(replyClean, { width: 430 });
    const replyHeight = 12 + quoteHeight;

    // Solid vertical bar
    doc.strokeColor(colors.primary)
       .lineWidth(2.5)
       .moveTo(65, replyY)
       .lineTo(65, replyY + replyHeight + 4)
       .stroke();

    // Background rect
    doc.rect(68, replyY, 447, replyHeight + 4)
       .fill(colors.bgBox);

    // Quote header
    doc.fillColor(colors.textMuted).font("Helvetica-Bold").fontSize(7.5);
    doc.text(`Reference to ${replySender}'s message:`, 75, replyY + 2);

    // Quote content
    doc.fillColor(colors.textDark).font("Helvetica-Oblique").fontSize(8);
    doc.text(replyClean, 75, replyY + 13, { width: 430 });
    doc.restore();

    doc.y = replyY + replyHeight + 8;
  }

  // Check for special event (Decision, Finding, Resolution, Action Item)
  const eventInfo = getSpecialEventInfo(message.content);

  if (eventInfo) {
    const cleanContent = cleanTextForPdf(message.content);
    doc.font("Helvetica").fontSize(9);
    const eventTextHeight = doc.heightOfString(cleanContent, { width: 435 });
    const boxHeight = eventTextHeight + 16;
    const eventY = doc.y;

    doc.save();
    doc.rect(65, eventY, 450, boxHeight).fillAndStroke(eventInfo.bg, eventInfo.border);

    // Left accent bar
    doc.strokeColor(eventInfo.color).lineWidth(3).moveTo(65, eventY).lineTo(65, eventY + boxHeight).stroke();

    // Badge Tag
    doc.fillColor(eventInfo.color).font("Helvetica-Bold").fontSize(8);
    doc.text(`[${eventInfo.tag}]`, 75, eventY + 4);

    // Body
    doc.fillColor(colors.textDark).font("Helvetica").fontSize(8.5);
    doc.text(cleanContent, 75, eventY + 15, { width: 430, lineGap: 2 });
    doc.restore();

    doc.y = eventY + boxHeight + 4;
  } else if (message.type === "text") {
    doc.fontSize(9).font("Helvetica").fillColor(colors.textDark);
    renderTextWithMentions(doc, message.content, message.mentions, colors, 65, 450);
  } else if (message.type === "image") {
    if (message.content) {
      doc.fontSize(9).font("Helvetica").fillColor(colors.textDark);
      renderTextWithMentions(doc, message.content, message.mentions, colors, 65, 450);
      doc.moveDown(0.4);
    }

    const buffer = await fetchImageBuffer(message.fileUrl);
    if (buffer) {
      try {
        doc.save();
        doc.strokeColor(colors.borderBox).lineWidth(1).rect(64, doc.y - 1, 302, 152).stroke();
        doc.image(buffer, 65, doc.y, {
          fit: [300, 150],
        });
        doc.restore();
        
        doc.y += 155;

        const cleanFileName = cleanTextForPdf(message.fileName);
        doc.fillColor(colors.linkBlue)
           .fontSize(8)
           .text(`[View Image: ${cleanFileName}]`, 65, doc.y, { link: message.fileUrl })
           .fillColor(colors.textDark)
           .fontSize(9);
      } catch (imgError) {
        console.error("PDFKit image rendering failed:", imgError.message);
        const cleanFileName = cleanTextForPdf(message.fileName);
        
        const boxY = doc.y;
        doc.save();
        doc.rect(65, boxY, 450, 40).fillAndStroke(colors.bgBox, colors.borderBox);
        doc.fillColor(colors.textDark).font("Helvetica-Bold").fontSize(8.5);
        doc.text("Image Attachment", 75, boxY + 8);
        doc.font("Helvetica").fillColor(colors.linkBlue);
        doc.text(cleanFileName, 75, boxY + 22, { link: message.fileUrl, underline: true });
        doc.restore();
        doc.y = boxY + 45;
      }
    } else {
      const cleanFileName = cleanTextForPdf(message.fileName);
      
      const boxY = doc.y;
      doc.save();
      doc.rect(65, boxY, 450, 40).fillAndStroke(colors.bgBox, colors.borderBox);
      doc.fillColor(colors.textDark).font("Helvetica-Bold").fontSize(8.5);
      doc.text("Image Attachment", 75, boxY + 8);
      doc.font("Helvetica").fillColor(colors.linkBlue);
      doc.text(cleanFileName, 75, boxY + 22, { link: message.fileUrl, underline: true });
      doc.restore();
      doc.y = boxY + 45;
    }
  } else {
    if (message.content) {
      doc.fontSize(9).font("Helvetica").fillColor(colors.textDark);
      renderTextWithMentions(doc, message.content, message.mentions, colors, 65, 450);
      doc.moveDown(0.4);
    }

    const cleanFileName = cleanTextForPdf(message.fileName);
    const sizeStr = message.fileSize ? ` (${(message.fileSize / 1024).toFixed(1)} kB)` : "";
    const label = (message.type || "Document").toUpperCase();

    const boxY = doc.y;
    doc.save();
    doc.rect(65, boxY, 450, 42).fillAndStroke(colors.bgBox, colors.borderBox);
    doc.fillColor(colors.primary).font("Helvetica-Bold").fontSize(8.5);
    doc.text(`[${label}] Attachment`, 75, boxY + 8);
    doc.font("Helvetica").fillColor(colors.linkBlue);
    doc.text(`${cleanFileName}${sizeStr}`, 75, boxY + 22, { link: message.fileUrl, underline: true });
    doc.restore();
    doc.y = boxY + 48;
  }

  // Margin spacing below message
  doc.moveDown(0.9);
};

/**
 * Draws Section 2: Action Items & Task Register
 */
const drawTaskRegister = (doc, tasks, colors) => {
  doc.addPage();

  // Section Header
  doc.fillColor(colors.primary).font("Helvetica-Bold").fontSize(13).text("SECTION 2: ACTION ITEMS & TASK REGISTER");
  doc.strokeColor(colors.borderBox).lineWidth(0.8).moveTo(50, doc.y + 3).lineTo(545, doc.y + 3).stroke();
  doc.y += 8;

  doc.fillColor(colors.textMuted).font("Helvetica").fontSize(8.5).text("Official ledger of all case action items, assignments, priority levels, and completion statuses.");
  doc.moveDown(1.0);

  if (!tasks || tasks.length === 0) {
    const emptyY = doc.y;
    doc.save()
       .rect(50, emptyY, 495, 40)
       .fillAndStroke(colors.bgBox, colors.borderBox);
    doc.fillColor(colors.textMuted).font("Helvetica-Oblique").fontSize(9);
    doc.text("No action items or tasks were registered for this case.", 65, emptyY + 14);
    doc.restore();
    doc.y = emptyY + 50;
    return;
  }

  tasks.forEach((task, index) => {
    const cleanTaskTitle = cleanTextForPdf(task.title || "Untitled Task");
    const cleanTaskDesc = cleanTextForPdf(task.description || "");
    
    // Status label formatting
    const statusLabels = {
      todo: "To Do",
      in_progress: "In Progress",
      done: "Done / Completed",
    };
    const statusText = statusLabels[task.status] || task.status || "Unknown";
    const priorityText = (task.priority || "Medium").toUpperCase();
    
    // Assignees
    const assigneeNames = (task.assignees || [])
      .map(a => cleanTextForPdf(a?.name || ""))
      .filter(Boolean)
      .join(", ") || "Unassigned";

    // Due & Completed Dates
    const dueStr = task.dueDate ? formatDateTime(task.dueDate) : "No due date";
    let completedInfo = "";
    if (task.status === "done" || task.completedAt) {
      const compDate = task.completedAt ? formatDateTime(task.completedAt) : "Completed";
      const compUser = task.completedBy?.name ? ` by ${cleanTextForPdf(task.completedBy.name)}` : "";
      completedInfo = ` | Resolved: ${compDate}${compUser}`;
    }

    // Estimate box height
    doc.font("Helvetica").fontSize(8.5);
    const descHeight = cleanTaskDesc ? doc.heightOfString(cleanTaskDesc, { width: 450 }) + 4 : 0;
    const cardHeight = 52 + descHeight;

    if (doc.y + cardHeight > doc.page.height - 55) {
      doc.addPage();
    }

    const cardY = doc.y;
    doc.save()
       .rect(50, cardY, 495, cardHeight)
       .fillAndStroke(colors.bgBox, colors.borderBox);

    // Left border indicator for priority
    let priorityColor = colors.primary;
    if (task.priority === "critical") priorityColor = "#c53030";
    else if (task.priority === "high") priorityColor = "#dd6b20";
    else if (task.priority === "medium") priorityColor = "#3182ce";
    else priorityColor = "#718096";

    doc.strokeColor(priorityColor)
       .lineWidth(3.5)
       .moveTo(50, cardY)
       .lineTo(50, cardY + cardHeight)
       .stroke();

    // Task Header Line
    doc.fillColor(colors.primary).font("Helvetica-Bold").fontSize(9);
    doc.text(`Task #${index + 1}: ${cleanTaskTitle}`, 65, cardY + 8, { continued: true, width: 330 });
    
    // Status & Priority on Right
    doc.fillColor(priorityColor).font("Helvetica-Bold").fontSize(8);
    doc.text(`[${priorityText}] - ${statusText}`, 390, cardY + 8, { align: "right", width: 140 });

    let currentY = cardY + 22;

    // Optional Description
    if (cleanTaskDesc) {
      doc.fillColor(colors.textDark).font("Helvetica-Oblique").fontSize(8);
      doc.text(cleanTaskDesc, 65, currentY, { width: 450, lineGap: 2 });
      currentY += descHeight;
    }

    // Metadata Sub-row
    doc.fillColor(colors.textMuted).font("Helvetica").fontSize(7.5);
    doc.text(`Assignees: ${assigneeNames} | Due: ${dueStr}${completedInfo}`, 65, currentY + 3, { width: 450 });

    doc.restore();
    doc.y = cardY + cardHeight + 8;
  });
};

/**
 * Draws Section 3: Evidence & Attachment Index
 */
const drawEvidenceIndex = (doc, messages, colors) => {
  const attachments = (messages || []).filter(m => m.type !== "text" && !m.isDeleted);

  // If there are 0 attachments, try rendering on current page without wasting a full blank page
  if (attachments.length === 0) {
    if (doc.y + 90 > doc.page.height - 55) {
      doc.addPage();
    } else {
      doc.moveDown(1.2);
    }

    // Section Header
    doc.fillColor(colors.primary).font("Helvetica-Bold").fontSize(13).text("SECTION 3: EVIDENCE & ATTACHMENT INDEX");
    doc.strokeColor(colors.borderBox).lineWidth(0.8).moveTo(50, doc.y + 3).lineTo(545, doc.y + 3).stroke();
    doc.y += 8;

    doc.fillColor(colors.textMuted).font("Helvetica").fontSize(8.5).text("Complete inventory of all files, documents, and visual evidence cataloged in this case.");
    doc.moveDown(0.8);

    const emptyY = doc.y;
    doc.save()
       .rect(50, emptyY, 495, 38)
       .fillAndStroke(colors.bgBox, colors.borderBox);
    doc.fillColor(colors.textMuted).font("Helvetica-Oblique").fontSize(8.5);
    doc.text("No attachments or evidence files were uploaded in this case (Evidence count: 0).", 65, emptyY + 13);
    doc.restore();
    doc.y = emptyY + 45;
    return;
  }

  // If there are attachments, check page break or add clean page
  if (doc.y + 120 > doc.page.height - 55) {
    doc.addPage();
  } else {
    doc.moveDown(1.2);
  }

  // Section Header
  doc.fillColor(colors.primary).font("Helvetica-Bold").fontSize(13).text("SECTION 3: EVIDENCE & ATTACHMENT INDEX");
  doc.strokeColor(colors.borderBox).lineWidth(0.8).moveTo(50, doc.y + 3).lineTo(545, doc.y + 3).stroke();
  doc.y += 8;

  doc.fillColor(colors.textMuted).font("Helvetica").fontSize(8.5).text("Complete inventory of all files, documents, and visual evidence cataloged in this case.");
  doc.moveDown(0.8);

  attachments.forEach((att, index) => {
    const cleanFileName = cleanTextForPdf(att.fileName || "Attachment");
    const uploader = cleanTextForPdf(att.senderId?.name || "Unknown User");
    const timestamp = formatDateTime(att.createdAt);
    const sizeStr = att.fileSize ? ` (${(att.fileSize / 1024).toFixed(1)} kB)` : "";
    const typeLabel = (att.type || "file").toUpperCase();

    const cardHeight = 48;
    if (doc.y + cardHeight > doc.page.height - 55) {
      doc.addPage();
    }

    const cardY = doc.y;
    doc.save()
       .rect(50, cardY, 495, cardHeight)
       .fillAndStroke(colors.bgBox, colors.borderBox);

    // Left accent bar
    doc.strokeColor(colors.linkBlue)
       .lineWidth(3.5)
       .moveTo(50, cardY)
       .lineTo(50, cardY + cardHeight)
       .stroke();

    // Evidence Header
    doc.fillColor(colors.primary).font("Helvetica-Bold").fontSize(9);
    doc.text(`Evidence #${index + 1}: ${cleanFileName}${sizeStr}`, 65, cardY + 7, { continued: true, width: 350 });

    doc.fillColor(colors.textMuted).font("Helvetica-Bold").fontSize(8);
    doc.text(`[${typeLabel}]`, 420, cardY + 7, { align: "right", width: 110 });

    // Details Line
    doc.fillColor(colors.textDark).font("Helvetica").fontSize(8);
    doc.text(`Uploaded by: ${uploader}  •  Date: ${timestamp}`, 65, cardY + 20);

    // Clickable link
    doc.fillColor(colors.linkBlue).font("Helvetica").fontSize(8);
    doc.text(`[Access Evidence File: ${cleanFileName}]`, 65, cardY + 32, {
      link: att.fileUrl,
      underline: true,
    });

    doc.restore();
    doc.y = cardY + cardHeight + 6;
  });
};

/**
 * Generates a case chat history PDF
 * @param {Object} caseDoc - The Case document populated with participants
 * @param {Array} messages - Chronological list of message documents populated with sender, mentions and replies
 * @param {Array|stream.Writable} tasksOrStream - Array of tasks or Writable stream
 * @param {stream.Writable} [maybeStream] - Writable stream to pipe the PDF to
 */
const generateCaseChatPdf = async (caseDoc, messages, tasksOrStream, maybeStream) => {
  let tasks = [];
  let writeStream = null;

  if (Array.isArray(tasksOrStream)) {
    tasks = tasksOrStream;
    writeStream = maybeStream;
  } else {
    tasks = [];
    writeStream = tasksOrStream;
  }

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 55, bottom: 55, left: 50, right: 50 },
    bufferPages: true,
  });

  doc.pipe(writeStream);

  const colors = {
    primary: "#1a365d", // Deep navy blue
    textDark: "#2d3748", // Dark charcoal
    textMuted: "#718096", // Muted gray
    bgBox: "#f7fafc", // Light gray box background
    borderBox: "#e2e8f0", // Light border gray
    linkBlue: "#3182ce", // Standard link blue
  };

  const creatorName = cleanTextForPdf(caseDoc.creatorId?.name || "Unknown");
  const archiveDate = formatDateTime(caseDoc.updatedAt);
  const totalAttachments = (messages || []).filter(m => m.type !== "text" && !m.isDeleted).length;
  const totalTasks = tasks ? tasks.length : 0;

  // ==================== PAGE 1: COVER PAGE ====================
  drawCoverPage(doc, caseDoc, colors, messages.length, totalAttachments, totalTasks, creatorName, archiveDate);

  // ==================== PAGE 2+: SECTION 1: CONVERSATION TRANSCRIPT ====================
  doc.addPage();

  doc.fillColor(colors.primary).font("Helvetica-Bold").fontSize(13).text("SECTION 1: CHRONOLOGICAL TRANSCRIPT");
  doc.strokeColor(colors.borderBox).lineWidth(0.8).moveTo(50, doc.y + 3).lineTo(545, doc.y + 3).stroke();
  doc.y += 8;

  doc.fillColor(colors.textMuted).font("Helvetica").fontSize(8.5).text("Chronological record of all communications, quote references, decisions, and interactions within the case room.");
  doc.moveDown(1.0);

  let lastDateStr = null;

  for (const message of messages) {
    const msgDate = new Date(message.createdAt);
    const msgDateStr = msgDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // If new day, render date separator
    if (msgDateStr !== lastDateStr) {
      lastDateStr = msgDateStr;

      if (doc.y + 35 > doc.page.height - 55) {
        doc.addPage();
      }

      doc.moveDown(0.4);
      doc.fillColor(colors.primary).font("Helvetica-Bold").fontSize(9.5);

      const cleanDate = cleanTextForPdf(msgDateStr);
      doc.text(cleanDate, { align: "center" });
      
      // Separator Line
      doc.strokeColor(colors.borderBox).lineWidth(0.5).moveTo(50, doc.y + 3).lineTo(545, doc.y + 3).stroke();
      doc.y += 8;
      doc.moveDown(0.4);
    }

    const msgHeight = getMessageHeight(doc, message, colors);

    // Prevent message splitting
    if (doc.y + msgHeight > doc.page.height - 55) {
      doc.addPage();
    }

    await drawMessage(doc, message, colors);
  }

  // ==================== SECTION 2: TASK REGISTER ====================
  drawTaskRegister(doc, tasks, colors);

  // ==================== SECTION 3: EVIDENCE & ATTACHMENT INDEX ====================
  drawEvidenceIndex(doc, messages, colors);

  // 4. Headers and footers across ALL buffered pages (Cover is Page 1 of N)
  const range = doc.bufferedPageRange();
  const totalPages = range.count;

  for (let i = range.start, end = range.start + range.count; i < end; i++) {
    doc.switchToPage(i);

    const currentPageNum = i + 1;

    // Temporarily set bottom margin to 0 to prevent automatic page breaks when footer is written
    doc.page.margins.bottom = 0;

    // Footer page number on ALL pages
    doc.fontSize(7.5).fillColor(colors.textMuted);
    const footerText = cleanTextForPdf(`Case: ${caseDoc.title} | Page ${currentPageNum} of ${totalPages}`);
    doc.text(
      footerText,
      50,
      doc.page.height - 22,
      { align: "center", width: doc.page.width - 100 }
    );

    // Header on pages 2 onwards
    if (i > 0) {
      doc.fontSize(7.5).fillColor(colors.textMuted);
      doc.text("CASE DOSSIER & AUDIT RECORD", 50, 25);
      doc.text(`Archived: ${archiveDate}`, 50, 25, {
        align: "right",
        width: doc.page.width - 100,
      });
      doc.strokeColor(colors.borderBox).lineWidth(0.5).moveTo(50, 35).lineTo(doc.page.width - 50, 35).stroke();
    }

    // Restore bottom margin
    doc.page.margins.bottom = 55;
  }

  doc.end();
};

module.exports = {
  generateCaseChatPdf,
  cleanTextForPdf,
};
