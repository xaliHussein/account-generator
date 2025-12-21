import React, { useState, useCallback, useEffect } from 'react';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import GeneratorControls from './components/GeneratorControls';
import AccountCard from './components/AccountCard';
import AccountsList from './components/AccountsList';
import OperationLog from './components/OperationLog';
import ExportControls from './components/ExportControls';
import TipBanner from './components/TipBanner';
import Modal from './components/ui/Modal';
import Button from './components/ui/Button';
import Card from './components/ui/Card';
import ToastContainer from './components/ui/Toast';

// Hooks
import useAccounts from './hooks/useAccounts';
import useOperationLog from './hooks/useOperationLog';
import useToast from './hooks/useToast';

// Services
import { generateAccounts } from './services/accountGenerator';
import { downloadAccountPDF } from './services/pdfGenerator';
import { downloadAccountsZip, exportAccountsAsJSON, exportAccountsAsCSV } from './services/zipExporter';

// Icons
import { Eye, AlertTriangle, Trash2 } from 'lucide-react';

/**
 * Main Application Component
 */
function App() {
    // State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateProgress, setGenerateProgress] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(null);
    const [selectedAccountId, setSelectedAccountId] = useState(null);
    const [showTips, setShowTips] = useState(() => {
        try {
            return localStorage.getItem('hideTips') !== 'true';
        } catch {
            return true;
        }
    });
    const [deleteModal, setDeleteModal] = useState({ open: false, accountId: null });
    const [clearAllModal, setClearAllModal] = useState(false);

    // Custom hooks
    const {
        accounts,
        count: totalAccounts,
        todayCount,
        successRate,
        addAccounts,
        removeAccount,
        clearAccounts,
        getAccount,
    } = useAccounts();

    const {
        logs,
        logCreate,
        logDelete,
        logExport,
        logCopy,
        logDownload,
        logClearAll,
        clearLogs,
    } = useOperationLog();

    const toast = useToast();

    // Get selected account
    const selectedAccount = selectedAccountId ? getAccount(selectedAccountId) : accounts[0];

    // Auto-select first account when accounts change
    useEffect(() => {
        if (accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(accounts[0].id);
        } else if (accounts.length === 0) {
            setSelectedAccountId(null);
        }
    }, [accounts, selectedAccountId]);

    /**
     * Handle account generation
     */
    const handleGenerate = useCallback(async (count) => {
        setIsGenerating(true);
        setGenerateProgress({ current: 0, total: count, percentage: 0, status: 'generating' });

        try {
            const newAccounts = await generateAccounts(count, (progress) => {
                setGenerateProgress(progress);
            });

            addAccounts(newAccounts);
            logCreate(count);
            setSelectedAccountId(newAccounts[0].id);

            toast.success(
                'Accounts Generated!',
                `Successfully created ${count.toLocaleString()} accounts`
            );
        } catch (error) {
            console.error('Generation failed:', error);
            toast.error('Generation Failed', error.message);
        } finally {
            setIsGenerating(false);
            setGenerateProgress(null);
        }
    }, [addAccounts, logCreate, toast]);

    /**
     * Handle account deletion
     */
    const handleDelete = useCallback((accountId) => {
        setDeleteModal({ open: true, accountId });
    }, []);

    const confirmDelete = useCallback(() => {
        const { accountId } = deleteModal;
        removeAccount(accountId);
        logDelete(1);

        // Select next account if deleted was selected
        if (selectedAccountId === accountId) {
            const index = accounts.findIndex(a => a.id === accountId);
            const nextAccount = accounts[index + 1] || accounts[index - 1];
            setSelectedAccountId(nextAccount?.id || null);
        }

        toast.success('Account Deleted', 'Account has been removed');
        setDeleteModal({ open: false, accountId: null });
    }, [deleteModal, removeAccount, logDelete, selectedAccountId, accounts, toast]);

    /**
     * Handle clear all accounts
     */
    const handleClearAll = useCallback(() => {
        setClearAllModal(true);
    }, []);

    const confirmClearAll = useCallback(() => {
        const count = accounts.length;
        clearAccounts();
        logClearAll(count);
        setSelectedAccountId(null);
        toast.success('All Accounts Cleared', `Removed ${count.toLocaleString()} accounts`);
        setClearAllModal(false);
    }, [accounts.length, clearAccounts, logClearAll, toast]);

    /**
     * Handle ZIP export
     */
    const handleExportZip = useCallback(async () => {
        if (accounts.length === 0) return;

        setIsExporting(true);
        setExportProgress({ current: 0, total: accounts.length, percentage: 0, status: 'packaging' });

        try {
            await downloadAccountsZip(accounts, (progress) => {
                setExportProgress(progress);
            });

            logDownload(accounts.length);
            toast.success(
                'Export Complete!',
                `Downloaded ${accounts.length.toLocaleString()} account PDFs as ZIP`
            );
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Export Failed', error.message);
        } finally {
            setIsExporting(false);
            setExportProgress(null);
        }
    }, [accounts, logDownload, toast]);

    /**
     * Handle JSON export
     */
    const handleExportJSON = useCallback(() => {
        try {
            exportAccountsAsJSON(accounts);
            logExport('json', accounts.length);
            toast.success('Exported as JSON', `${accounts.length.toLocaleString()} accounts exported`);
        } catch (error) {
            toast.error('Export Failed', error.message);
        }
    }, [accounts, logExport, toast]);

    /**
     * Handle CSV export
     */
    const handleExportCSV = useCallback(() => {
        try {
            exportAccountsAsCSV(accounts);
            logExport('csv', accounts.length);
            toast.success('Exported as CSV', `${accounts.length.toLocaleString()} accounts exported`);
        } catch (error) {
            toast.error('Export Failed', error.message);
        }
    }, [accounts, logExport, toast]);

    /**
     * Handle single PDF download
     */
    const handleDownloadSingle = useCallback(async (account) => {
        try {
            await downloadAccountPDF(account);
            logDownload(1);
            toast.success('PDF Downloaded', `Account card for ${account.username} saved`);
        } catch (error) {
            toast.error('Download Failed', error.message);
        }
    }, [logDownload, toast]);

    /**
     * Handle copy action
     */
    const handleCopy = useCallback((field, accountId) => {
        logCopy(field, accountId);
        toast.info('Copied!', `${field === 'all' ? 'Credentials' : field.charAt(0).toUpperCase() + field.slice(1)} copied to clipboard`);
    }, [logCopy, toast]);

    /**
     * Handle tip dismissal
     */
    const handleDismissTips = useCallback(() => {
        setShowTips(false);
        try {
            localStorage.setItem('hideTips', 'true');
        } catch { }
    }, []);

    return (
        <div className="app-container">
            {/* Header with stats */}
            <Header
                totalAccounts={totalAccounts}
                todayCount={todayCount}
                successRate={successRate}
            />

            {/* Main content */}
            <main className="main-content">
                {/* Onboarding tips */}
                {showTips && <TipBanner onDismiss={handleDismissTips} />}

                <div className="dashboard-grid">
                    {/* Left column - Main content */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                        {/* Generator controls */}
                        <GeneratorControls
                            onGenerate={handleGenerate}
                            isGenerating={isGenerating}
                            progress={generateProgress}
                        />

                        {/* Accounts list */}
                        <AccountsList
                            accounts={accounts}
                            selectedId={selectedAccountId}
                            onSelect={setSelectedAccountId}
                            onDelete={handleDelete}
                            onCopy={handleCopy}
                            onDownloadSingle={handleDownloadSingle}
                        />

                        {/* Operation log */}
                        <OperationLog logs={logs} onClear={clearLogs} />
                    </div>

                    {/* Right column - Preview & Export */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--spacing-xl)',
                        position: 'sticky',
                        top: 'calc(72px + var(--spacing-xl))',
                        alignSelf: 'start'
                    }}>
                        {/* Account preview card */}
                        <Card hover={false}>
                            <Card.Header>
                                <Eye size={18} style={{ color: 'var(--color-accent-green)' }} />
                                <span>Card Preview</span>
                            </Card.Header>
                            <Card.Body style={{ padding: 0 }}>
                                <AccountCard account={selectedAccount} />
                            </Card.Body>
                        </Card>

                        {/* Export controls */}
                        <ExportControls
                            accountsCount={accounts.length}
                            onExportZip={handleExportZip}
                            onExportJSON={handleExportJSON}
                            onExportCSV={handleExportCSV}
                            onClearAll={handleClearAll}
                            isExporting={isExporting}
                            exportProgress={exportProgress}
                            disabled={isGenerating}
                        />
                    </div>
                </div>
            </main>

            {/* Footer */}
            <Footer />

            {/* Toast notifications */}
            <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

            {/* Delete confirmation modal */}
            <Modal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, accountId: null })}
                title="Delete Account"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setDeleteModal({ open: false, accountId: null })}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            icon={Trash2}
                            onClick={confirmDelete}
                        >
                            Delete
                        </Button>
                    </>
                }
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)' }}>
                    <div style={{
                        padding: 'var(--spacing-sm)',
                        background: 'rgba(255, 59, 48, 0.1)',
                        borderRadius: 'var(--border-radius-md)',
                        color: 'var(--color-accent-red)'
                    }}>
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-primary)' }}>
                            Are you sure you want to delete this account?
                        </p>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                            This action cannot be undone. The account credentials will be permanently removed.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* Clear all confirmation modal */}
            <Modal
                isOpen={clearAllModal}
                onClose={() => setClearAllModal(false)}
                title="Clear All Accounts"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setClearAllModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            icon={Trash2}
                            onClick={confirmClearAll}
                        >
                            Clear All ({accounts.length.toLocaleString()})
                        </Button>
                    </>
                }
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)' }}>
                    <div style={{
                        padding: 'var(--spacing-sm)',
                        background: 'rgba(255, 59, 48, 0.1)',
                        borderRadius: 'var(--border-radius-md)',
                        color: 'var(--color-accent-red)'
                    }}>
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-primary)' }}>
                            Are you sure you want to delete all {accounts.length.toLocaleString()} accounts?
                        </p>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                            This action cannot be undone. All account credentials will be permanently removed.
                            Consider exporting your data first.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default App;
