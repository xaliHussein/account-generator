import jsPDF from 'jspdf';

/**
 * Generate a PDF for a single account card - Apple ID style
 * Matches the Card Preview component exactly
 */
export const generateAccountPDF = async (account, batchNumber = 1) => {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [90, 140], // Card size to match preview
  });

  await generateCardContent(pdf, account, batchNumber);
  return pdf;
};

/**
 * Generate the card content matching the preview exactly
 */
const generateCardContent = async (pdf, account, batchNumber = 1) => {
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const margin = 4;
  const cornerRadius = 4;
  
  // White background with rounded border
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(margin, margin, width - margin * 2, height - margin * 2, cornerRadius, cornerRadius, 'F');
  
  // Card border
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, margin, width - margin * 2, height - margin * 2, cornerRadius, cornerRadius, 'S');
  
  // Blue header bar
  const headerHeight = 12;
  const headerY = margin;
  pdf.setFillColor(0, 136, 204);
  
  // Draw header with rounded top corners only
  pdf.roundedRect(margin, headerY, width - margin * 2, headerHeight + 2, cornerRadius, cornerRadius, 'F');
  // Cover bottom round corners with rectangle
  pdf.rect(margin, headerY + headerHeight - 2, width - margin * 2, 4, 'F');
  
  // Header text
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('APPLE ID - USA ACCOUNT', width / 2, headerY + 8, { align: 'center' });
  
  // Content area starts after header
  const contentY = headerY + headerHeight + 5;
  const qrSize = 30;
  const qrX = margin + 6;
  const qrY = contentY;
  
  // QR Code border
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.4);
  pdf.rect(qrX, qrY, qrSize, qrSize, 'S');
  
  // Generate QR pattern
  pdf.setFillColor(0, 0, 0);
  const cellSize = 1.3;
  const qrPattern = generateQRPattern(account.serialNumber);
  const qrCells = 18;
  const qrPadding = (qrSize - qrCells * cellSize) / 2;
  
  for (let row = 0; row < qrCells; row++) {
    for (let col = 0; col < qrCells; col++) {
      if (qrPattern[row * qrCells + col]) {
        pdf.rect(qrX + qrPadding + col * cellSize, qrY + qrPadding + row * cellSize, cellSize, cellSize, 'F');
      }
    }
  }
  
  // Right side - Credentials box
  const boxX = qrX + qrSize + 6;
  const boxY = contentY;
  const boxWidth = width - boxX - margin - 6;
  const rowHeight = 9;
  const boxHeight = rowHeight * 2;
  
  // Credentials box with border
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.6);
  pdf.roundedRect(boxX, boxY, boxWidth, boxHeight, 1.5, 1.5, 'S');
  
  // Horizontal divider
  pdf.setLineWidth(0.3);
  pdf.line(boxX, boxY + rowHeight, boxX + boxWidth, boxY + rowHeight);
  
  // Vertical divider for labels
  const labelWidth = 14;
  pdf.line(boxX + labelWidth, boxY, boxX + labelWidth, boxY + boxHeight);
  
  // EMAIL row
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('EMAIL', boxX + 2, boxY + 5.5);
  
  pdf.setFontSize(7);
  const emailDisplay = account.email.length > 24 ? account.email.substring(0, 23) + '...' : account.email;
  pdf.text(emailDisplay, boxX + labelWidth + 2, boxY + 5.5);
  
  // PASS row
  pdf.setFontSize(6);
  pdf.text('PASS', boxX + 2, boxY + rowHeight + 5.5);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(account.password, boxX + labelWidth + 2, boxY + rowHeight + 5.5);
  
  // Name and DOB section
  const nameY = boxY + boxHeight + 6;
  
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`${account.firstName} ${account.lastName}`, boxX, nameY);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(85, 85, 85);
  pdf.text(`DOB: ${account.birthday}`, boxX, nameY + 5);
  
  // Bottom section
  const bottomY = height - margin - 16;
  
  // Serial Number (below QR code)
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(136, 136, 136);
  pdf.text('SN:', qrX, bottomY + 2);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text(account.serialNumber, qrX, bottomY + 7);
  
  // App Store icon (simplified blue rounded square with 'A')
  const iconSize = 16;
  const iconX = width - margin - iconSize - 6;
  const iconY = bottomY - 4;
  
  pdf.setFillColor(0, 122, 255);
  pdf.roundedRect(iconX, iconY, iconSize, iconSize, 3, 3, 'F');
  
  // App Store 'A' symbol
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('A', iconX + iconSize / 2, iconY + iconSize / 2 + 3, { align: 'center' });
  
  // VIP Badge
  const badgeText = `VIP-BATCH-${String(batchNumber).padStart(2, '0')}`;
  const badgeWidth = 28;
  const badgeHeight = 5;
  const badgeX = width - margin - badgeWidth - 4;
  const badgeY = height - margin - 8;
  
  pdf.setFillColor(0, 0, 0);
  pdf.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.text(badgeText, badgeX + badgeWidth / 2, badgeY + 3.5, { align: 'center' });
};

/**
 * Generate a pseudo-random QR pattern based on serial
 */
const generateQRPattern = (serial) => {
  const size = 18;
  const pattern = new Array(size * size).fill(false);
  
  // Fixed finder patterns (corners) - 7x7
  const finderPattern = [
    1,1,1,1,1,1,1,
    1,0,0,0,0,0,1,
    1,0,1,1,1,0,1,
    1,0,1,1,1,0,1,
    1,0,1,1,1,0,1,
    1,0,0,0,0,0,1,
    1,1,1,1,1,1,1
  ];
  
  // Top-left finder
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      pattern[row * size + col] = finderPattern[row * 7 + col] === 1;
    }
  }
  
  // Top-right finder
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      pattern[row * size + (size - 7 + col)] = finderPattern[row * 7 + col] === 1;
    }
  }
  
  // Bottom-left finder
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      pattern[(size - 7 + row) * size + col] = finderPattern[row * 7 + col] === 1;
    }
  }
  
  // Generate data pattern from serial number
  let seed = 0;
  for (let i = 0; i < serial.length; i++) {
    seed += serial.charCodeAt(i) * (i + 1);
  }
  
  for (let i = 0; i < size * size; i++) {
    const row = Math.floor(i / size);
    const col = i % size;
    
    // Skip finder pattern areas
    const inTopLeft = row < 8 && col < 8;
    const inTopRight = row < 8 && col >= size - 8;
    const inBottomLeft = row >= size - 8 && col < 8;
    
    if (!inTopLeft && !inTopRight && !inBottomLeft) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      pattern[i] = (seed % 3) === 0;
    }
  }
  
  return pattern;
};

/**
 * Generate PDFs for multiple accounts and return as blob
 */
export const generateMultipleAccountsPDF = async (accounts, onProgress, batchNumber = 1) => {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [90, 140],
  });

  for (let i = 0; i < accounts.length; i++) {
    if (i > 0) {
      pdf.addPage();
    }
    
    const account = accounts[i];
    await generateCardContent(pdf, account, batchNumber);
    
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: accounts.length,
        percentage: Math.round(((i + 1) / accounts.length) * 100),
      });
    }
  }

  return pdf.output('blob');
};

/**
 * Download a single account as PDF
 */
export const downloadAccountPDF = async (account, batchNumber = 1) => {
  const pdf = await generateAccountPDF(account, batchNumber);
  pdf.save(`account-${account.username}-${account.serialNumber}.pdf`);
};

export default {
  generateAccountPDF,
  generateMultipleAccountsPDF,
  downloadAccountPDF,
};
