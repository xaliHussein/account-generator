import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { encryptData } from './encryption';

// Default website domain for QR codes (GitHub Pages with hash routing)
const DEFAULT_DOMAIN = 'https://xalihussein.github.io/account-generation/#/view';

// Card color options
const CARD_COLORS = {
    blue: { r: 0, g: 136, b: 204 },
    black: { r: 30, g: 30, b: 30 }
};

/**
 * Generate QR code data URL from account data (encrypted)
 * @param {Object} account - Account data
 * @param {string} websiteDomain - Base URL for QR code
 * @param {string} cardColor - Card color: 'blue' or 'black'
 */
const generateQRDataURL = async (account, websiteDomain = DEFAULT_DOMAIN, cardColor = 'blue') => {
    const accountData = {
        sn: account.serialNumber,
        email: account.email,
        pass: account.password,
        name: `${account.firstName} ${account.lastName}`,
        firstName: account.firstName,
        lastName: account.lastName,
        dob: account.birthday,
        id: account.accountId,
        color: cardColor
    };

    // Encrypt account data for security
    const encryptedData = await encryptData(accountData);
    const qrValue = `${websiteDomain}?data=${encodeURIComponent(encryptedData)}`;

    try {
        const dataURL = await QRCode.toDataURL(qrValue, {
            width: 200,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M'
        });
        return dataURL;
    } catch (error) {
        console.error('QR code generation failed:', error);
        throw error;
    }
};

/**
 * Generate a PDF for a single account card - Standard CR80 card size
 * Includes both front and back of the card
 */
export const generateAccountPDF = async (account, batchNumber = 1, customLogo = null, websiteDomain = DEFAULT_DOMAIN, cardColor = 'blue', cardBackLogo = null, accountIdType = 'apple') => {
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [53.98, 85.6], // Standard CR80 credit card size (height, width)
    });

    // Generate front card content only (card back is downloaded separately)
    await generateCardContent(pdf, account, batchNumber, customLogo, websiteDomain, cardColor);

    return pdf;
};

/**
 * Generate the card content matching the preview exactly
 * Standard CR80 card: 85.6mm x 53.98mm
 */
