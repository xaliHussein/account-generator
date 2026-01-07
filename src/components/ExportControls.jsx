import React from 'react';
import {
    Download,
    Archive,
    FileJson,
    FileSpreadsheet,
    Trash2,
    Loader2,
    Printer
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import ProgressBar from './ui/ProgressBar';

/**
 * Export controls component
 */
const ExportControls = ({
    accountsCount,
    onExportZip,
    onExportPrintSheet,
    onExportJSON,
    onExportCSV,
    onClearAll,
    isExporting,
    exportProgress,
    disabled
}) => {
    if (accountsCount === 0) {
        return null;
    }

    return (
        <Card>
            <Card.Header>
                <Download size={18} style={{ color: 'var(--color-accent-teal)' }} />
                <span>Export & Manage</span>
            </Card.Header>
            <Card.Body>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {/* Export progress */}
                    {isExporting && exportProgress && (
                        <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                            <ProgressBar
                                value={exportProgress.current}
                                max={exportProgress.total}
                                status={getExportStatusMessage(exportProgress)}
                            />
                        </div>
                    )}

                    {/* ZIP export */}
                    <Button
                        variant="success"
                        fullWidth
                        icon={isExporting ? Loader2 : Archive}
                        onClick={onExportZip}
                        disabled={disabled || isExporting}
                        loading={isExporting}
                    >
                        {isExporting
                            ? 'Preparing ZIP...'
                            : `Download All as ZIP (${accountsCount} PDFs)`
                        }
                    </Button>

                    {/* Print Sheet PDF export */}
                    <Button
                        variant="primary"
                        fullWidth
                        icon={isExporting ? Loader2 : Printer}
                        onClick={onExportPrintSheet}
                        disabled={disabled || isExporting}
                        loading={isExporting}
                    >
                        {isExporting
                            ? 'Creating Print Sheet...'
                            : `Download Print Sheet PDF (${accountsCount} cards)`
                        }
                    </Button>
                    <span style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-tertiary)',
                        textAlign: 'center',
                        marginTop: '-8px'
                    }}>
                        Optimized for 60cm × 90cm printing plate (~100 cards/page)
                    </span>

                    {/* Other exports */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 'var(--spacing-sm)'
                    }}>
                        <Button
                            variant="secondary"
                            icon={FileJson}
                            onClick={onExportJSON}
                            disabled={disabled || isExporting}
                        >
                            Export JSON
                        </Button>
                        <Button
                            variant="secondary"
                            icon={FileSpreadsheet}
                            onClick={onExportCSV}
                            disabled={disabled || isExporting}
                        >
                            Export CSV
                        </Button>
                    </div>

                    {/* Divider */}
                    <div style={{
                        height: 1,
                        background: 'var(--border-color)',
                        margin: 'var(--spacing-sm) 0'
                    }} />

                    {/* Clear all */}
                    <Button
                        variant="ghost"
                        icon={Trash2}
                        onClick={onClearAll}
                        disabled={disabled || isExporting}
                        style={{ color: 'var(--color-accent-red)' }}
                    >
                        Clear All Accounts
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );
};

/**
 * Get export status message
 */
const getExportStatusMessage = (progress) => {
    if (!progress) return '';

    switch (progress.status) {
        case 'packaging':
            return `Creating PDFs... (${progress.current}/${progress.total})`;
        case 'compressing':
            return 'Compressing ZIP archive...';
        case 'finalizing':
            return 'Finalizing download...';
        case 'creating-sheet':
            return `Adding cards to print sheet... (${progress.current}/${progress.total})`;
        default:
            return `Processing... (${progress.current}/${progress.total})`;
    }
};

export default ExportControls;

