import React, { useState, useCallback, useEffect } from 'react';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import GeneratorControls from './components/GeneratorControls';
import AccountCard from './components/AccountCard';
import CardBack from './components/CardBack';
import AccountsList from './components/AccountsList';
import OperationLog from './components/OperationLog';
import ExportControls from './components/ExportControls';
import TipBanner from './components/TipBanner';
import Modal from './components/ui/Modal';
import Button from './components/ui/Button';
import Card from './components/ui/Card';
import ToastContainer from './components/ui/Toast';
import { logout } from './components/LoginPage';

// Hooks
import useAccounts from './hooks/useAccounts';
import useOperationLog from './hooks/useOperationLog';
import useToast from './hooks/useToast';

// Services
import { downloadAccountPDF, downloadCardBackPDF, downloadPrintSheetPDF } from './services/pdfGenerator';
import { downloadAccountsZip, exportAccountsAsJSON, exportAccountsAsCSV } from './services/zipExporter';

// Icons
import { Eye, AlertTriangle, Trash2, Upload, X, Settings, LogOut, Download } from 'lucide-react';

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
    const [customLogo, setCustomLogo] = useState(null);
    const [cardBackLogo, setCardBackLogo] = useState(null); // Separate logo for card back
    const [cardColor, setCardColor] = useState('blue'); // 'blue' or 'black'
    const [emailType, setEmailType] = useState('random'); // 'random', 'icloud', or 'gmail'
    const [accountIdType, setAccountIdType] = useState('apple'); // 'apple' or 'google'
    const [passwordPrefix, setPasswordPrefix] = useState(''); // Custom password prefix

    // Print Sheet Size (default 60cm x 90cm)
    const [boardWidth, setBoardWidth] = useState('');
    const [boardHeight, setBoardHeight] = useState('');

    // Custom hooks
    const {
        accounts,
        count: totalAccounts,
        todayCount,
        successRate,
        loading: accountsLoading,
        generateAccountsApi,
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
            // Use server API to generate cards
            const newAccounts = await generateAccountsApi(count, emailType, cardColor, passwordPrefix || null);

            setGenerateProgress({ current: count, total: count, percentage: 100, status: 'complete' });
            logCreate(count);

            if (newAccounts.length > 0) {
                setSelectedAccountId(newAccounts[0].id);
            }

            toast.success(
                'Accounts Generated!',
                `Successfully created ${count.toLocaleString()} accounts (synced to server)`
            );
        } catch (error) {
            console.error('Generation failed:', error);
            toast.error('Generation Failed', error.response?.data?.message || error.message);
        } finally {
            setIsGenerating(false);
            setGenerateProgress(null);
        }
    }, [generateAccountsApi, logCreate, toast, emailType, cardColor, passwordPrefix]);

    /**
     * Handle account deletion
     */
    const handleDelete = useCallback((accountId) => {
        setDeleteModal({ open: true, accountId });
    }, []);

    const confirmDelete = useCallback(async () => {
        const { accountId } = deleteModal;

        try {
            await removeAccount(accountId);
            logDelete(1);

            // Select next account if deleted was selected
            if (selectedAccountId === accountId) {
                const index = accounts.findIndex(a => a.id === accountId);
                const nextAccount = accounts[index + 1] || accounts[index - 1];
                setSelectedAccountId(nextAccount?.id || null);
            }

            toast.success('Account Deleted', 'Account has been removed from server');
        } catch (error) {
            toast.error('Delete Failed', error.response?.data?.message || error.message);
        } finally {
            setDeleteModal({ open: false, accountId: null });
        }
    }, [deleteModal, removeAccount, logDelete, selectedAccountId, accounts, toast]);

    /**
     * Handle clear all accounts
     */
    const handleClearAll = useCallback(() => {
        setClearAllModal(true);
    }, []);

    const confirmClearAll = useCallback(async () => {
        const count = accounts.length;

        try {
            await clearAccounts();
            logClearAll(count);
            setSelectedAccountId(null);
            toast.success('All Accounts Cleared', `Removed ${count.toLocaleString()} accounts from server`);
        } catch (error) {
            toast.error('Clear Failed', error.response?.data?.message || error.message);
        } finally {
            setClearAllModal(false);
        }
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
            }, customLogo, cardColor, cardBackLogo);

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
    }, [accounts, logDownload, toast, customLogo, cardColor]);

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
     * Handle Print Sheet PDF export (60cm x 90cm printing plate)
     */
    const handleExportPrintSheet = useCallback(async () => {
        if (accounts.length === 0) return;

        setIsExporting(true);
        setExportProgress({ current: 0, total: accounts.length, percentage: 0, status: 'creating-sheet' });

        try {
            // Convert cm to mm (default: 60cm x 90cm = 600mm x 900mm)
            const widthMm = boardWidth ? parseFloat(boardWidth) * 10 : 600;
            const heightMm = boardHeight ? parseFloat(boardHeight) * 10 : 900;

            await downloadPrintSheetPDF(accounts, (progress) => {
                setExportProgress(progress);
            }, 1, customLogo, undefined, cardColor, widthMm, heightMm);

            logDownload(accounts.length);
            toast.success(
                'Print Sheet Ready!',
                `Downloaded print sheet with ${accounts.length.toLocaleString()} cards`
            );
        } catch (error) {
            console.error('Print sheet export failed:', error);
            toast.error('Export Failed', error.message);
        } finally {
            setIsExporting(false);
            setExportProgress(null);
        }
    }, [accounts, logDownload, toast, customLogo, cardColor, boardWidth, boardHeight]);

    /**
     * Handle single PDF download
     */
    const handleDownloadSingle = useCallback(async (account) => {
        try {
            await downloadAccountPDF(account, 1, customLogo, undefined, cardColor, cardBackLogo);
            logDownload(1);
            toast.success('PDF Downloaded', `Account card for ${account.username} saved`);
        } catch (error) {
            toast.error('Download Failed', error.message);
        }
    }, [logDownload, toast, customLogo, cardColor, cardBackLogo]);

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

    /**
     * Handle custom logo upload
     */
    const handleLogoUpload = useCallback((event) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Invalid File', 'Please upload an image file');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File Too Large', 'Image must be under 5MB');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                setCustomLogo(e.target.result);
                toast.success('Logo Uploaded', 'Custom logo has been set');
            };
            reader.readAsDataURL(file);
        }
    }, [toast]);

    /**
     * Handle remove custom logo
     */
    const handleRemoveLogo = useCallback(() => {
        setCustomLogo(null);
        toast.info('Logo Removed', 'Using default Apple logo');
    }, [toast]);

    return (
        <div className="app-container">
            {/* Header with stats */}
            {/* Header with Logout Button */}
            <div style={{ position: 'relative' }}>
                <Header
                    totalAccounts={totalAccounts}
                    todayCount={todayCount}
                    successRate={successRate}
                />
                <button
                    onClick={() => {
                        logout();
                        window.location.reload();
                    }}
                    style={{
                        position: 'absolute',
                        top: 'var(--spacing-md)',
                        right: 'var(--spacing-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-xs)',
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        border: '1px solid var(--border-color-strong)',
                        borderRadius: 'var(--border-radius-md)',
                        background: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-secondary)',
                        fontSize: 'var(--font-size-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = 'var(--color-accent-red)';
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.borderColor = 'var(--color-accent-red)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = 'var(--color-bg-secondary)';
                        e.currentTarget.style.color = 'var(--color-text-secondary)';
                        e.currentTarget.style.borderColor = 'var(--border-color-strong)';
                    }}
                >
                    <LogOut size={14} />
                    Logout
                </button>
            </div>

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
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--spacing-xs)' }}>
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-xs)',
                                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                                        background: 'var(--color-bg-tertiary)',
                                        borderRadius: 'var(--border-radius-sm)',
                                        cursor: 'pointer',
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--color-text-secondary)',
                                        transition: 'all 0.2s'
                                    }}>
                                        <Upload size={14} />
                                        {customLogo ? 'Change Logo' : 'Upload Logo'}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                    {customLogo && (
                                        <button
                                            onClick={handleRemoveLogo}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: 'var(--spacing-xs)',
                                                background: 'rgba(255, 59, 48, 0.1)',
                                                border: 'none',
                                                borderRadius: 'var(--border-radius-sm)',
                                                cursor: 'pointer',
                                                color: 'var(--color-accent-red)'
                                            }}
                                            title="Remove custom logo"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </Card.Header>
                            <Card.Body style={{ padding: 0 }}>
                                <AccountCard account={selectedAccount} customLogo={customLogo} cardColor={cardColor} />
                            </Card.Body>
                        </Card>

                        {/* Card Back Preview */}
                        <Card hover={false}>
                            <Card.Header>
                                <Eye size={18} style={{ color: 'var(--color-accent-purple)' }} />
                                <span>Card Back Preview</span>
                                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                    {/* Upload Logo Button */}
                                    <label
                                        htmlFor="card-back-logo-upload"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--spacing-xs)',
                                            padding: 'var(--spacing-xs) var(--spacing-sm)',
                                            background: 'var(--color-bg-tertiary)',
                                            borderRadius: 'var(--border-radius-sm)',
                                            cursor: 'pointer',
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--color-text-secondary)',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Upload size={14} />
                                        {cardBackLogo ? 'Change' : 'Upload'}
                                    </label>
                                    <input
                                        type="file"
                                        id="card-back-logo-upload"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                if (!file.type.startsWith('image/')) {
                                                    toast.error('Invalid File', 'Please upload an image file');
                                                    return;
                                                }
                                                if (file.size > 5 * 1024 * 1024) {
                                                    toast.error('File Too Large', 'Image must be under 5MB');
                                                    return;
                                                }
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    setCardBackLogo(ev.target.result);
                                                    toast.success('Back Logo Uploaded', 'Card back logo has been set');
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                    {/* Remove Logo Button */}
                                    {cardBackLogo && (
                                        <button
                                            onClick={() => setCardBackLogo(null)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: 'var(--spacing-xs)',
                                                background: 'rgba(255, 59, 48, 0.1)',
                                                border: 'none',
                                                borderRadius: 'var(--border-radius-sm)',
                                                cursor: 'pointer',
                                                color: 'var(--color-accent-red)'
                                            }}
                                            title="Remove logo"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                    {/* Download Card Back Button */}
                                    <button
                                        onClick={() => downloadCardBackPDF(1, cardBackLogo, cardColor, accountIdType)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--spacing-xs)',
                                            padding: 'var(--spacing-xs) var(--spacing-sm)',
                                            background: 'var(--color-accent-green)',
                                            border: 'none',
                                            borderRadius: 'var(--border-radius-sm)',
                                            cursor: 'pointer',
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'white'
                                        }}
                                        title="Download card back as PDF"
                                    >
                                        <Download size={12} />
                                        Download
                                    </button>
                                </div>
                            </Card.Header>
                            <Card.Body style={{ padding: 'var(--spacing-md)' }}>
                                <CardBack batchNumber={1} customLogo={cardBackLogo} cardColor={cardColor} accountIdType={accountIdType} />
                            </Card.Body>
                        </Card>

                        {/* Card Settings */}
                        <Card hover={false}>
                            <Card.Header>
                                <Settings size={18} style={{ color: 'var(--color-accent-purple)' }} />
                                <span>Card Settings</span>
                            </Card.Header>
                            <Card.Body>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                    {/* Card Color */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                        <label style={{
                                            fontSize: 'var(--font-size-sm)',
                                            fontWeight: 'var(--font-weight-medium)',
                                            color: 'var(--color-text-secondary)'
                                        }}>Card Color</label>
                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                            <button
                                                onClick={() => setCardColor('blue')}
                                                style={{
                                                    flex: 1,
                                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                                    border: cardColor === 'blue' ? '2px solid var(--color-accent-blue)' : '2px solid var(--border-color)',
                                                    borderRadius: 'var(--border-radius-md)',
                                                    background: cardColor === 'blue' ? 'rgba(0, 136, 204, 0.15)' : 'var(--color-bg-secondary)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--spacing-sm)',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <span style={{ width: 16, height: 16, borderRadius: 4, background: '#0088CC' }}></span>
                                                <span style={{ fontWeight: cardColor === 'blue' ? 600 : 400 }}>Blue</span>
                                            </button>
                                            <button
                                                onClick={() => setCardColor('black')}
                                                style={{
                                                    flex: 1,
                                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                                    border: cardColor === 'black' ? '2px solid #1E1E1E' : '2px solid var(--border-color)',
                                                    borderRadius: 'var(--border-radius-md)',
                                                    background: cardColor === 'black' ? 'rgba(30, 30, 30, 0.15)' : 'var(--color-bg-secondary)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--spacing-sm)',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <span style={{ width: 16, height: 16, borderRadius: 4, background: '#1E1E1E' }}></span>
                                                <span style={{ fontWeight: cardColor === 'black' ? 600 : 400 }}>Black</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Account ID Type */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                        <label style={{
                                            fontSize: 'var(--font-size-sm)',
                                            fontWeight: 'var(--font-weight-medium)',
                                            color: 'var(--color-text-secondary)'
                                        }}>Card Back Account Type</label>
                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                            <button
                                                onClick={() => setAccountIdType('apple')}
                                                style={{
                                                    flex: 1,
                                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                                    border: accountIdType === 'apple' ? '2px solid var(--color-accent-blue)' : '2px solid var(--border-color)',
                                                    borderRadius: 'var(--border-radius-md)',
                                                    background: accountIdType === 'apple' ? 'rgba(0, 136, 204, 0.15)' : 'var(--color-bg-secondary)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--spacing-sm)',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <span style={{ fontWeight: accountIdType === 'apple' ? 600 : 400 }}>Apple ID</span>
                                            </button>
                                            <button
                                                onClick={() => setAccountIdType('google')}
                                                style={{
                                                    flex: 1,
                                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                                    border: accountIdType === 'google' ? '2px solid #EA4335' : '2px solid var(--border-color)',
                                                    borderRadius: 'var(--border-radius-md)',
                                                    background: accountIdType === 'google' ? 'rgba(234, 67, 53, 0.15)' : 'var(--color-bg-secondary)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--spacing-sm)',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <span style={{ fontWeight: accountIdType === 'google' ? 600 : 400 }}>Google ID</span>
                                            </button>
                                        </div>
                                        <span style={{
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--color-text-tertiary)'
                                        }}>
                                            Changes the text on the card back
                                        </span>
                                    </div>

                                    {/* Email Type */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                        <label style={{
                                            fontSize: 'var(--font-size-sm)',
                                            fontWeight: 'var(--font-weight-medium)',
                                            color: 'var(--color-text-secondary)'
                                        }}>Email Type</label>
                                        <select
                                            value={emailType}
                                            onChange={(e) => setEmailType(e.target.value)}
                                            style={{
                                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                                border: '1px solid var(--border-color-strong)',
                                                borderRadius: 'var(--border-radius-md)',
                                                background: 'var(--color-bg-secondary)',
                                                fontSize: 'var(--font-size-md)',
                                                color: 'var(--color-text-primary)',
                                                cursor: 'pointer',
                                                outline: 'none'
                                            }}
                                        >
                                            <option value="random">Random (Mixed)</option>
                                            <option value="icloud">iCloud Only</option>
                                            <option value="gmail">Gmail Only</option>
                                        </select>
                                        <span style={{
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--color-text-tertiary)'
                                        }}>
                                            Applied to newly generated accounts
                                        </span>
                                    </div>

                                    {/* Password Prefix */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                        <label style={{
                                            fontSize: 'var(--font-size-sm)',
                                            fontWeight: 'var(--font-weight-medium)',
                                            color: 'var(--color-text-secondary)'
                                        }}>Password Prefix (6 chars)</label>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            placeholder="e.g., MyPass"
                                            value={passwordPrefix}
                                            onChange={(e) => setPasswordPrefix(e.target.value.slice(0, 6))}
                                            style={{
                                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                                border: '1px solid var(--border-color-strong)',
                                                borderRadius: 'var(--border-radius-md)',
                                                background: 'var(--color-bg-secondary)',
                                                fontSize: 'var(--font-size-md)',
                                                color: 'var(--color-text-primary)',
                                                outline: 'none',
                                                fontFamily: 'monospace'
                                            }}
                                        />
                                        <span style={{
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--color-text-tertiary)'
                                        }}>
                                            {passwordPrefix ? (
                                                passwordPrefix.length === 6 ? (
                                                    <>Preview: {passwordPrefix}••••••</>
                                                ) : (
                                                    <span style={{ color: 'var(--color-accent-orange)' }}>Must be exactly 6 characters</span>
                                                )
                                            ) : (
                                                'Optional: First 6 chars of password'
                                            )}
                                        </span>
                                    </div>

                                    {/* Print Sheet Size */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                        <label style={{
                                            fontSize: 'var(--font-size-sm)',
                                            fontWeight: 'var(--font-weight-medium)',
                                            color: 'var(--color-text-secondary)'
                                        }}>Print Sheet Size (cm)</label>
                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                                            <input
                                                type="number"
                                                placeholder="60"
                                                value={boardWidth}
                                                onChange={(e) => setBoardWidth(e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                                    border: '1px solid var(--border-color-strong)',
                                                    borderRadius: 'var(--border-radius-md)',
                                                    background: 'var(--color-bg-secondary)',
                                                    fontSize: 'var(--font-size-md)',
                                                    color: 'var(--color-text-primary)',
                                                    outline: 'none'
                                                }}
                                            />
                                            <span style={{ color: 'var(--color-text-tertiary)' }}>×</span>
                                            <input
                                                type="number"
                                                placeholder="90"
                                                value={boardHeight}
                                                onChange={(e) => setBoardHeight(e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                                    border: '1px solid var(--border-color-strong)',
                                                    borderRadius: 'var(--border-radius-md)',
                                                    background: 'var(--color-bg-secondary)',
                                                    fontSize: 'var(--font-size-md)',
                                                    color: 'var(--color-text-primary)',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>
                                        <span style={{
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--color-text-tertiary)'
                                        }}>
                                            Leave empty for default 60cm × 90cm (~100 cards/page)
                                        </span>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>

                        {/* Export controls */}
                        <ExportControls
                            accountsCount={accounts.length}
                            onExportZip={handleExportZip}
                            onExportPrintSheet={handleExportPrintSheet}
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
