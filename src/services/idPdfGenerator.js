import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactDOM from 'react-dom/client';
import React from 'react';

/**
 * ID Card PDF Generator
 * Mirrors the wallet PDF generator (batch rendering with html2canvas) but renders ID cards.
 */

// Card dimensions (CR80 standard in mm)
const CARD_DIMENSIONS = {
    cardWidth: 85.6,
    cardHeight: 53.98,
    marginY: 2,
    marginX: 10,
};

// Pixel dimensions matching the CSS (320x200px)
const CARD_WIDTH_PX = 320;
const CARD_HEIGHT_PX = 200;

const BATCH_SIZE = 10;
const RENDER_SCALE = 3;

const getIdCardComponent = async (cardDesign = 'classic') => {
    if (cardDesign === 'custom') {
        const module = await import('../components/IdCardCustom.jsx');
        return module.default;
    }
    if (cardDesign === 'light') {
        const module = await import('../components/IdCardLight.jsx');
        return module.default;
    }
    const module = await import('../components/IdCard.jsx');
    return module.default;
};

const getIdCardBackComponent = async (cardDesign = 'classic') => {
    if (cardDesign === 'custom') {
        const module = await import('../components/IdCardBackCustom.jsx');
        return module.default;
    }
    if (cardDesign === 'light') {
        const module = await import('../components/IdCardBackLight.jsx');
        return module.default;
    }
    const module = await import('../components/IdCardBack.jsx');
    return module.default;
};

// Build the props for a front card based on design.
const frontCardProps = (card, qrLogo, cardDesign, customImages) =>
    cardDesign === 'custom'
        ? { card, image: customImages?.front, showQR: true, qrLogo }
        : { card, showQR: true, qrLogo };

// Build the props for a back card based on design.
const backCardProps = (card, cardDesign, customImages) =>
    cardDesign === 'custom' ? { image: customImages?.back } : { card };

/**
 * Render a batch of cards to canvas images.
 */
const renderCardBatchToImages = async (Component, cardsProps, onItemProgress) => {
    const canvases = [];

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

        const root = ReactDOM.createRoot(wrapper);
        root.render(React.createElement(Component, cardsProps[i]));
        roots.push(root);
    }

    await new Promise((resolve) => setTimeout(resolve, 150));

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
        if (onItemProgress) onItemProgress(i + 1);
    }

    roots.forEach((root) => root.unmount());
    document.body.removeChild(container);

    return canvases;
};

const drawCardOnPDF = (pdf, canvas, x, y, width, height) => {
    const imgData = canvas.toDataURL('image/png', 0.92);
    pdf.addImage(imgData, 'PNG', x, y, width, height, undefined, 'FAST');
};

/**
 * Generate a single ID card PDF (front only).
 */
export const generateIdCardPDF = async (card, qrLogo = null, cardDesign = 'classic', customImages = {}) => {
    const IdCardComp = await getIdCardComponent(cardDesign);
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [CARD_DIMENSIONS.cardHeight, CARD_DIMENSIONS.cardWidth],
    });

    const [canvas] = await renderCardBatchToImages(IdCardComp, [frontCardProps(card, qrLogo, cardDesign, customImages)]);
    drawCardOnPDF(pdf, canvas, 0, 0, CARD_DIMENSIONS.cardWidth, CARD_DIMENSIONS.cardHeight);
    return pdf;
};

export const downloadIdCardPDF = async (card, qrLogo = null, cardDesign = 'classic', customImages = {}) => {
    const pdf = await generateIdCardPDF(card, qrLogo, cardDesign, customImages);
    pdf.save(`id-card-${card.serial_number || card.id}.pdf`);
};

/**
 * Generate ID card print sheet PDF.
 */
