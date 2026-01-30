import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactDOM from 'react-dom/client';
import React from 'react';

/**
 * Wallet Card PDF Generator - OPTIMIZED
 * Uses batch rendering for much faster PDF generation with large card sets
 */

// Card dimensions (CR80 standard in mm)
const CARD_DIMENSIONS = {
    cardWidth: 85.6,
    cardHeight: 53.98,
    margin: 2,
};

// Pixel dimensions matching the CSS (320x200px)
const CARD_WIDTH_PX = 320;
const CARD_HEIGHT_PX = 200;

// Batch size for rendering (balance between memory and speed)
const BATCH_SIZE = 10;

// Render scale (reduced from 4 to 3 for faster rendering while maintaining quality)
const RENDER_SCALE = 3;

/**
 * Dynamically import components
 */
const getWalletCardComponent = async () => {
    const module = await import('../components/WalletCard.jsx');
    return module.default;
};

const getWalletCardBackComponent = async () => {
    const module = await import('../components/WalletCardBack.jsx');
    return module.default;
};

/**
 * Create a batch rendering container with multiple cards
 * Renders all cards at once for much better performance
 */
const renderCardBatchToImages = async (Component, cardsProps, onItemProgress) => {
    const canvases = [];

    // Create a single container for all cards in the batch
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        left: -99999px;
        top: 0;
        z-index: -1;
        display: flex;
        flex-wrap: wrap;
        gap: 0;
        pointer-events: none;
        opacity: 0;
    `;
    document.body.appendChild(container);

    // Create wrapper divs for each card
    const wrappers = [];
    const roots = [];

    for (let i = 0; i < cardsProps.length; i++) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            width: ${CARD_WIDTH_PX}px;
            height: ${CARD_HEIGHT_PX}px;
            flex-shrink: 0;
        `;
        container.appendChild(wrapper);
        wrappers.push(wrapper);

        // Render React component
        const root = ReactDOM.createRoot(wrapper);
        root.render(React.createElement(Component, cardsProps[i]));
        roots.push(root);
    }

    // Wait for all React components to render
    await new Promise(resolve => setTimeout(resolve, 150));

    // Capture each card as canvas
    for (let i = 0; i < wrappers.length; i++) {
        const canvas = await html2canvas(wrappers[i], {
            scale: RENDER_SCALE,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false,
            width: CARD_WIDTH_PX,
            height: CARD_HEIGHT_PX,
        });
        canvases.push(canvas);

        if (onItemProgress) {
            onItemProgress(i + 1);
        }
    }

    // Clean up all roots and container
    roots.forEach(root => root.unmount());
    document.body.removeChild(container);

    return canvases;
};

/**
 * Draw card image on PDF at specified position
 */
const drawCardOnPDF = (pdf, canvas, x, y, width, height) => {
    const imgData = canvas.toDataURL('image/png', 0.92);
    pdf.addImage(imgData, 'PNG', x, y, width, height, undefined, 'FAST');
};

/**
 * Generate a single wallet card PDF (front only)
 */
export const generateWalletCardPDF = async (card, printDate = null, walletType = 'apple') => {
    const WalletCard = await getWalletCardComponent();

    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [CARD_DIMENSIONS.cardHeight, CARD_DIMENSIONS.cardWidth],
    });

    const [canvas] = await renderCardBatchToImages(WalletCard, [{
        card,
        showQR: true,
        printDate,
        walletType
    }]);

    drawCardOnPDF(pdf, canvas, 0, 0, CARD_DIMENSIONS.cardWidth, CARD_DIMENSIONS.cardHeight);

    return pdf;
};

/**
 * Download a single wallet card as PDF
 */
export const downloadWalletCardPDF = async (card, printDate = null, walletType = 'apple') => {
    const pdf = await generateWalletCardPDF(card, printDate, walletType);
    pdf.save(`wallet-card-${card.serial_number || card.id}.pdf`);
};

/**
 * Generate wallet card print sheet PDF - OPTIMIZED
 * Uses batch rendering for much faster generation
 */
export const generateWalletPrintSheetPDF = async (cards, onProgress, printDate = null, boardWidth = 900, boardHeight = 600, walletType = 'apple') => {
    const { cardWidth, cardHeight, margin } = CARD_DIMENSIONS;
    const WalletCard = await getWalletCardComponent();

    // Calculate layout
    const cardsPerRow = Math.floor(boardWidth / (cardWidth + margin));
    const cardsPerCol = Math.floor(boardHeight / (cardHeight + margin));
    const cardsPerPage = cardsPerRow * cardsPerCol;

    // Center the grid
    const gridWidth = cardsPerRow * cardWidth + (cardsPerRow - 1) * margin;
    const gridHeight = cardsPerCol * cardHeight + (cardsPerCol - 1) * margin;
    const startX = (boardWidth - gridWidth) / 2;
    const startY = (boardHeight - gridHeight) / 2;

    const totalPages = Math.ceil(cards.length / cardsPerPage);
    const isLandscape = boardWidth >= boardHeight;

    const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: isLandscape ? [boardHeight, boardWidth] : [boardWidth, boardHeight],
    });

    // Process cards in batches
    const allCardImages = [];
    let processedCount = 0;

    for (let batchStart = 0; batchStart < cards.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, cards.length);
        const batchCards = cards.slice(batchStart, batchEnd);

        const batchProps = batchCards.map(card => ({
            card,
            showQR: true,
            printDate,
            walletType
        }));

        // Render entire batch at once
        const batchCanvases = await renderCardBatchToImages(WalletCard, batchProps, (itemIndex) => {
            processedCount = batchStart + itemIndex;
            if (onProgress) {
                onProgress({
                    current: processedCount,
                    total: cards.length,
                    percentage: Math.round((processedCount / cards.length) * 80), // First 80% is rendering
                    status: 'creating-sheet'
                });
            }
        });

        allCardImages.push(...batchCanvases);

        // Small delay between batches to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Now place images on PDF pages (fast operation)
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) {
            pdf.addPage();
        }

        const pageStartIndex = pageIndex * cardsPerPage;
        const pageEndIndex = Math.min(pageStartIndex + cardsPerPage, cards.length);

        for (let i = pageStartIndex; i < pageEndIndex; i++) {
            const localIndex = i - pageStartIndex;
            const col = localIndex % cardsPerRow;
            const row = Math.floor(localIndex / cardsPerRow);
            const x = startX + col * (cardWidth + margin);
            const y = startY + row * (cardHeight + margin);

            drawCardOnPDF(pdf, allCardImages[i], x, y, cardWidth, cardHeight);
        }

        if (onProgress) {
            onProgress({
                current: cards.length,
                total: cards.length,
                percentage: 80 + Math.round(((pageIndex + 1) / totalPages) * 20), // Last 20% is PDF assembly
                status: 'creating-sheet'
            });
        }
    }

    return pdf.output('blob');
};

