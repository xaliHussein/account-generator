import jsPDF from 'jspdf';
import QRCode from 'qrcode';

// Frontend base URL for QR codes - points to the view page
const FRONTEND_BASE_URL = import.meta.env.VITE_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://alishaker.it.com');

// Card color options
const CARD_COLORS = {
    blue: { r: 0, g: 136, b: 204 },
    black: { r: 30, g: 30, b: 30 }
};

/**
 * Generate QR code data URL from account data
 * Uses API endpoint with access token for security
 * @param {Object} account - Account data (must include id and accessToken)
 */
const generateQRDataURL = async (account) => {
    // Build QR URL pointing to frontend view page with token
    let qrValue;
    if (account.id && account.accessToken) {
        qrValue = `${FRONTEND_BASE_URL}/#/view?id=${account.id}&token=${account.accessToken}`;
    } else {
        // Fallback for legacy cards
        qrValue = `${FRONTEND_BASE_URL}/#/view?id=${account.id}`;
    }

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
export const generateAccountPDF = async (account, batchNumber = 1, customLogo = null, websiteDomain = null, cardColor = 'blue', cardBackLogo = null, accountIdType = 'apple') => {
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [53.98, 85.6], // Standard CR80 credit card size (height, width)
    });

    // Generate front card content only (card back is downloaded separately)
    await generateCardContent(pdf, account, batchNumber, customLogo, cardColor);

    return pdf;
};

/**
 * Generate the card content matching the preview exactly
 * Standard CR80 card: 85.6mm x 53.98mm
 */