export const generateIdPrintSheetPDF = async (cards, onProgress, boardWidth = 900, boardHeight = 600, cardDesign = 'classic', qrLogo = null, customImages = {}) => {
    const { cardWidth, cardHeight, marginX, marginY } = CARD_DIMENSIONS;
    const IdCard = await getIdCardComponent(cardDesign);

    const cardsPerRow = Math.floor(boardWidth / (cardWidth + marginX));
    const cardsPerCol = Math.floor(boardHeight / (cardHeight + marginY));
    const cardsPerPage = cardsPerRow * cardsPerCol;

    const gridWidth = cardsPerRow * cardWidth + (cardsPerRow - 1) * marginX;
    const gridHeight = cardsPerCol * cardHeight + (cardsPerCol - 1) * marginY;
    const startX = (boardWidth - gridWidth) / 2;
    const startY = (boardHeight - gridHeight) / 2;

    const totalPages = Math.ceil(cards.length / cardsPerPage);
    const isLandscape = boardWidth >= boardHeight;

    const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: isLandscape ? [boardHeight, boardWidth] : [boardWidth, boardHeight],
    });

    const allCardImages = [];
    let processedCount = 0;

    for (let batchStart = 0; batchStart < cards.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, cards.length);
        const batchCards = cards.slice(batchStart, batchEnd);
        const batchProps = batchCards.map((card) => frontCardProps(card, qrLogo, cardDesign, customImages));

        const batchCanvases = await renderCardBatchToImages(IdCard, batchProps, (itemIndex) => {
            processedCount = batchStart + itemIndex;
            if (onProgress) {
                onProgress({ current: processedCount, total: cards.length, percentage: Math.round((processedCount / cards.length) * 80), status: 'creating-sheet' });
            }
        });

        allCardImages.push(...batchCanvases);
        await new Promise((resolve) => setTimeout(resolve, 10));
    }

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) pdf.addPage();
        const pageStartIndex = pageIndex * cardsPerPage;
        const pageEndIndex = Math.min(pageStartIndex + cardsPerPage, cards.length);

        for (let i = pageStartIndex; i < pageEndIndex; i++) {
            const localIndex = i - pageStartIndex;
            const col = localIndex % cardsPerRow;
            const row = Math.floor(localIndex / cardsPerRow);
            const x = startX + col * (cardWidth + marginX);
            const y = startY + row * (cardHeight + marginY);
            drawCardOnPDF(pdf, allCardImages[i], x, y, cardWidth, cardHeight);
        }

        if (onProgress) {
            onProgress({ current: cards.length, total: cards.length, percentage: 80 + Math.round(((pageIndex + 1) / totalPages) * 20), status: 'creating-sheet' });
        }
    }

    return pdf.output('blob');
};

