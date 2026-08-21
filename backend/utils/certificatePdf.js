const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { getLogoBase64 } = require('./logoUtil');

const COLORS = {
  primary: '#1E3A8A',
  secondary: '#6366F1',
  accent: '#10B981',
  gold: '#D97706',
  purple: '#7C3AED',
  white: '#FFFFFF',
  light: '#EEF2FF',
  lightGold: '#FEF3C7',
  gray: '#64748B',
  dark: '#0F172A'
};

const getGrade = (percentage) => {
  if (percentage >= 90) return { name: 'EXCELLENT', color: '#059669', message: 'Outstanding achievement' };
  if (percentage >= 80) return { name: 'DISTINCTION', color: '#2563EB', message: 'Excellent performance' };
  if (percentage >= 70) return { name: 'MERIT', color: '#7C3AED', message: 'Very good performance' };
  if (percentage >= 60) return { name: 'CREDIT', color: '#D97706', message: 'Good performance' };
  return { name: 'PASS', color: '#475569', message: 'Satisfactory completion' };
};

const formatCertId = (certificateId) =>
  `${certificateId.slice(0, 8)}-${certificateId.slice(8, 16)}-${certificateId.slice(16, 24)}`;

const drawHeaderBand = (doc, pageWidth, margin) => {
  const bandHeight = 92;
  const innerWidth = pageWidth - margin * 2;
  const steps = [
    { color: '#1E3A8A', width: innerWidth * 0.34 },
    { color: '#4338CA', width: innerWidth * 0.33 },
    { color: '#7C3AED', width: innerWidth * 0.33 }
  ];

  let x = margin;
  steps.forEach((step) => {
    doc.save().rect(x, margin, step.width + 1, bandHeight).fill(step.color).restore();
    x += step.width;
  });

  doc.save()
    .rect(margin, margin + bandHeight - 4, innerWidth, 4)
    .fill(COLORS.gold)
    .restore();

  return { bandBottom: margin + bandHeight, contentStart: margin + bandHeight + 18 };
};

const drawBorders = (doc, pageWidth, pageHeight, margin) => {
  doc.save()
    .lineWidth(2.5)
    .strokeColor(COLORS.primary)
    .rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2)
    .stroke()
    .restore();

  doc.save()
    .lineWidth(1)
    .strokeColor(COLORS.gold)
    .rect(margin + 8, margin + 8, pageWidth - margin * 2 - 16, pageHeight - margin * 2 - 16)
    .stroke()
    .restore();

  const corner = 22;
  const corners = [
    [margin, margin],
    [pageWidth - margin - corner, margin],
    [margin, pageHeight - margin - corner],
    [pageWidth - margin - corner, pageHeight - margin - corner]
  ];

  corners.forEach(([x, y]) => {
    doc.save().rect(x, y, corner, 3).fill(COLORS.secondary).restore();
    doc.save().rect(x, y, 3, corner).fill(COLORS.secondary).restore();
  });
};

const drawLogo = (doc, pageWidth, margin, bandBottom) => {
  const logoBase64 = getLogoBase64();
  const logoSize = 48;
  const logoX = (pageWidth - logoSize) / 2;
  const logoY = margin + 14;

  if (logoBase64) {
    try {
      const logoBuffer = Buffer.from(logoBase64.split(',')[1], 'base64');
      doc.save()
        .roundedRect(logoX - 5, logoY - 5, logoSize + 10, logoSize + 10, 8)
        .fill(COLORS.white)
        .restore();
      doc.image(logoBuffer, logoX, logoY, { width: logoSize, height: logoSize, fit: [logoSize, logoSize] });
    } catch (_) {
      doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.white);
      doc.text('SkillSwap', margin, logoY + 10, { width: pageWidth - margin * 2, align: 'center' });
    }
  } else {
    doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.white);
    doc.text('SkillSwap', margin, logoY + 10, { width: pageWidth - margin * 2, align: 'center' });
  }

  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.lightGold);
  doc.text('LEARN • SHARE • GROW', margin, bandBottom - 18, {
    width: pageWidth - margin * 2,
    align: 'center'
  });
};

const centerText = (doc, text, y, pageWidth, margin, options = {}) => {
  const width = pageWidth - margin * 2;
  doc.text(text, margin, y, { width, align: 'center', ...options });
  return doc.heightOfString(text, { width, align: 'center', ...options }) + y;
};

