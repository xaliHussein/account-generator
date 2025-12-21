import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { generateAccountPDF } from './pdfGenerator';

/**
 * Export multiple accounts as individual PDFs in a ZIP archive
 */
export const exportAccountsAsZip = async (accounts, onProgress, customLogo = null, cardColor = 'blue') => {
    const zip = new JSZip();
    const folder = zip.folder('accounts');

    // Generate PDFs in batches for better performance
    const batchSize = 50;
    let processed = 0;

    for (let i = 0; i < accounts.length; i += batchSize) {
        const batch = accounts.slice(i, Math.min(i + batchSize, accounts.length));

        await Promise.all(
            batch.map(async (account, index) => {
                const pdf = await generateAccountPDF(account, 1, customLogo, undefined, cardColor);
                const pdfBlob = pdf.output('arraybuffer');
                const fileName = `${String(i + index + 1).padStart(4, '0')}_${account.username}_${account.accountId.slice(-8)}.pdf`;
                folder.file(fileName, pdfBlob);
            })
        );

        processed += batch.length;

        if (onProgress) {
            onProgress({
                current: processed,
                total: accounts.length,
                percentage: Math.round((processed / accounts.length) * 100),
                status: processed < accounts.length ? 'packaging' : 'finalizing',
            });
        }
    }

    // Generate ZIP file
    if (onProgress) {
        onProgress({
            current: accounts.length,
            total: accounts.length,
            percentage: 100,
            status: 'compressing',
        });
    }

    const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
        (metadata) => {
            if (onProgress) {
                onProgress({
                    current: accounts.length,
                    total: accounts.length,
                    percentage: Math.round(metadata.percent),
                    status: 'compressing',
                });
            }
        }
    );

    return zipBlob;
};

/**
 * Download accounts as ZIP file
 */
export const downloadAccountsZip = async (accounts, onProgress, customLogo = null, cardColor = 'blue') => {
    const zipBlob = await exportAccountsAsZip(accounts, onProgress, customLogo, cardColor);
    const timestamp = new Date().toISOString().slice(0, 10);
    saveAs(zipBlob, `accounts_${timestamp}_${accounts.length}-cards.zip`);
};

/**
 * Export accounts data as JSON
 */
export const exportAccountsAsJSON = (accounts) => {
    const data = JSON.stringify(accounts, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const timestamp = new Date().toISOString().slice(0, 10);
    saveAs(blob, `accounts_${timestamp}_${accounts.length}.json`);
};

/**
 * Export accounts data as CSV
 */
export const exportAccountsAsCSV = (accounts) => {
    const headers = ['Account ID', 'Username', 'Email', 'Password', 'First Name', 'Last Name', 'Created At', 'Status'];
    const rows = accounts.map(account => [
        account.accountId,
        account.username,
        account.email,
        account.password,
        account.firstName,
        account.lastName,
        account.createdAt,
        account.status,
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const timestamp = new Date().toISOString().slice(0, 10);
    saveAs(blob, `accounts_${timestamp}_${accounts.length}.csv`);
};

export default {
    exportAccountsAsZip,
    downloadAccountsZip,
    exportAccountsAsJSON,
    exportAccountsAsCSV,
};
