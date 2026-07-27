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
const renderTextWithMentions = (doc, text, mentions, colors) => {
  if (!text) return;
  
  const cleanText = cleanTextForPdf(text);
  const mentionUsers = (mentions || []).filter(m => typeof m === "object" && m !== null && m.name);
  if (mentionUsers.length === 0) {
    doc.text(cleanText, 65, doc.y, { lineGap: 3, width: 460 });
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
    doc.text(cleanText, 65, doc.y, { lineGap: 3, width: 460 });
    return;
  }
  
  const startX = 65;
  tokens.forEach((token, index) => {
    const isLast = index === tokens.length - 1;
    if (token.type === "mention") {
      doc.font("Helvetica-Bold").fillColor(colors.primary);
    } else {
      doc.font("Helvetica").fillColor(colors.textDark);
    }
    
    if (index === 0) {
      doc.text(token.value, startX, doc.y, { continued: !isLast, lineGap: 3, width: 460 });
    } else {
      doc.text(token.value, { continued: !isLast, lineGap: 3, width: 460 });
    }
  });
};

/**
 * Calculates estimated vertical space required for a message block in points
 */
const getMessageHeight = (doc, message, colors) => {
  let height = 0;
  
  // Sender name row height
  height += 12;
  
  // Spacing under sender row
  height += 3;

  const contentWidth = 460;

  if (message.isDeleted) {
    height += 15;
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
      height += textHeight + 16; // text height + title + padding
    }

    // Message text content height
    doc.font("Helvetica").fontSize(9.5);
    if (message.content) {
      const textClean = cleanTextForPdf(message.content);
      const textHeight = doc.heightOfString(textClean, { lineGap: 3, width: contentWidth });
      height += textHeight;
    }

    // Attachment height spacing
    if (message.type !== "text") {
      if (message.content) {
        height += 5;
      }
      if (message.type === "image") {
        height += 175; // image fit block + padding
      } else {
        height += 55; // standard fallback/document card box
      }
    }
  }

  // Margin spacing below the message
  height += 15;

  return height;
};

/**
 * Generates a case chat history PDF
 * @param {Object} caseDoc - The Case document populated with participants
 * @param {Array} messages - Chronological list of message documents populated with sender, mentions and replies
 * @param {stream.Writable} writeStream - Writable stream to pipe the PDF to
 */
/**
 * Draws the cover page of the PDF document
 */