const generateCardContent = async (pdf, account, batchNumber = 1, customLogo = null, cardColor = 'blue') => {
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
        const qrDataURL = await generateQRDataURL(account);
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
    pdf.text(String(account.email || ''), boxX + labelWidth + 1.5, boxY + 4);

    // PASS row
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PASS', boxX + 1.5, boxY + rowHeight + 4);

    pdf.setFontSize(5.5); // Same font size as email
    pdf.setFont('helvetica', 'normal');
    pdf.text(String(account.password || ''), boxX + labelWidth + 1.5, boxY + rowHeight + 4);

    // Name and DOB section
    const nameY = boxY + boxHeight + 4;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${account.firstName || ''} ${account.lastName || ''}`, boxX, nameY);

    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(85, 85, 85);
    pdf.text(`DOB: ${account.birthday || ''}`, boxX, nameY + 4);

    // Bottom section - Serial Number (below QR code)
    const bottomY = height - cardPadding - 6;
    // Use fallback serial number for legacy accounts
    const serialNumber = account.serialNumber || generateFallbackSN(account.id);

    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(136, 136, 136);
    pdf.text('SN:', qrX, bottomY);

    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(serialNumber, qrX, bottomY + 4);


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
export const downloadAccountPDF = async (account, batchNumber = 1, customLogo = null, websiteDomain = null, cardColor = 'blue', cardBackLogo = null, accountIdType = 'apple') => {
    const pdf = await generateAccountPDF(account, batchNumber, customLogo, websiteDomain, cardColor, cardBackLogo, accountIdType);
    pdf.save(`account-${account.username || account.email.split('@')[0]}-${account.serialNumber}.pdf`);
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

/**
 * Print sheet constants for default 60cm x 90cm printing plate
 * Card size: 85.6mm x 53.98mm (CR80 standard)
 */
const DEFAULT_BOARD = {
    width: 900,  // 90cm in mm (landscape)
    height: 600, // 60cm in mm
};

const CARD_DIMENSIONS = {
    cardWidth: 85.6,
    cardHeight: 53.98,
    margin: 2,   // Small margin between cards
};

/**
 * Calculate print sheet layout based on board dimensions
 */
const calculatePrintLayout = (boardWidth, boardHeight) => {
    const { cardWidth, cardHeight, margin } = CARD_DIMENSIONS;
    const cardsPerRow = Math.floor(boardWidth / (cardWidth + margin));
    const cardsPerCol = Math.floor(boardHeight / (cardHeight + margin));
    const cardsPerPage = cardsPerRow * cardsPerCol;
    return { cardsPerRow, cardsPerCol, cardsPerPage };
};

/**
 * Generate a print sheet PDF with multiple cards arranged on custom-sized pages
 * Optimized for bulk printing on professional card printers
 * 
 * @param {Array} accounts - Array of account objects
 * @param {Function} onProgress - Progress callback
 * @param {number} batchNumber - Batch number for VIP badge
 * @param {string} customLogo - Custom logo data URL
 * @param {string} websiteDomain - Base URL for QR codes
 * @param {string} cardColor - Card color theme
 * @param {number} boardWidth - Custom board width in mm (default: 900mm = 90cm)
 * @param {number} boardHeight - Custom board height in mm (default: 600mm = 60cm)
 * @returns {Promise<Blob>} PDF as blob
 */
export const generatePrintSheetPDF = async (accounts, onProgress, batchNumber = 1, customLogo = null, websiteDomain = null, cardColor = 'blue', boardWidth = DEFAULT_BOARD.width, boardHeight = DEFAULT_BOARD.height) => {
    const { cardWidth, cardHeight, margin } = CARD_DIMENSIONS;
    const width = boardWidth;
    const height = boardHeight;
    const { cardsPerRow, cardsPerCol, cardsPerPage } = calculatePrintLayout(width, height);
    
    // Calculate starting positions to center the grid on the page
    const gridWidth = cardsPerRow * cardWidth + (cardsPerRow - 1) * margin;
    const gridHeight = cardsPerCol * cardHeight + (cardsPerCol - 1) * margin;
    const startX = (width - gridWidth) / 2;
    const startY = (height - gridHeight) / 2;

    const totalPages = Math.ceil(accounts.length / cardsPerPage);
    
    // Determine orientation based on dimensions
    const isLandscape = width >= height;
    
    const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: isLandscape ? [height, width] : [width, height], // [shorter side, longer side]
    });

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) {
            pdf.addPage();
        }

        const pageStartIndex = pageIndex * cardsPerPage;
        const pageEndIndex = Math.min(pageStartIndex + cardsPerPage, accounts.length);
        const accountsOnPage = accounts.slice(pageStartIndex, pageEndIndex);

        for (let i = 0; i < accountsOnPage.length; i++) {
            const account = accountsOnPage[i];
            const globalIndex = pageStartIndex + i;

            // Calculate position in grid
            const col = i % cardsPerRow;
            const row = Math.floor(i / cardsPerRow);
            const x = startX + col * (cardWidth + margin);
            const y = startY + row * (cardHeight + margin);

            // Draw card at calculated position
            await drawCardOnSheet(pdf, account, x, y, cardWidth, cardHeight, batchNumber, customLogo, cardColor);

            if (onProgress) {
                onProgress({
                    current: globalIndex + 1,
                    total: accounts.length,
                    percentage: Math.round(((globalIndex + 1) / accounts.length) * 100),
                    status: 'creating-sheet'
                });
                
                // Yield to event loop every 5 cards to allow UI to update
                if ((globalIndex + 1) % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        }
    }

    return pdf.output('blob');
};

/**
 * Draw a single card at a specific position on the print sheet
 */
const drawCardOnSheet = async (pdf, account, x, y, width, height, batchNumber, customLogo, cardColor) => {
    const cardPadding = 1.5;
    const cornerRadius = 2.5;
    const CARD_COLORS = {
        blue: { r: 0, g: 136, b: 204 },
        black: { r: 30, g: 30, b: 30 }
    };
    const headerColor = CARD_COLORS[cardColor] || CARD_COLORS.blue;

    // Card background with rounded corners
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x + cardPadding, y + cardPadding, width - cardPadding * 2, height - cardPadding * 2, cornerRadius, cornerRadius, 'F');

    // Card border
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(x + cardPadding, y + cardPadding, width - cardPadding * 2, height - cardPadding * 2, cornerRadius, cornerRadius, 'S');

    // Header bar
    const headerHeight = 3.5;
    const headerY = y + cardPadding;
    pdf.setFillColor(headerColor.r, headerColor.g, headerColor.b);
    pdf.roundedRect(x + cardPadding, headerY, width - cardPadding * 2, headerHeight + cornerRadius, cornerRadius, cornerRadius, 'F');
    pdf.rect(x + cardPadding, headerY + headerHeight - 0.5, width - cardPadding * 2, cornerRadius + 0.5, 'F');

    // Header text
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'bold');
    const email = account.email.toLowerCase();
    const isGoogle = email.includes('@gmail.com') || email.includes('@googlemail.com');
    const headerText = isGoogle ? 'GOOGLE ID - USA ACCOUNT' : 'APPLE ID - USA ACCOUNT';
    pdf.text(headerText, x + width / 2, headerY + (headerHeight / 2) + 1.5, { align: 'center' });

    // Content area
    const contentY = headerY + headerHeight + 4;
    const qrSize = 17;
    const qrX = x + cardPadding + 2.5;
    const qrY = contentY;

    // QR Code using API URL with access token
    try {
        const qrDataURL = await generateQRDataURL(account);
        pdf.addImage(qrDataURL, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch (error) {
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.2);
        pdf.rect(qrX, qrY, qrSize, qrSize, 'S');
    }

    // Credentials box
    const boxX = qrX + qrSize + 2.5;
    const boxY = contentY;
    const boxWidth = x + width - boxX - cardPadding - 2.5;
    const rowHeight = 5;
    const boxHeight = rowHeight * 2;

    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(boxX, boxY, boxWidth, boxHeight, 0.8, 0.8, 'S');
    pdf.setLineWidth(0.15);
    pdf.line(boxX, boxY + rowHeight, boxX + boxWidth, boxY + rowHeight);

    const labelWidth = 8;
    pdf.line(boxX + labelWidth, boxY, boxX + labelWidth, boxY + boxHeight);

    // EMAIL row
    pdf.setFontSize(4);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('EMAIL', boxX + 1.2, boxY + 3.2);
    pdf.setFontSize(4.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(String(account.email || ''), boxX + labelWidth + 1.2, boxY + 3.2);

    // PASS row
    pdf.setFontSize(4);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PASS', boxX + 1.2, boxY + rowHeight + 3.2);
    pdf.setFontSize(4.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(String(account.password || ''), boxX + labelWidth + 1.2, boxY + rowHeight + 3.2);

    // Name and DOB
    const nameY = boxY + boxHeight + 3;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${account.firstName || ''} ${account.lastName || ''}`, boxX, nameY);
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(85, 85, 85);
    pdf.text(`DOB: ${account.birthday || ''}`, boxX, nameY + 3);

    // VIP Badge dimensions (calculated first so we can center logo above it)
    const badgeWidth = 18;
    const badgeHeight = 3.5;
    const badgeX = x + width - cardPadding - badgeWidth - 3;
    const badgeY = y + height - cardPadding - badgeHeight - 3;

    // Logo/Icon above VIP Badge - centered above the badge
    const iconSize = 10;
    const iconX = badgeX + (badgeWidth - iconSize) / 2; // Center horizontally with badge
    const iconY = badgeY - iconSize - 2; // 2mm gap above the badge
    
    if (customLogo) {
        try {
            pdf.addImage(customLogo, 'PNG', iconX, iconY, iconSize, iconSize);
        } catch (error) {
            // Fallback to default icon
            drawDefaultIconSmall(pdf, iconX, iconY, iconSize);
        }
    } else {
        drawDefaultIconSmall(pdf, iconX, iconY, iconSize);
    }

    // VIP Badge
    const badgeText = `VIP-BATCH-${String(batchNumber).padStart(2, '0')}`;
    
    pdf.setFillColor(0, 0, 0);
    pdf.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.2, 1.2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(4);
    pdf.setFont('helvetica', 'bold');
    pdf.text(badgeText, badgeX + badgeWidth / 2, badgeY + 2.4, { align: 'center' });

    // Serial Number at bottom (drawn last to ensure it's not overwritten)
    const bottomY = y + height - cardPadding - 5;
    // Generate a fallback serial number for legacy accounts that don't have one
    const serialNumber = account.serialNumber || generateFallbackSN(account.id);
    
    pdf.setFontSize(4);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(136, 136, 136);
    pdf.text('SN:', qrX, bottomY);
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(serialNumber, qrX, bottomY + 3);
};

