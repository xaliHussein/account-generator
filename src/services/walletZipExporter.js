import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactDOM from 'react-dom/client';
import React from 'react';

/**
 * Wallet Cards ZIP Exporter
 * Exports wallet cards as ZIP with PDFs and optional TIFF images
 * Uses the same rendering approach as walletPdfGenerator to ensure consistent card format
 */

// Card dimensions (CR80 standard in mm)
const CARD_DIMENSIONS = {
    cardWidth: 85.6,
    cardHeight: 53.98,
};

// Pixel dimensions matching the CSS (320x200px)
const CARD_WIDTH_PX = 320;
const CARD_HEIGHT_PX = 200;

// Batch size for rendering
const BATCH_SIZE = 10;

// Render scale for quality
const RENDER_SCALE = 3;

/**
 * Dynamically import WalletCard component
 */
const getWalletCardComponent = async (cardDesign = 'classic') => {
    if (cardDesign === 'light') {
        const module = await import('../components/WalletCardLight.jsx');
        return module.default;
    }
    const module = await import('../components/WalletCard.jsx');
    return module.default;
};

/**
 * Render a batch of wallet cards to canvas images
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
 * Convert canvas to PDF blob
 */
const canvasToPdfBlob = (canvas) => {
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [CARD_DIMENSIONS.cardHeight, CARD_DIMENSIONS.cardWidth],
    });

    const imgData = canvas.toDataURL('image/png', 0.92);
    pdf.addImage(imgData, 'PNG', 0, 0, CARD_DIMENSIONS.cardWidth, CARD_DIMENSIONS.cardHeight, undefined, 'FAST');

    return pdf.output('arraybuffer');
};

/**
 * Convert canvas to TIFF blob using PNG as intermediate (TIFF not natively supported, using PNG with .tiff extension)
 * For true TIFF support, we'd need a library like UTIF.js, but PNG provides excellent quality
 */
const canvasToTiffBlob = async (canvas) => {
    // Convert to high-quality PNG (most print shops accept PNG as well as TIFF)
    // Using maximum quality for print-ready output
    const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png', 1.0);
    });
    return await blob.arrayBuffer();
};

/**
 * Export wallet cards as ZIP with PDFs only
 */
export const exportWalletCardsAsZip = async (cards, onProgress, walletType = 'apple', cardDesign = 'classic') => {
    const zip = new JSZip();
    const folder = zip.folder('wallet-cards');
    const WalletCard = await getWalletCardComponent(cardDesign);

    let processedCount = 0;

    // Process cards in batches
    for (let batchStart = 0; batchStart < cards.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, cards.length);
        const batchCards = cards.slice(batchStart, batchEnd);

        const batchProps = batchCards.map(card => ({
            card,
            showQR: true,
            walletType
        }));

        // Render entire batch at once
        const batchCanvases = await renderCardBatchToImages(WalletCard, batchProps, (itemIndex) => {
            processedCount = batchStart + itemIndex;
            if (onProgress) {
                onProgress({
                    current: processedCount,
                    total: cards.length,
                    percentage: Math.round((processedCount / cards.length) * 80),
                    status: 'creating-zip'
                });
            }
        });

        // Convert canvases to PDFs and add to ZIP
        for (let i = 0; i < batchCanvases.length; i++) {
            const card = batchCards[i];
            const canvas = batchCanvases[i];
            const pdfBlob = canvasToPdfBlob(canvas);
            const fileName = `${String(batchStart + i + 1).padStart(4, '0')}_wallet-card_${card.serial_number || card.id}.pdf`;
            folder.file(fileName, pdfBlob);
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Generate ZIP file
    if (onProgress) {
        onProgress({
            current: cards.length,
            total: cards.length,
            percentage: 85,
            status: 'compressing'
        });
    }

    const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
        (metadata) => {
            if (onProgress) {
                onProgress({
                    current: cards.length,
                    total: cards.length,
                    percentage: 85 + Math.round(metadata.percent * 0.15),
                    status: 'compressing'
                });
            }
        }
    );

    return zipBlob;
};

/**
 * Export wallet cards as ZIP with both PDFs and TIFF images
 */