const drawCoverPage = (doc, caseDoc, colors, totalMessages, totalAttachments, creatorName, archiveDate) => {
  // Top accent bar
  doc.save().rect(0, 0, 595, 15).fill(colors.primary).restore();

  doc.y = 60;
  doc.fillColor(colors.textMuted).fontSize(9.5).font("Helvetica-Bold").text("CASE DISCUSSION ARCHIVE & AUDIT RECORD", { tracking: 0.1 });
  doc.moveDown(1.5);

  const cleanTitle = cleanTextForPdf(caseDoc.title);
  doc.fillColor(colors.primary).fontSize(24).font("Helvetica-Bold").text(cleanTitle, { lineGap: 6 });
  doc.moveDown(0.5);

  // Subtitle
  doc.fillColor(colors.textMuted).fontSize(10.5).font("Helvetica").text("Official record generated automatically from case room transcript.");
  doc.moveDown(1.8);

  if (caseDoc.description) {
    const cleanDesc = cleanTextForPdf(caseDoc.description);
    doc.fillColor(colors.textDark).fontSize(10.5).font("Helvetica-Oblique").text(cleanDesc, {
      lineGap: 5,
      width: 495
    });
    doc.moveDown(2);
  }

  // Summary Metrics Box
  const boxStartY = doc.y;
  const boxHeight = 135;

  doc.save()
     .rect(50, boxStartY, 495, boxHeight)
     .fillAndStroke(colors.bgBox, colors.borderBox);

  doc.fillColor(colors.primary).font("Helvetica-Bold").fontSize(11);
  doc.text("DOCUMENT SUMMARY", 65, boxStartY + 12);
  doc.strokeColor(colors.borderBox).lineWidth(1).moveTo(65, boxStartY + 28).lineTo(530, boxStartY + 28).stroke();

  doc.fillColor(colors.textDark).font("Helvetica-Bold").fontSize(9.5);
  doc.text("Case Creator:", 65, boxStartY + 38);
  doc.font("Helvetica").text(creatorName, 180, boxStartY + 38);

  doc.font("Helvetica-Bold").text("Status:", 65, boxStartY + 52);
  doc.font("Helvetica").text("Archived (Completed)", 180, boxStartY + 52);

  doc.font("Helvetica-Bold").text("Archive Date:", 65, boxStartY + 66);
  doc.font("Helvetica").text(archiveDate, 180, boxStartY + 66);

  doc.font("Helvetica-Bold").text("Export Date:", 65, boxStartY + 80);
  doc.font("Helvetica").text(formatDateTime(new Date()), 180, boxStartY + 80);

  doc.font("Helvetica-Bold").text("Total Participants:", 65, boxStartY + 94);
  doc.font("Helvetica").text(`${caseDoc.participants.length} users`, 180, boxStartY + 94);

  doc.font("Helvetica-Bold").text("Total Messages:", 65, boxStartY + 108);
  doc.font("Helvetica").text(`${totalMessages} messages`, 180, boxStartY + 108);

  doc.font("Helvetica-Bold").text("Total Attachments:", 65, boxStartY + 122);
  doc.font("Helvetica").text(`${totalAttachments} files`, 180, boxStartY + 122);

  doc.restore();

  // Participant list block below metrics
  doc.y = boxStartY + boxHeight + 25;
  doc.fillColor(colors.primary).font("Helvetica-Bold").fontSize(12).text("PARTICIPANTS");
  doc.strokeColor(colors.borderBox).lineWidth(1).moveTo(50, doc.y + 4).lineTo(545, doc.y + 4).stroke();
  doc.y += 12;

  doc.fillColor(colors.textDark).font("Helvetica").fontSize(9.5);
  const participantRows = caseDoc.participants.map((p) => `${cleanTextForPdf(p.name)} (${p.email})`);
  doc.text(participantRows.join("\n"), 50, doc.y, { lineGap: 5, width: 495 });

  // Temporarily set bottom margin to 0 for the cover page to allow the footer note
  // to be written close to the bottom without triggering auto page break
  doc.page.margins.bottom = 0;

  // Cover Page Footer Note
  doc.fillColor(colors.textMuted).font("Helvetica").fontSize(8);
  doc.text("CaseRoom Document Repository • Private & Confidential", 50, doc.page.height - 35, { align: "center", width: 495 });

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
    
    doc.fillColor(colors.textDark).font("Helvetica-Bold").fontSize(9.5);
    doc.text(senderName, 50, doc.y, { continued: true });
    doc.fillColor(colors.textMuted).font("Helvetica").fontSize(8).text(timestamp, { align: "right" });
    doc.moveDown(0.2);

    doc.fillColor(colors.textMuted).font("Helvetica-Oblique").fontSize(9.5).text("[Message Deleted]", 65, doc.y);
    doc.moveDown(1.5);
    return;
  }

  const senderName = cleanTextForPdf(message.senderId?.name || "Unknown User");

  // Sender Row
  doc.fillColor(colors.textDark).font("Helvetica-Bold").fontSize(9.5);
  doc.text(senderName, 50, doc.y, { continued: true });
  doc.fillColor(colors.textMuted).font("Helvetica").fontSize(8).text(timestamp, { align: "right" });
  doc.moveDown(0.3);

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
    doc.fontSize(8.5).font("Helvetica-Oblique");
    const quoteHeight = doc.heightOfString(replyClean, { width: 430 });
    const replyHeight = 12 + quoteHeight;

    // Solid vertical bar
    doc.strokeColor(colors.primary)
       .lineWidth(3)
       .moveTo(70, replyY)
       .lineTo(70, replyY + replyHeight + 6)
       .stroke();

    // Background rect
    doc.rect(73, replyY, 442, replyHeight + 6)
       .fill(colors.bgBox);

    // Quote header
    doc.fillColor(colors.textMuted).font("Helvetica-Bold").fontSize(8);
    doc.text(`Reference to ${replySender}'s message:`, 80, replyY + 3);

    // Quote content
    doc.fillColor(colors.textDark).font("Helvetica-Oblique").fontSize(8.5);
    doc.text(replyClean, 80, replyY + 15, { width: 430 });
    doc.restore();

    doc.y = replyY + replyHeight + 12;
  }

  // Message Body and attachments
  doc.fontSize(9.5).font("Helvetica").fillColor(colors.textDark);

  if (message.type === "text") {
    renderTextWithMentions(doc, message.content, message.mentions, colors);
  } else if (message.type === "image") {
    if (message.content) {
      renderTextWithMentions(doc, message.content, message.mentions, colors);
      doc.moveDown(0.5);
    }

    const buffer = await fetchImageBuffer(message.fileUrl);
    if (buffer) {
      try {
        doc.save();
        // Draw subtle image container border
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
           .fontSize(9.5);
      } catch (imgError) {
        console.error("PDFKit image rendering failed:", imgError.message);
        const cleanFileName = cleanTextForPdf(message.fileName);
        
        // Fallback box
        const boxY = doc.y;
        doc.save();
        doc.rect(65, boxY, 460, 45).fillAndStroke(colors.bgBox, colors.borderBox);
        doc.fillColor(colors.textDark).font("Helvetica-Bold").fontSize(9);
        doc.text("Image Attachment", 75, boxY + 10);
        doc.font("Helvetica").fillColor(colors.linkBlue);
        doc.text(cleanFileName, 75, boxY + 24, { link: message.fileUrl, underline: true });
        doc.restore();
        doc.y = boxY + 50;
      }
    } else {
      const cleanFileName = cleanTextForPdf(message.fileName);
      
      // Styled image fallback card box
      const boxY = doc.y;
      doc.save();
      doc.rect(65, boxY, 460, 45).fillAndStroke(colors.bgBox, colors.borderBox);
      doc.fillColor(colors.textDark).font("Helvetica-Bold").fontSize(9);
      doc.text("Image Attachment", 75, boxY + 10);
      doc.font("Helvetica").fillColor(colors.linkBlue);
      doc.text(cleanFileName, 75, boxY + 24, { link: message.fileUrl, underline: true });
      doc.restore();
      doc.y = boxY + 50;
    }
  } else {
    if (message.content) {
      renderTextWithMentions(doc, message.content, message.mentions, colors);
      doc.moveDown(0.5);
    }

    const cleanFileName = cleanTextForPdf(message.fileName);
    const sizeStr = message.fileSize ? ` (${(message.fileSize / 1024).toFixed(1)} kB)` : "";
    const label = message.type.charAt(0).toUpperCase() + message.type.slice(1);

    // Styled attachment card box
    const boxY = doc.y;
    doc.save();
    doc.rect(65, boxY, 460, 45).fillAndStroke(colors.bgBox, colors.borderBox);
    doc.fillColor(colors.textDark).font("Helvetica-Bold").fontSize(9);
    doc.text(`${label} Attachment`, 75, boxY + 10);
    doc.font("Helvetica").fillColor(colors.linkBlue);
    doc.text(`${cleanFileName}${sizeStr}`, 75, boxY + 24, { link: message.fileUrl, underline: true });
    doc.restore();
    doc.y = boxY + 50;
  }

  // Whitespace space between chat records
  doc.moveDown(1.5);
};

