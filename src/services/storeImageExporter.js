import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import ReactDOM from 'react-dom/client';
import React from 'react';

/**
 * Store Image Exporter
 * Exports Account Cards and Card Backs as Images (PNG/TIFF)
 */

// WalletCard dimensions (for wallet card exports)
const WALLET_CARD_WIDTH_PX = 320;
const WALLET_CARD_HEIGHT_PX = 200;

// AccountCard and CardBack dimensions (standard credit card aspect ratio)
// CR80 standard: 85.6mm × 53.98mm ≈ 1.586:1 ratio
// Using 400px width for good quality at 3x render scale (1200px final)
const ACCOUNT_CARD_WIDTH_PX = 400;
const ACCOUNT_CARD_HEIGHT_PX = 252;

// Batch size for rendering
const BATCH_SIZE = 10;

// Render scale for quality (3 = 300 DPI approx relative to screen)
const RENDER_SCALE = 3;

// CSS Overrides to ensure AccountCard fits within the CR80 dimensions
const ACCOUNT_CARD_CSS_OVERRIDES = `
    .account-card-preview.apple-style {
        max-width: none !important;
        width: 100% !important;
        height: 100% !important;
        box-shadow: none !important;
        border: none !important;
        margin: 0 !important;
        box-sizing: border-box !important;
        background: white !important; /* Force white background */
    }
    .apple-card-header {
        padding: 5px 12px !important;
    }
    .apple-card-content {
        padding: 6px !important;
        gap: 6px !important;
    }
    .apple-card-qr-section {
        background: white !important; /* Ensure QR background is white */
    }
    .apple-card-right {
        gap: 3px !important;
    }
    .apple-credentials-box {
        margin-bottom: 2px !important;
    }
    .apple-card-footer {
        padding: 10px 12px !important; /* Increased whitespace */
    }
`;

/**
 * Dynamically import AccountCard component
 */
const getAccountCardComponent = async () => {
    const module = await import('../components/AccountCard.jsx');
    return module.default;
};

/**
 * Dynamically import CardBack component
 */
const getCardBackComponent = async () => {
    const module = await import('../components/CardBack.jsx');
    return module.default;
};

/**
 * Render a batch of cards to canvas images
 * @param {React.Component} Component - The card component to render
 * @param {Array} cardsProps - Array of props for each card
 * @param {Object} dimensions - Card dimensions {width, height}
 * @param {Object} dimensions - Card dimensions {width, height}
 * @param {Function} onItemProgress - Progress callback
 * @param {string} cssOverrides - Optional CSS to inject into the export container
 */