export const exportWalletCardsWithTiffAsZip = async (cards, onProgress, walletType = 'apple', cardDesign = 'classic') => {
    const zip = new JSZip();
    const pdfFolder = zip.folder('pdfs');
    const tiffFolder = zip.folder('images');
    const WalletCard = await getWalletCardComponent(cardDesign);

    let processedCount = 0;

    // Process cards in batches
    for (let batchStart = 0; batchStart < cards.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, cards.length);
        const batchCards = cards.slice(batchStart, batchEnd);

        const batchProps = batchCards.map(card => ({
            card,
            showQR: true,
            walletType
        }));

        // Render entire batch at once
        const batchCanvases = await renderCardBatchToImages(WalletCard, batchProps, (itemIndex) => {
            processedCount = batchStart + itemIndex;
            if (onProgress) {
                onProgress({
                    current: processedCount,
                    total: cards.length,
                    percentage: Math.round((processedCount / cards.length) * 70),
                    status: 'creating-zip'
                });
            }
        });

        // Convert canvases to PDFs and TIFFs, add to ZIP
        for (let i = 0; i < batchCanvases.length; i++) {
            const card = batchCards[i];
            const canvas = batchCanvases[i];
            const baseFileName = `${String(batchStart + i + 1).padStart(4, '0')}_wallet-card_${card.serial_number || card.id}`;

            // Add PDF
            const pdfBlob = canvasToPdfBlob(canvas);
            pdfFolder.file(`${baseFileName}.pdf`, pdfBlob);

            // Add TIFF (PNG format with high quality for print)
            const tiffBlob = await canvasToTiffBlob(canvas);
            tiffFolder.file(`${baseFileName}.png`, tiffBlob);
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Generate ZIP file
    if (onProgress) {
        onProgress({
            current: cards.length,
            total: cards.length,
            percentage: 80,
            status: 'compressing'
        });
    }

    const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
        (metadata) => {
            if (onProgress) {
                onProgress({
                    current: cards.length,
                    total: cards.length,
                    percentage: 80 + Math.round(metadata.percent * 0.20),
                    status: 'compressing'
                });
            }
        }
    );

    return zipBlob;
};

/**
 * Dynamically import WalletCardBack component
 */
const getWalletCardBackComponent = async (cardDesign = 'classic') => {
    if (cardDesign === 'light') {
        const module = await import('../components/WalletCardBackLight.jsx');
        return module.default;
    }
    const module = await import('../components/WalletCardBack.jsx');
    return module.default;
};

/**
 * Export wallet cards as ZIP with Images only (PNG/TIFF)
 */
export const exportWalletCardsImagesOnlyAsZip = async (cards, onProgress, walletType = 'apple', cardDesign = 'classic') => {
    const zip = new JSZip();
    const tiffFolder = zip.folder('images');
    const WalletCard = await getWalletCardComponent(cardDesign);

    let processedCount = 0;

    // Process cards in batches
    for (let batchStart = 0; batchStart < cards.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, cards.length);
        const batchCards = cards.slice(batchStart, batchEnd);

        const batchProps = batchCards.map(card => ({
            card,
            showQR: true,
            walletType
        }));

        // Render entire batch at once
        const batchCanvases = await renderCardBatchToImages(WalletCard, batchProps, (itemIndex) => {
            processedCount = batchStart + itemIndex;
            if (onProgress) {
                onProgress({
                    current: processedCount,
                    total: cards.length,
                    percentage: Math.round((processedCount / cards.length) * 80),
                    status: 'creating-zip-images'
                });
            }
        });

        // Convert canvases to TIFF/PNG and add to ZIP
        for (let i = 0; i < batchCanvases.length; i++) {
            const card = batchCards[i];
            const canvas = batchCanvases[i];
            const baseFileName = `${String(batchStart + i + 1).padStart(4, '0')}_wallet-card_${card.serial_number || card.id}`;

            // Add TIFF (PNG format with high quality for print)
            const tiffBlob = await canvasToTiffBlob(canvas);
            tiffFolder.file(`${baseFileName}.png`, tiffBlob);
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Generate ZIP file
    if (onProgress) {
        onProgress({
            current: cards.length,
            total: cards.length,
            percentage: 85,
            status: 'compressing'
        });
    }

    const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
        (metadata) => {
            if (onProgress) {
                onProgress({
                    current: cards.length,
                    total: cards.length,
                    percentage: 85 + Math.round(metadata.percent * 0.15),
                    status: 'compressing'
                });
            }
        }
    );

    return zipBlob;
};