/**
 * Generates a case chat history PDF
 * @param {Object} caseDoc - The Case document populated with participants
 * @param {Array} messages - Chronological list of message documents populated with sender, mentions and replies
 * @param {stream.Writable} writeStream - Writable stream to pipe the PDF to
 */
const generateCaseChatPdf = async (caseDoc, messages, writeStream) => {
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
  const totalAttachments = messages.filter(m => m.type !== "text" && !m.isDeleted).length;

  // ==================== PAGE 1: COVER PAGE ====================
  drawCoverPage(doc, caseDoc, colors, messages.length, totalAttachments, creatorName, archiveDate);

  // Add Page to start the Transcript
  doc.addPage();

  // ==================== PAGE 2+: CONVERSATION TRANSCRIPT ====================
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

      if (doc.y + 40 > doc.page.height - 55) {
        doc.addPage();
      }

      doc.moveDown(0.5);
      doc.fillColor(colors.primary).font("Helvetica-Bold").fontSize(10);

      const cleanDate = cleanTextForPdf(msgDateStr);
      doc.text(cleanDate, { align: "center" });
      
      // Separator Line
      doc.strokeColor(colors.borderBox).lineWidth(0.5).moveTo(50, doc.y + 4).lineTo(545, doc.y + 4).stroke();
      doc.y += 10;
      doc.moveDown(0.5);
    }

    const msgHeight = getMessageHeight(doc, message, colors);

    // Prevent message splitting
    if (doc.y + msgHeight > doc.page.height - 55) {
      doc.addPage();
    }

    await drawMessage(doc, message, colors);
  }

  // 4. Headers and footers on buffered pages (excluding cover page at index 0)
  const range = doc.bufferedPageRange();
  const totalContentPages = range.count - 1; // page 1 is the cover page

  for (let i = range.start, end = range.start + range.count; i < end; i++) {
    doc.switchToPage(i);

    // Suppress header and footer completely on the cover page (index 0)
    if (i === 0) continue;

    const contentPageNum = i;

    // Temporarily set bottom margin to 0 to prevent automatic page breaks when footer is written below standard bottom margin
    doc.page.margins.bottom = 0;

    // Footer page number
    doc.fontSize(8).fillColor(colors.textMuted);
    const footerText = cleanTextForPdf(`Case: ${caseDoc.title} | Page ${contentPageNum} of ${totalContentPages}`);
    doc.text(
      footerText,
      50,
      doc.page.height - 35,
      { align: "center", width: doc.page.width - 100 }
    );

    // Consistent Header (excluding cover page)
    doc.fontSize(8).fillColor(colors.textMuted);
    doc.text("CASE DISCUSSION RECORD", 50, 25);
    doc.text(`Archived: ${archiveDate}`, 50, 25, {
      align: "right",
      width: doc.page.width - 100,
    });
    doc.strokeColor(colors.borderBox).lineWidth(0.5).moveTo(50, 35).lineTo(doc.page.width - 50, 35).stroke();

    // Restore bottom margin
    doc.page.margins.bottom = 55;
  }

  doc.end();
};

module.exports = {
  generateCaseChatPdf,
  cleanTextForPdf,
};