/**
 * Download wallet card print sheet PDF
 */
export const downloadWalletPrintSheetPDF = async (cards, onProgress, printDate = null, boardWidth = 900, boardHeight = 600, walletType = 'apple') => {
    const blob = await generateWalletPrintSheetPDF(cards, onProgress, printDate, boardWidth, boardHeight, walletType);

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const boardInfo = `${boardWidth / 10}x${boardHeight / 10}cm`;
    link.download = `wallet-print-sheet-${cards.length}-cards-${boardInfo}-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Generate wallet card backs print sheet PDF - OPTIMIZED
 */
export const generateWalletCardBackPrintSheetPDF = async (cards, onProgress, boardWidth = 600, boardHeight = 900) => {
    const { cardWidth, cardHeight, margin } = CARD_DIMENSIONS;
    const WalletCardBack = await getWalletCardBackComponent();

    // Calculate layout
    const cardsPerRow = Math.floor(boardWidth / (cardWidth + margin));
    const cardsPerCol = Math.floor(boardHeight / (cardHeight + margin));
    const cardsPerPage = cardsPerRow * cardsPerCol;

    // Center the grid
    const gridWidth = cardsPerRow * cardWidth + (cardsPerRow - 1) * margin;
    const gridHeight = cardsPerCol * cardHeight + (cardsPerCol - 1) * margin;
    const startX = (boardWidth - gridWidth) / 2;
    const startY = (boardHeight - gridHeight) / 2;

    const totalPages = Math.ceil(cards.length / cardsPerPage);
    const isLandscape = boardWidth >= boardHeight;

    const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: isLandscape ? [boardHeight, boardWidth] : [boardWidth, boardHeight],
    });

    // Process cards in batches
    const allCardImages = [];
    let processedCount = 0;

    for (let batchStart = 0; batchStart < cards.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, cards.length);
        const batchCards = cards.slice(batchStart, batchEnd);

        const batchProps = batchCards.map(card => ({ card }));

        // Render entire batch at once
        const batchCanvases = await renderCardBatchToImages(WalletCardBack, batchProps, (itemIndex) => {
            processedCount = batchStart + itemIndex;
            if (onProgress) {
                onProgress({
                    current: processedCount,
                    total: cards.length,
                    percentage: Math.round((processedCount / cards.length) * 80),
                    status: 'creating-cardback-sheet'
                });
            }
        });

        allCardImages.push(...batchCanvases);

        // Small delay between batches to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Now place images on PDF pages
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) {
            pdf.addPage();
        }

        const pageStartIndex = pageIndex * cardsPerPage;
        const pageEndIndex = Math.min(pageStartIndex + cardsPerPage, cards.length);

        for (let i = pageStartIndex; i < pageEndIndex; i++) {
            const localIndex = i - pageStartIndex;
            const col = localIndex % cardsPerRow;
            const row = Math.floor(localIndex / cardsPerRow);
            const x = startX + col * (cardWidth + margin);
            const y = startY + row * (cardHeight + margin);

            drawCardOnPDF(pdf, allCardImages[i], x, y, cardWidth, cardHeight);
        }

        if (onProgress) {
            onProgress({
                current: cards.length,
                total: cards.length,
                percentage: 80 + Math.round(((pageIndex + 1) / totalPages) * 20),
                status: 'creating-cardback-sheet'
            });
        }
    }

    return pdf.output('blob');
};

/**
 * Download wallet card backs print sheet PDF
 */
export const downloadWalletCardBackPrintSheetPDF = async (cards, onProgress, boardWidth = 600, boardHeight = 900) => {
    const blob = await generateWalletCardBackPrintSheetPDF(cards, onProgress, boardWidth, boardHeight);

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const boardInfo = `${boardWidth / 10}x${boardHeight / 10}cm`;
    link.download = `wallet-card-backs-${cards.length}-cards-${boardInfo}-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export default {
    generateWalletCardPDF,
    downloadWalletCardPDF,
    generateWalletPrintSheetPDF,
    downloadWalletPrintSheetPDF,
    generateWalletCardBackPrintSheetPDF,
    downloadWalletCardBackPrintSheetPDF,
};