export const downloadIdPrintSheetPDF = async (cards, onProgress, boardWidth = 900, boardHeight = 600, cardDesign = 'classic', qrLogo = null, customImages = {}) => {
    const blob = await generateIdPrintSheetPDF(cards, onProgress, boardWidth, boardHeight, cardDesign, qrLogo, customImages);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const boardInfo = `${boardWidth / 10}x${boardHeight / 10}cm`;
    link.download = `id-print-sheet-${cards.length}-cards-${boardInfo}-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Composite cards onto large page canvases and download as a ZIP of PNGs.
 */
const compositeSheetImages = async (Component, cards, batchProps, onProgress, boardWidth, boardHeight, fileBase, status) => {
    const JSZip = (await import('jszip')).default;
    const { saveAs } = await import('file-saver');

    const { cardWidth, cardHeight, marginX, marginY } = CARD_DIMENSIONS;

    const cardsPerRow = Math.floor(boardWidth / (cardWidth + marginX));
    const cardsPerCol = Math.floor(boardHeight / (cardHeight + marginY));
    const cardsPerPage = cardsPerRow * cardsPerCol;

    const gridWidthMM = cardsPerRow * cardWidth + (cardsPerRow - 1) * marginX;
    const gridHeightMM = cardsPerCol * cardHeight + (cardsPerCol - 1) * marginY;
    const startXMM = (boardWidth - gridWidthMM) / 2;
    const startYMM = (boardHeight - gridHeightMM) / 2;

    const totalPages = Math.ceil(cards.length / cardsPerPage);

    const allCardImages = [];
    let processedCount = 0;

    for (let batchStart = 0; batchStart < cards.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, cards.length);
        const slice = batchProps.slice(batchStart, batchEnd);

        const batchCanvases = await renderCardBatchToImages(Component, slice, (itemIndex) => {
            processedCount = batchStart + itemIndex;
            if (onProgress) {
                onProgress({ current: processedCount, total: cards.length, percentage: Math.round((processedCount / cards.length) * 80), status });
            }
        });

        allCardImages.push(...batchCanvases);
        await new Promise((resolve) => setTimeout(resolve, 10));
    }

    const cardCanvasWidth = CARD_WIDTH_PX * RENDER_SCALE;
    const cardCanvasHeight = CARD_HEIGHT_PX * RENDER_SCALE;
    const pxPerMM = cardCanvasWidth / cardWidth;
    const boardCanvasWidth = Math.round(boardWidth * pxPerMM);
    const boardCanvasHeight = Math.round(boardHeight * pxPerMM);
    const marginXPx = Math.round(marginX * pxPerMM);
    const marginYPx = Math.round(marginY * pxPerMM);
    const startXPx = Math.round(startXMM * pxPerMM);
    const startYPx = Math.round(startYMM * pxPerMM);

    const zip = new JSZip();

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const pageStartIndex = pageIndex * cardsPerPage;
        const pageEndIndex = Math.min(pageStartIndex + cardsPerPage, cards.length);

        const canvas = document.createElement('canvas');
        canvas.width = boardCanvasWidth;
        canvas.height = boardCanvasHeight;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, boardCanvasWidth, boardCanvasHeight);

        for (let i = pageStartIndex; i < pageEndIndex; i++) {
            const localIndex = i - pageStartIndex;
            const col = localIndex % cardsPerRow;
            const row = Math.floor(localIndex / cardsPerRow);
            const x = startXPx + col * (cardCanvasWidth + marginXPx);
            const y = startYPx + row * (cardCanvasHeight + marginYPx);
            ctx.drawImage(allCardImages[i], x, y, cardCanvasWidth, cardCanvasHeight);
        }

        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        const pageInfo = totalPages > 1 ? `-page${pageIndex + 1}` : '';
        zip.file(`${fileBase}${pageInfo}.png`, blob);

        if (pageIndex < totalPages - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }

    if (onProgress) {
        onProgress({ current: cards.length, total: cards.length, percentage: 95, status: 'compressing' });
    }

    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (metadata) => {
        if (onProgress) {
            onProgress({ current: cards.length, total: cards.length, percentage: 95 + Math.round(metadata.percent * 0.05), status: 'compressing' });
        }
    });

    const boardInfo = `${boardWidth / 10}x${boardHeight / 10}cm`;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    saveAs(zipBlob, `${fileBase}s-${cards.length}-cards-${boardInfo}-${timestamp}.zip`);
};

export const downloadIdPrintSheetImage = async (cards, onProgress, boardWidth = 900, boardHeight = 600, cardDesign = 'classic', qrLogo = null, customImages = {}) => {
    const IdCard = await getIdCardComponent(cardDesign);
    const batchProps = cards.map((card) => frontCardProps(card, qrLogo, cardDesign, customImages));
    await compositeSheetImages(IdCard, cards, batchProps, onProgress, boardWidth, boardHeight, 'id-print-sheet', 'creating-image');
};

export const downloadIdCardBackPrintSheetImage = async (cards, onProgress, boardWidth = 600, boardHeight = 900, cardDesign = 'classic', customImages = {}) => {
    const IdCardBack = await getIdCardBackComponent(cardDesign);
    const batchProps = cards.map((card) => backCardProps(card, cardDesign, customImages));
    await compositeSheetImages(IdCardBack, cards, batchProps, onProgress, boardWidth, boardHeight, 'id-card-backs-sheet', 'creating-cardback-sheet');
};

export default {
    generateIdCardPDF,
    downloadIdCardPDF,
    generateIdPrintSheetPDF,
    downloadIdPrintSheetPDF,
    downloadIdPrintSheetImage,
    downloadIdCardBackPrintSheetImage,
};