const generateCardContent = async (pdf, account, batchNumber = 1, customLogo = null, websiteDomain = DEFAULT_DOMAIN, cardColor = 'blue') => {
    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();
    const cardPadding = 2; // Padding from edge to show rounded corners
    const cornerRadius = 3; // Rounded corners

    // Get the header color based on cardColor option
    const headerColor = CARD_COLORS[cardColor] || CARD_COLORS.blue;

    // Card background with rounded corners
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(cardPadding, cardPadding, width - cardPadding * 2, height - cardPadding * 2, cornerRadius, cornerRadius, 'F');

    // Card border with rounded corners
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(cardPadding, cardPadding, width - cardPadding * 2, height - cardPadding * 2, cornerRadius, cornerRadius, 'S');

    // Header bar with rounded top corners (color based on cardColor)
    const headerHeight = 4;
    const headerY = cardPadding;
    pdf.setFillColor(headerColor.r, headerColor.g, headerColor.b);

    // Draw header with rounded top corners only
    pdf.roundedRect(cardPadding, headerY, width - cardPadding * 2, headerHeight + cornerRadius, cornerRadius, cornerRadius, 'F');
    // Cover the bottom rounded corners with a rectangle
    pdf.rect(cardPadding, headerY + headerHeight - 1, width - cardPadding * 2, cornerRadius + 1, 'F');

    // Header text - CENTERED VERTICALLY in header
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    // Determine header text based on email type
    const email = account.email.toLowerCase();
    const isGoogle = email.includes('@gmail.com') || email.includes('@googlemail.com');
    const headerText = isGoogle ? 'GOOGLE ID - USA ACCOUNT' : 'APPLE ID - USA ACCOUNT';
    // Center vertically: headerY + (headerHeight / 2) + small offset for text baseline
    pdf.text(headerText, width / 2, headerY + (headerHeight / 2) + 2, { align: 'center' });

    // Content area starts after header - INCREASED SPACING (5mm gap)
    const contentY = headerY + headerHeight + 5;
    const qrSize = 20;
    const qrX = cardPadding + 3;
    const qrY = contentY;

    // Generate and add real QR code
    try {
        const qrDataURL = await generateQRDataURL(account, websiteDomain, cardColor);
        pdf.addImage(qrDataURL, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch (error) {
        // Fallback: draw empty QR placeholder box
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.3);
        pdf.rect(qrX, qrY, qrSize, qrSize, 'S');
        pdf.setFontSize(5);
        pdf.setTextColor(100, 100, 100);
        pdf.text('QR Error', qrX + qrSize / 2, qrY + qrSize / 2, { align: 'center' });
    }

    // Right side - Credentials box
    const boxX = qrX + qrSize + 3;
    const boxY = contentY;
    const boxWidth = width - boxX - cardPadding - 3;
    const rowHeight = 6;
    const boxHeight = rowHeight * 2;

    // Credentials box with border
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(boxX, boxY, boxWidth, boxHeight, 1, 1, 'S');

    // Horizontal divider
    pdf.setLineWidth(0.2);
    pdf.line(boxX, boxY + rowHeight, boxX + boxWidth, boxY + rowHeight);

    // Vertical divider for labels
    const labelWidth = 10;
    pdf.line(boxX + labelWidth, boxY, boxX + labelWidth, boxY + boxHeight);

    // EMAIL row
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('EMAIL', boxX + 1.5, boxY + 4);

    pdf.setFontSize(5.5); // Smaller font to fit full email
    pdf.setFont('helvetica', 'normal');
    // Display full email without truncation
    pdf.text(account.email, boxX + labelWidth + 1.5, boxY + 4);

    // PASS row
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PASS', boxX + 1.5, boxY + rowHeight + 4);

    pdf.setFontSize(5.5); // Same font size as email
    pdf.setFont('helvetica', 'normal');
    // const passDisplay = account.password.length > 16 ? account.password.substring(0, 15) + '...' : account.password;
    pdf.text(account.password, boxX + labelWidth + 1.5, boxY + rowHeight + 4);

    // Name and DOB section
    const nameY = boxY + boxHeight + 4;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${account.firstName} ${account.lastName}`, boxX, nameY);

    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(85, 85, 85);
    pdf.text(`DOB: ${account.birthday}`, boxX, nameY + 4);

    // Bottom section - Serial Number (below QR code)
    const bottomY = height - cardPadding - 6;

    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(136, 136, 136);
    pdf.text('SN:', qrX, bottomY);

    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(account.serialNumber, qrX, bottomY + 4);

    // Right side bottom: Logo above VIP Badge
    const iconSize = 12;
    const badgeWidth = 22;
    const badgeHeight = 4;

    // Center the icon and badge in the right section
    const rightSectionX = width - cardPadding - 4 - Math.max(iconSize, badgeWidth);
    const iconX = rightSectionX + (Math.max(iconSize, badgeWidth) - iconSize) / 2;
    const badgeX = rightSectionX + (Math.max(iconSize, badgeWidth) - badgeWidth) / 2;

    // Position with spacing from bottom edge (increased to 24)
    const iconY = height - cardPadding - 19;
    const badgeY = iconY + iconSize + 2;

    if (customLogo) {
        // Use custom logo
        try {
            pdf.addImage(customLogo, 'PNG', iconX, iconY, iconSize, iconSize);
        } catch (error) {
            // Fallback to default icon
            drawDefaultIcon(pdf, iconX, iconY, iconSize);
        }
    } else {
        // Draw default App Store icon
        drawDefaultIcon(pdf, iconX, iconY, iconSize);
    }

    // VIP Badge (below the logo)
    const badgeText = `VIP-BATCH-${String(batchNumber).padStart(2, '0')}`;

    pdf.setFillColor(0, 0, 0);
    pdf.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(badgeText, badgeX + badgeWidth / 2, badgeY + 2.8, { align: 'center' });
};

/**
 * Draw default App Store icon
 */
const drawDefaultIcon = (pdf, iconX, iconY, iconSize) => {
    pdf.setFillColor(0, 122, 255);
    pdf.roundedRect(iconX, iconY, iconSize, iconSize, 2, 2, 'F');

    // App Store 'A' symbol
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text('A', iconX + iconSize / 2, iconY + iconSize / 2 + 2, { align: 'center' });
};

/**
 * Generate the card back content
 * Design: Centered logo, APPLE ID, USA ACCOUNT, VIP-BATCH badge
 */
const generateCardBackContent = async (pdf, batchNumber = 1, customLogo = null, cardColor = 'blue', accountIdType = 'apple') => {
    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();
    const cardPadding = 2;
    const cornerRadius = 3;

    // Get border color based on card color - using black to match credentials box border
    const borderColor = cardColor === 'black' ? { r: 30, g: 30, b: 30 } : { r: 0, g: 0, b: 0 };

    // Card background with rounded corners
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(cardPadding, cardPadding, width - cardPadding * 2, height - cardPadding * 2, cornerRadius, cornerRadius, 'F');

    // Card border with rounded corners
    pdf.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(cardPadding, cardPadding, width - cardPadding * 2, height - cardPadding * 2, cornerRadius, cornerRadius, 'S');

    // Center calculations
    const centerX = width / 2;
    const centerY = height / 2;

    // Logo - centered at top portion
    const logoSize = 18;
    const logoX = centerX - logoSize / 2;
    const logoY = centerY - 18;

    if (customLogo) {
        try {
            pdf.addImage(customLogo, 'PNG', logoX, logoY, logoSize, logoSize);
        } catch (error) {
            // Fallback to default icon
            drawLargeAppStoreIcon(pdf, logoX, logoY, logoSize);
        }
    } else {
        drawLargeAppStoreIcon(pdf, logoX, logoY, logoSize);
    }

    // Account ID type text (APPLE ID or GOOGLE ID)
    const accountIdText = accountIdType === 'google' ? 'GOOGLE ID' : 'APPLE ID';
    pdf.setTextColor(29, 29, 31);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(accountIdText, centerX, centerY + 6, { align: 'center' });

    // USA ACCOUNT text
    pdf.setTextColor(134, 134, 139);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('USA ACCOUNT', centerX, centerY + 11, { align: 'center' });

    // VIP-BATCH badge
    const badgeText = `VIP-BATCH-${String(batchNumber).padStart(2, '0')}`;
    const badgeWidth = 24;
    const badgeHeight = 5;
    const badgeX = centerX - badgeWidth / 2;
    const badgeY = centerY + 16;

    pdf.setDrawColor(29, 29, 31);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1, 1, 'S');

    pdf.setTextColor(29, 29, 31);
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(badgeText, centerX, badgeY + 3.5, { align: 'center' });
};

/**
 * Draw large App Store icon for card back
 */
const drawLargeAppStoreIcon = (pdf, x, y, size) => {
    // Gradient-like blue background
    pdf.setFillColor(0, 136, 204);
    pdf.roundedRect(x, y, size, size, 3, 3, 'F');

    // Add gradient effect overlay
    pdf.setFillColor(24, 191, 255);
    pdf.roundedRect(x, y, size, size * 0.4, 3, 0, 'F');

    // Simple 'A' for App Store
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('A', x + size / 2, y + size / 2 + 3, { align: 'center' });
};

/**
 * Generate PDFs for multiple accounts and return as blob
 */
export const generateMultipleAccountsPDF = async (accounts, onProgress, batchNumber = 1, customLogo = null, websiteDomain = DEFAULT_DOMAIN, cardColor = 'blue') => {
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [53.98, 85.6], // Standard CR80 credit card size
    });

    for (let i = 0; i < accounts.length; i++) {
        if (i > 0) {
            pdf.addPage();
        }

        const account = accounts[i];
        await generateCardContent(pdf, account, batchNumber, customLogo, websiteDomain, cardColor);

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
export const downloadAccountPDF = async (account, batchNumber = 1, customLogo = null, websiteDomain = DEFAULT_DOMAIN, cardColor = 'blue', cardBackLogo = null, accountIdType = 'apple') => {
    const pdf = await generateAccountPDF(account, batchNumber, customLogo, websiteDomain, cardColor, cardBackLogo, accountIdType);
    pdf.save(`account-${account.username}-${account.serialNumber}.pdf`);
};

/**
 * Generate and download card back only as a separate PDF
 */
export const downloadCardBackPDF = async (batchNumber = 1, customLogo = null, cardColor = 'blue', accountIdType = 'apple') => {
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [53.98, 85.6], // Standard CR80 credit card size (height, width)
    });

    await generateCardBackContent(pdf, batchNumber, customLogo, cardColor, accountIdType);
    pdf.save(`card-back-${accountIdType}-batch-${String(batchNumber).padStart(2, '0')}.pdf`);
};

export default {
    generateAccountPDF,
    generateMultipleAccountsPDF,
    downloadAccountPDF,
    downloadCardBackPDF,
};
