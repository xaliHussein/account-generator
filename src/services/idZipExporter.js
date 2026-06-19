import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactDOM from 'react-dom/client';
import React from 'react';

/**
 * ID Cards ZIP Exporter
 * Exports ID cards as ZIP of PDFs or PNG images. Mirrors the wallet ZIP exporter.
 */

const CARD_DIMENSIONS = { cardWidth: 85.6, cardHeight: 53.98 };
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

const frontCardProps = (card, qrLogo, cardDesign, customImages) =>
    cardDesign === 'custom'
        ? { card, image: customImages?.front, showQR: true, qrLogo }
        : { card, showQR: true, qrLogo };

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

const canvasToPngBlob = async (canvas) => {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));
    return await blob.arrayBuffer();
};

/**
 * Export ID cards as ZIP (PDFs only).
 */
export const exportIdCardsAsZip = async (cards, onProgress, cardDesign = 'classic', qrLogo = null, customImages = {}) => {
    const zip = new JSZip();
    const folder = zip.folder('id-cards');
    const IdCard = await getIdCardComponent(cardDesign);

    let processedCount = 0;

    for (let batchStart = 0; batchStart < cards.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, cards.length);
        const batchCards = cards.slice(batchStart, batchEnd);
        const batchProps = batchCards.map((card) => frontCardProps(card, qrLogo, cardDesign, customImages));

        const batchCanvases = await renderCardBatchToImages(IdCard, batchProps, (itemIndex) => {
            processedCount = batchStart + itemIndex;
            if (onProgress) {
                onProgress({ current: processedCount, total: cards.length, percentage: Math.round((processedCount / cards.length) * 80), status: 'creating-zip' });
            }
        });

        for (let i = 0; i < batchCanvases.length; i++) {
            const card = batchCards[i];
            const pdfBlob = canvasToPdfBlob(batchCanvases[i]);
            const fileName = `${String(batchStart + i + 1).padStart(4, '0')}_id-card_${card.serial_number || card.id}.pdf`;
            folder.file(fileName, pdfBlob);
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
    }

    if (onProgress) onProgress({ current: cards.length, total: cards.length, percentage: 85, status: 'compressing' });

    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (metadata) => {
        if (onProgress) onProgress({ current: cards.length, total: cards.length, percentage: 85 + Math.round(metadata.percent * 0.15), status: 'compressing' });
    });
};

/**
 * Export ID cards as ZIP (Images only).
 */
export const exportIdCardsImagesOnlyAsZip = async (cards, onProgress, cardDesign = 'classic', qrLogo = null, customImages = {}) => {
    const zip = new JSZip();
    const folder = zip.folder('images');
    const IdCard = await getIdCardComponent(cardDesign);

    let processedCount = 0;

    for (let batchStart = 0; batchStart < cards.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, cards.length);
        const batchCards = cards.slice(batchStart, batchEnd);
        const batchProps = batchCards.map((card) => frontCardProps(card, qrLogo, cardDesign, customImages));

        const batchCanvases = await renderCardBatchToImages(IdCard, batchProps, (itemIndex) => {
            processedCount = batchStart + itemIndex;
            if (onProgress) {
                onProgress({ current: processedCount, total: cards.length, percentage: Math.round((processedCount / cards.length) * 80), status: 'creating-zip-images' });
            }
        });

        for (let i = 0; i < batchCanvases.length; i++) {
            const card = batchCards[i];
            const pngBlob = await canvasToPngBlob(batchCanvases[i]);
            const baseFileName = `${String(batchStart + i + 1).padStart(4, '0')}_id-card_${card.serial_number || card.id}`;
            folder.file(`${baseFileName}.png`, pngBlob);
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
    }

    if (onProgress) onProgress({ current: cards.length, total: cards.length, percentage: 85, status: 'compressing' });

    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (metadata) => {
        if (onProgress) onProgress({ current: cards.length, total: cards.length, percentage: 85 + Math.round(metadata.percent * 0.15), status: 'compressing' });
    });
};

/**
 * Export ID card backs as ZIP (Images only).
 */
export const exportIdCardBacksAsZip = async (count, onProgress, cardDesign = 'classic', customImages = {}) => {
    const zip = new JSZip();
    const folder = zip.folder('card-backs');
    const IdCardBack = await getIdCardBackComponent(cardDesign);

    const cards = Array(count).fill({}).map((_, i) => ({ id: i }));
    let processedCount = 0;

    for (let batchStart = 0; batchStart < cards.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, cards.length);
        const batchCards = cards.slice(batchStart, batchEnd);
        const batchProps = batchCards.map(() => (cardDesign === 'custom' ? { image: customImages?.back } : {}));

        const batchCanvases = await renderCardBatchToImages(IdCardBack, batchProps, (itemIndex) => {
            processedCount = batchStart + itemIndex;
            if (onProgress) {
                onProgress({ current: processedCount, total: cards.length, percentage: Math.round((processedCount / cards.length) * 80), status: 'creating-cardback-zip' });
            }
        });

        for (let i = 0; i < batchCanvases.length; i++) {
            const pngBlob = await canvasToPngBlob(batchCanvases[i]);
            const baseFileName = `${String(batchStart + i + 1).padStart(4, '0')}_id-back`;
            folder.file(`${baseFileName}.png`, pngBlob);
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
    }

    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
};

export const downloadIdCardsZip = async (cards, onProgress, cardDesign = 'classic', qrLogo = null, customImages = {}) => {
    const zipBlob = await exportIdCardsAsZip(cards, onProgress, cardDesign, qrLogo, customImages);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    saveAs(zipBlob, `id-cards_${timestamp}_${cards.length}-cards.zip`);
};

export const downloadIdCardsImagesZip = async (cards, onProgress, cardDesign = 'classic', qrLogo = null, customImages = {}) => {
    const zipBlob = await exportIdCardsImagesOnlyAsZip(cards, onProgress, cardDesign, qrLogo, customImages);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    saveAs(zipBlob, `id-cards_${timestamp}_${cards.length}-cards_images.zip`);
};

export const downloadIdCardBacksImagesZip = async (count, onProgress, cardDesign = 'classic', customImages = {}) => {
    const zipBlob = await exportIdCardBacksAsZip(count, onProgress, cardDesign, customImages);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    saveAs(zipBlob, `id-card-backs_${timestamp}_${count}-cards.zip`);
};

export default {
    exportIdCardsAsZip,
    exportIdCardsImagesOnlyAsZip,
    downloadIdCardsZip,
    downloadIdCardsImagesZip,
    downloadIdCardBacksImagesZip,
};