/**
 * Export wallet card backs as ZIP with Images only
 */
export const exportWalletCardBacksAsZip = async (count, onProgress, walletType = 'apple', cardDesign = 'classic') => {
    const zip = new JSZip();
    const tiffFolder = zip.folder('card-backs');
    const WalletCardBack = await getWalletCardBackComponent(cardDesign);

    // Generate dummy cards for the backs (we just need the count)
    const cards = Array(count).fill({}).map((_, i) => ({ id: i }));

    let processedCount = 0;

    // Process cards in batches
    for (let batchStart = 0; batchStart < cards.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, cards.length);
        const batchCards = cards.slice(batchStart, batchEnd);

        const batchProps = batchCards.map(() => ({
            walletType
        }));

        // Render entire batch at once
        const batchCanvases = await renderCardBatchToImages(WalletCardBack, batchProps, (itemIndex) => {
            processedCount = batchStart + itemIndex;
            if (onProgress) {
                onProgress({
                    current: processedCount,
                    total: cards.length,
                    percentage: Math.round((processedCount / cards.length) * 80),
                    status: 'creating-cardback-zip'
                });
            }
        });

        // Convert canvases to TIFF/PNG and add to ZIP
        for (let i = 0; i < batchCanvases.length; i++) {
            const canvas = batchCanvases[i];
            const baseFileName = `${String(batchStart + i + 1).padStart(4, '0')}_wallet-back`;

            // Add TIFF (PNG format)
            const tiffBlob = await canvasToTiffBlob(canvas);
            tiffFolder.file(`${baseFileName}.png`, tiffBlob);
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Generate ZIP file
    const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }
    );

    return zipBlob;
};

/**
 * Download wallet cards as ZIP (PDFs only)
 */
export const downloadWalletCardsZip = async (cards, onProgress, walletType = 'apple', cardDesign = 'classic') => {
    const zipBlob = await exportWalletCardsAsZip(cards, onProgress, walletType, cardDesign);
    const timestamp = new Date().toISOString().slice(0, 10);
    saveAs(zipBlob, `wallet-cards_${timestamp}_${cards.length}-cards.zip`);
};

/**
 * Download wallet cards as ZIP (PDFs + Images)
 */
export const downloadWalletCardsWithTiffZip = async (cards, onProgress, walletType = 'apple', cardDesign = 'classic') => {
    const zipBlob = await exportWalletCardsWithTiffAsZip(cards, onProgress, walletType, cardDesign);
    const timestamp = new Date().toISOString().slice(0, 10);
    saveAs(zipBlob, `wallet-cards_${timestamp}_${cards.length}-cards_pdf+images.zip`);
};

/**
 * Download wallet cards as ZIP (Images Only)
 */
export const downloadWalletCardsImagesZip = async (cards, onProgress, walletType = 'apple', cardDesign = 'classic') => {
    const zipBlob = await exportWalletCardsImagesOnlyAsZip(cards, onProgress, walletType, cardDesign);
    const timestamp = new Date().toISOString().slice(0, 10);
    saveAs(zipBlob, `wallet-cards_${timestamp}_${cards.length}-cards_images.zip`);
};

/**
 * Download wallet card backs as ZIP (Images Only)
 */
export const downloadWalletCardBacksImagesZip = async (count, onProgress, walletType = 'apple', cardDesign = 'classic') => {
    const zipBlob = await exportWalletCardBacksAsZip(count, onProgress, walletType, cardDesign);
    const timestamp = new Date().toISOString().slice(0, 10);
    saveAs(zipBlob, `wallet-card-backs_${timestamp}_${count}-cards.zip`);
};

export default {
    exportWalletCardsAsZip,
    exportWalletCardsWithTiffAsZip,
    exportWalletCardsImagesOnlyAsZip,
    downloadWalletCardsZip,
    downloadWalletCardsWithTiffZip,
    downloadWalletCardsImagesZip,
    downloadWalletCardBacksImagesZip,
};