const renderCardBatchToImages = async (Component, cardsProps, dimensions, onItemProgress, cssOverrides = '') => {
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

    // Inject CSS overrides if provided
    if (cssOverrides) {
        const style = document.createElement('style');
        style.innerText = cssOverrides;
        container.appendChild(style);
    }

    // Create wrapper divs for each card
    const wrappers = [];
    const roots = [];

    for (let i = 0; i < cardsProps.length; i++) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            width: ${dimensions.width}px;
            height: ${dimensions.height}px;
            flex-shrink: 0;
        `;
        container.appendChild(wrapper);
        wrappers.push(wrapper);

        // Render React component directly like walletZipExporter
        const root = ReactDOM.createRoot(wrapper);
        root.render(React.createElement(Component, cardsProps[i]));
        roots.push(root);
    }

    // Wait for all React components to render and useEffects (QR code)
    await new Promise(resolve => setTimeout(resolve, 300)); // Increased wait for QR generation

    // Capture each card as canvas
    for (let i = 0; i < wrappers.length; i++) {
        const canvas = await html2canvas(wrappers[i], {
            scale: RENDER_SCALE,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false,
            width: dimensions.width,
            height: dimensions.height,
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
 * Convert canvas to TIFF blob using PNG as intermediate
 */
const canvasToTiffBlob = async (canvas) => {
    const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png', 1.0);
    });
    return await blob.arrayBuffer();
};

/**
 * Export Account Cards as ZIP (Images Only)
 */
export const exportAccountCardsImagesAsZip = async (accounts, onProgress, customLogo = null, cardColor = 'blue') => {
    const zip = new JSZip();
    const tiffFolder = zip.folder('images');
    const AccountCard = await getAccountCardComponent();

    let processedCount = 0;

    // Process in batches
    for (let batchStart = 0; batchStart < accounts.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, accounts.length);
        const batchAccounts = accounts.slice(batchStart, batchEnd);

        const batchProps = batchAccounts.map((account) => ({
             account: account,
             showQR: true,
             batchNumber: 1, // Defaulting to 1 as we don't always have batch info structure here easily. logic improvement possible.
             customLogo: customLogo,
             cardColor: cardColor
        }));

        // Render batch
        const batchCanvases = await renderCardBatchToImages(
            AccountCard, 
            batchProps, 
            { width: ACCOUNT_CARD_WIDTH_PX, height: ACCOUNT_CARD_HEIGHT_PX },
            (itemIndex) => {
            processedCount = batchStart + itemIndex;
            if (onProgress) {
                onProgress({
                    current: processedCount,
                    total: accounts.length,
                    percentage: Math.round((processedCount / accounts.length) * 80),
                    status: 'creating-zip-images'
                });
            }
        },
        ACCOUNT_CARD_CSS_OVERRIDES);

        // Add to ZIP
        for (let i = 0; i < batchCanvases.length; i++) {
            const account = batchAccounts[i];
            const canvas = batchCanvases[i];
            // Format: 0001_username_ABC123.png
            const safeUsername = (account.username || 'user').replace(/[^a-z0-9]/gi, '_');
            const safeSerial = (account.serialNumber || account.accountId || '000').slice(-8);
            const baseFileName = `${String(batchStart + i + 1).padStart(4, '0')}_${safeUsername}_${safeSerial}`;

            const tiffBlob = await canvasToTiffBlob(canvas);
            tiffFolder.file(`${baseFileName}.png`, tiffBlob);
        }

        await new Promise(resolve => setTimeout(resolve, 20));
    }

    // Generate ZIP
    if (onProgress) {
        onProgress({
            current: accounts.length,
            total: accounts.length,
            percentage: 85,
            status: 'compressing'
        });
    }

    const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
        (metadata) => {
            if (onProgress) {
                onProgress({
                    current: accounts.length,
                    total: accounts.length,
                    percentage: 85 + Math.round(metadata.percent * 0.15),
                    status: 'compressing'
                });
            }
        }
    );

    return zipBlob;
};

/**
 * Export Card Backs as ZIP (Images Only)
 */
export const exportCardBacksImagesAsZip = async (count, onProgress, customLogo = null, cardColor = 'blue', accountIdType = 'apple') => {
    const zip = new JSZip();
    const tiffFolder = zip.folder('card-backs');
    const CardBack = await getCardBackComponent();

    // Generate dummy items
    const cards = Array(count).fill(0);
    let processedCount = 0;

    for (let batchStart = 0; batchStart < cards.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, cards.length);
        const batchLen = batchEnd - batchStart;

        const batchProps = Array(batchLen).fill({
            batchNumber: 1,
            customLogo,
            cardColor,
            accountIdType
        });

        const batchCanvases = await renderCardBatchToImages(
            CardBack, 
            batchProps, 
            { width: ACCOUNT_CARD_WIDTH_PX, height: ACCOUNT_CARD_HEIGHT_PX },
            (itemIndex) => {
            processedCount = batchStart + itemIndex;
            if (onProgress) {
                onProgress({
                    current: processedCount,
                    total: count,
                    percentage: Math.round((processedCount / count) * 80),
                    status: 'creating-cardback-zip'
                });
            }
        });

        for (let i = 0; i < batchCanvases.length; i++) {
            const canvas = batchCanvases[i];
            const baseFileName = `${String(batchStart + i + 1).padStart(4, '0')}_card-back`;
            const tiffBlob = await canvasToTiffBlob(canvas);
            tiffFolder.file(`${baseFileName}.png`, tiffBlob);
        }

        await new Promise(resolve => setTimeout(resolve, 20));
    }

    const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }
    );

    return zipBlob;
};

/**
 * Download Account Cards as ZIP (Images Only)
 */
export const downloadAccountCardsImagesZip = async (accounts, onProgress, customLogo = null, cardColor = 'blue') => {
    const zipBlob = await exportAccountCardsImagesAsZip(accounts, onProgress, customLogo, cardColor);
    const timestamp = new Date().toISOString().slice(0, 10);
    saveAs(zipBlob, `accounts_images_${timestamp}_${accounts.length}.zip`);
};

/**
 * Download Card Backs as ZIP (Images Only)
 */
export const downloadCardBacksImagesZip = async (count, onProgress, customLogo = null, cardColor = 'blue', accountIdType = 'apple') => {
    const zipBlob = await exportCardBacksImagesAsZip(count, onProgress, customLogo, cardColor, accountIdType);
    const timestamp = new Date().toISOString().slice(0, 10);
    saveAs(zipBlob, `card-backs_images_${timestamp}_${count}.zip`);
};

export default {
    downloadAccountCardsImagesZip,
    downloadCardBacksImagesZip
};