const buildCertificatePdf = async ({
  user,
  exam,
  attempt,
  certificateId,
  verificationUrl,
  teacherName
}) => {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 36
  });

  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const percentage = Number(attempt.percentage || 0);
  const scoreText = `${percentage.toFixed(1)}%`;
  const grade = getGrade(percentage);
  const issueDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  drawBorders(doc, pageWidth, pageHeight, margin);
  const header = drawHeaderBand(doc, pageWidth, margin);
  drawLogo(doc, pageWidth, margin, header.bandBottom);
  let y = header.contentStart;

  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.gold);
  y = centerText(doc, 'SKILLSWAP PLATFORM', y, pageWidth, margin) + 6;

  doc.font('Helvetica-Bold').fontSize(30).fillColor(COLORS.primary);
  y = centerText(doc, 'CERTIFICATE OF ACHIEVEMENT', y, pageWidth, margin) + 8;

  doc.save()
    .moveTo(pageWidth / 2 - 120, y)
    .lineTo(pageWidth / 2 + 120, y)
    .lineWidth(1.5)
    .strokeColor(COLORS.gold)
    .stroke()
    .restore();
  y += 18;

  doc.font('Helvetica').fontSize(14).fillColor(COLORS.gray);
  y = centerText(doc, 'This is to proudly certify that', y, pageWidth, margin) + 14;

  doc.font('Helvetica-Bold').fontSize(34).fillColor(COLORS.dark);
  y = centerText(doc, user.name, y, pageWidth, margin) + 12;

  doc.font('Helvetica').fontSize(14).fillColor(COLORS.gray);
  y = centerText(doc, 'has successfully completed the examination in', y, pageWidth, margin) + 16;

  const skillText = exam.skillName || exam.title || 'Skill Assessment';
  doc.font('Helvetica-Bold').fontSize(22);
  const skillWidth = Math.min(doc.widthOfString(skillText) + 48, contentWidth - 40);
  const skillX = (pageWidth - skillWidth) / 2;

  doc.save()
    .roundedRect(skillX, y, skillWidth, 40, 10)
    .fill(COLORS.light)
    .restore();
  doc.fillColor(COLORS.secondary).text(skillText, skillX, y + 11, {
    width: skillWidth,
    align: 'center'
  });
  y += 54;

  doc.font('Helvetica').fontSize(11).fillColor(COLORS.gray);
  y = centerText(
    doc,
    'Demonstrating strong knowledge and practical understanding through a proctored assessment.',
    y,
    pageWidth,
    margin
  ) + 20;

  const badgeWidth = 118;
  const badgeHeight = 42;
  const gradeWidth = 150;
  const groupWidth = badgeWidth + gradeWidth + 20;
  const groupX = (pageWidth - groupWidth) / 2;

  doc.save()
    .roundedRect(groupX, y, badgeWidth, badgeHeight, 10)
    .fill(COLORS.accent)
    .restore();
  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.white);
  doc.text(scoreText, groupX, y + 10, { width: badgeWidth, align: 'center' });

  doc.font('Helvetica-Bold').fontSize(16).fillColor(grade.color);
  doc.text(grade.name, groupX + badgeWidth + 20, y + 8, { width: gradeWidth, align: 'left' });
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.gray);
  doc.text(grade.message, groupX + badgeWidth + 20, y + 26, { width: gradeWidth, align: 'left' });
  y += badgeHeight + 28;

  const footerY = pageHeight - margin - 92;
  doc.save()
    .moveTo(margin + 24, footerY - 12)
    .lineTo(pageWidth - margin - 24, footerY - 12)
    .lineWidth(0.8)
    .strokeColor('#CBD5E1')
    .stroke()
    .restore();

  const leftX = margin + 28;
  const centerX = pageWidth / 2 - 80;
  const qrSize = 68;
  const qrX = pageWidth - margin - qrSize - 24;

  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.primary);
  doc.text('CERTIFICATE DETAILS', leftX, footerY);
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.gray);
  doc.text(`ID: ${formatCertId(certificateId)}`, leftX, footerY + 14, { width: 220 });
  doc.text(`Issued: ${issueDate}`, leftX, footerY + 28, { width: 220 });
  doc.text(`Exam: ${exam.title || skillText}`, leftX, footerY + 42, { width: 220 });

  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.primary);
  doc.text('AUTHORIZED BY', centerX, footerY, { width: 160, align: 'center' });
  doc.save()
    .moveTo(centerX + 10, footerY + 24)
    .lineTo(centerX + 150, footerY + 24)
    .strokeColor(COLORS.secondary)
    .lineWidth(1)
    .stroke()
    .restore();
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.dark);
  doc.text(teacherName || 'SkillSwap Instructor', centerX, footerY + 30, {
    width: 160,
    align: 'center'
  });
  doc.font('Helvetica').fontSize(7).fillColor(COLORS.gray);
  doc.text('Certifying Authority', centerX, footerY + 44, { width: 160, align: 'center' });

  const qrImage = await QRCode.toBuffer(verificationUrl, { margin: 1, width: 180 });
  doc.save()
    .roundedRect(qrX - 4, footerY - 4, qrSize + 8, qrSize + 8, 6)
    .fill(COLORS.white)
    .restore();
  doc.image(qrImage, qrX, footerY, { width: qrSize, height: qrSize });
  doc.font('Helvetica').fontSize(7).fillColor(COLORS.gray);
  doc.text('Scan to verify', qrX - 10, footerY + qrSize + 4, {
    width: qrSize + 20,
    align: 'center'
  });

  doc.font('Helvetica').fontSize(7).fillColor(COLORS.gray);
  doc.text(`Verify at: ${verificationUrl}`, margin, pageHeight - margin - 14, {
    width: contentWidth,
    align: 'center'
  });

  doc.end();

  await new Promise((resolve) => {
    doc.on('end', resolve);
  });

  return Buffer.concat(buffers);
};

module.exports = {
  buildCertificatePdf,
  getGrade,
  formatCertId
};