/**
 * Generate a fallback serial number from account ID for legacy accounts
 */
const generateFallbackSN = (accountId) => {
    if (!accountId) return 'XXXXXXXXX';
    // Use the first 9 characters of the UUID, uppercased
    return accountId.replace(/-/g, '').substring(0, 9).toUpperCase();
};

/**
 * Draw small default App Store icon for print sheet
 */
const drawDefaultIconSmall = (pdf, x, y, size) => {
    pdf.setFillColor(0, 122, 255);
    pdf.roundedRect(x, y, size, size, 1.5, 1.5, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.text('A', x + size / 2, y + size / 2 + 1.8, { align: 'center' });
};

/**
 * Download print sheet PDF for bulk printing
 * @param {Array} accounts - Array of account objects
 * @param {Function} onProgress - Progress callback
 * @param {number} batchNumber - Batch number for VIP badge
 * @param {string} customLogo - Custom logo data URL
 * @param {string} websiteDomain - Base URL for QR codes
 * @param {string} cardColor - Card color theme
 * @param {number} boardWidth - Custom board width in mm (default: 900mm = 90cm)
 * @param {number} boardHeight - Custom board height in mm (default: 600mm = 60cm)
 */
export const downloadPrintSheetPDF = async (accounts, onProgress, batchNumber = 1, customLogo = null, websiteDomain = null, cardColor = 'blue', boardWidth = DEFAULT_BOARD.width, boardHeight = DEFAULT_BOARD.height) => {
    const blob = await generatePrintSheetPDF(accounts, onProgress, batchNumber, customLogo, websiteDomain, cardColor, boardWidth, boardHeight);
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const boardInfo = `${boardWidth/10}x${boardHeight/10}cm`;
    link.download = `print-sheet-${accounts.length}-cards-${boardInfo}-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Generate a print sheet PDF with multiple card backs arranged on custom-sized pages
 * Optimized for bulk printing on professional card printers
 * 
 * @param {number} cardBackCount - Number of card backs to generate
 * @param {Function} onProgress - Progress callback
 * @param {number} batchNumber - Batch number for VIP badge
 * @param {string} customLogo - Custom logo data URL
 * @param {string} cardColor - Card color theme
 * @param {string} accountIdType - 'apple' or 'google'
 * @param {number} boardWidth - Custom board width in mm (default: 600mm = 60cm)
 * @param {number} boardHeight - Custom board height in mm (default: 900mm = 90cm)
 * @returns {Promise<Blob>} PDF as blob
 */
export const generateCardBackPrintSheetPDF = async (cardBackCount, onProgress, batchNumber = 1, customLogo = null, cardColor = 'blue', accountIdType = 'apple', boardWidth = 600, boardHeight = 900) => {
    const { cardWidth, cardHeight, margin } = CARD_DIMENSIONS;
    const width = boardWidth;
    const height = boardHeight;
    const { cardsPerRow, cardsPerCol, cardsPerPage } = calculatePrintLayout(width, height);
    
    // Calculate starting positions to center the grid on the page
    const gridWidth = cardsPerRow * cardWidth + (cardsPerRow - 1) * margin;
    const gridHeight = cardsPerCol * cardHeight + (cardsPerCol - 1) * margin;
    const startX = (width - gridWidth) / 2;
    const startY = (height - gridHeight) / 2;

    const totalPages = Math.ceil(cardBackCount / cardsPerPage);
    
    // Determine orientation based on dimensions
    const isLandscape = width >= height;
    
    const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: isLandscape ? [height, width] : [width, height], // [shorter side, longer side]
    });

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) {
            pdf.addPage();
        }

        const pageStartIndex = pageIndex * cardsPerPage;
        const pageEndIndex = Math.min(pageStartIndex + cardsPerPage, cardBackCount);
        const cardsOnPage = pageEndIndex - pageStartIndex;

        for (let i = 0; i < cardsOnPage; i++) {
            const globalIndex = pageStartIndex + i;

            // Calculate position in grid
            const col = i % cardsPerRow;
            const row = Math.floor(i / cardsPerRow);
            const x = startX + col * (cardWidth + margin);
            const y = startY + row * (cardHeight + margin);

            // Draw card back at calculated position
            await drawCardBackOnSheet(pdf, x, y, cardWidth, cardHeight, batchNumber, customLogo, cardColor, accountIdType);

            if (onProgress) {
                onProgress({
                    current: globalIndex + 1,
                    total: cardBackCount,
                    percentage: Math.round(((globalIndex + 1) / cardBackCount) * 100),
                    status: 'creating-cardback-sheet'
                });
                
                // Yield to event loop every 5 cards to allow UI to update
                if ((globalIndex + 1) % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        }
    }

    return pdf.output('blob');
};

/**
 * Draw a single card back at a specific position on the print sheet
 */
const drawCardBackOnSheet = async (pdf, x, y, width, height, batchNumber, customLogo, cardColor, accountIdType) => {
    const cardPadding = 1.5;
    const cornerRadius = 2.5;

    // Get border color based on card color
    const borderColor = cardColor === 'black' ? { r: 30, g: 30, b: 30 } : { r: 0, g: 0, b: 0 };

    // Card background with rounded corners
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x + cardPadding, y + cardPadding, width - cardPadding * 2, height - cardPadding * 2, cornerRadius, cornerRadius, 'F');

    // Card border with rounded corners
    pdf.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(x + cardPadding, y + cardPadding, width - cardPadding * 2, height - cardPadding * 2, cornerRadius, cornerRadius, 'S');

    // Center calculations
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // Logo - centered at top portion
    const logoSize = 14;
    const logoX = centerX - logoSize / 2;
    const logoY = centerY - 14;

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
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text(accountIdText, centerX, centerY + 4, { align: 'center' });

    // USA ACCOUNT text
    pdf.setTextColor(134, 134, 139);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.text('USA ACCOUNT', centerX, centerY + 8, { align: 'center' });

    // VIP-BATCH badge
    const badgeText = `VIP-BATCH-${String(batchNumber).padStart(2, '0')}`;
    const badgeWidth = 20;
    const badgeHeight = 4;
    const badgeX = centerX - badgeWidth / 2;
    const badgeY = centerY + 12;

    pdf.setDrawColor(29, 29, 31);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 0.8, 0.8, 'S');

    pdf.setTextColor(29, 29, 31);
    pdf.setFontSize(4);
    pdf.setFont('helvetica', 'bold');
    pdf.text(badgeText, centerX, badgeY + 2.8, { align: 'center' });
};

/**
 * Download card back print sheet PDF for bulk printing
 * @param {number} cardBackCount - Number of card backs to generate
 * @param {Function} onProgress - Progress callback
 * @param {number} batchNumber - Batch number for VIP badge
 * @param {string} customLogo - Custom logo data URL
 * @param {string} cardColor - Card color theme
 * @param {string} accountIdType - 'apple' or 'google'
 * @param {number} boardWidth - Custom board width in mm (default: 600mm = 60cm)
 * @param {number} boardHeight - Custom board height in mm (default: 900mm = 90cm)
 */
export const downloadCardBackPrintSheetPDF = async (cardBackCount, onProgress, batchNumber = 1, customLogo = null, cardColor = 'blue', accountIdType = 'apple', boardWidth = 600, boardHeight = 900) => {
    const blob = await generateCardBackPrintSheetPDF(cardBackCount, onProgress, batchNumber, customLogo, cardColor, accountIdType, boardWidth, boardHeight);
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const boardInfo = `${boardWidth/10}x${boardHeight/10}cm`;
    link.download = `card-backs-${cardBackCount}-${accountIdType}-${boardInfo}-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export default {
    generateAccountPDF,
    generateMultipleAccountsPDF,
    downloadAccountPDF,
    downloadCardBackPDF,
    generatePrintSheetPDF,
    downloadPrintSheetPDF,
    generateCardBackPrintSheetPDF,
    downloadCardBackPrintSheetPDF,
};

