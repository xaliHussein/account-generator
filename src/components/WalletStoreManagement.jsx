import React, { useState, useEffect } from 'react';
import {
    getWalletStores, createWalletStore, updateWalletStore, deleteWalletStore,
    generateWalletCards, getWalletStoreCards, getWalletBatchCards
} from '../services/walletApi';
import {
    downloadWalletPrintSheetPDF,
    downloadWalletCardPDF,
    downloadWalletCardBackPrintSheetPDF
} from '../services/walletPdfGenerator';
import {
    downloadWalletCardsZip,
    downloadWalletCardsImagesZip,
    downloadWalletCardBacksImagesZip
} from '../services/walletZipExporter';
import WalletCard from './WalletCard';
import WalletCardBack from './WalletCardBack';
import Card from './ui/Card';
import Pagination from './ui/Pagination';
import {
    Store, Plus, Edit2, Trash2, CreditCard, X, AlertCircle,
    Download, Printer, Eye, List, ArrowUp, ArrowDown, FileArchive, Upload, Settings, Check, Search
} from 'lucide-react';

/**
 * Wallet Store Management Component
 * Create, edit, delete wallet stores and generate wallet cards
 */
const WalletStoreManagement = () => {
    const [stores, setStores] = useState([]);
    const [storePage, setStorePage] = useState(1);
    const [totalStorePages, setTotalStorePages] = useState(1);
    const [totalStores, setTotalStores] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const searchRef = React.useRef(true); // Track first render
    const STORES_PER_PAGE = 15;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Sort order with localStorage
    const [sortOrder, setSortOrder] = useState(() => {
        const saved = localStorage.getItem('walletStoresSortOrder');
        return saved || 'desc';
    });

    // Form states
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showGenerateForm, setShowGenerateForm] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [editingStore, setEditingStore] = useState(null);

    const [selectedStore, setSelectedStore] = useState(null);
    const [currentViewStoreId, setCurrentViewStoreId] = useState(null);

    // Generated cards state
    const [generatedCards, setGeneratedCards] = useState([]);
    const [cardsByBatch, setCardsByBatch] = useState({});
    const [selectedBatchId, setSelectedBatchId] = useState(null);
    const [selectedPreviewCard, setSelectedPreviewCard] = useState(null);
    const [batchSearchQuery, setBatchSearchQuery] = useState('');
    const [batchAccountsPage, setBatchAccountsPage] = useState(1);

    const BATCH_ACCOUNTS_PER_PAGE = 20;

    // Server-side pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCards, setTotalCards] = useState(0);
    // Form data
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        contact_email: '',
        contact_phone: '',
    });

    // Generate cards form
    const [generateData, setGenerateData] = useState({
        count: 10,
        email_type: 'icloud',
        email_prefix: '',
    });

    // Print sheet settings
    const [boardWidth, setBoardWidth] = useState('');
    const [boardHeight, setBoardHeight] = useState('');
    const [cardBackCount, setCardBackCount] = useState('');
    const [accountIdType, setAccountIdType] = useState('apple');
    const [customLogo, setCustomLogo] = useState(null);
    const [cardBackLogo, setCardBackLogo] = useState(null);

    const [actionLoading, setActionLoading] = useState(false);
    const [exportProgress, setExportProgress] = useState(null);

    // Helper function to format large numbers
    const formatNumber = (num) => {
        if (num === null || num === undefined) return '0';
        num = Number(num);
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toString();
    };

    useEffect(() => {
        loadStores(storePage);
    }, [storePage, sortOrder]);

    // Debounce search
    useEffect(() => {
        if (searchRef.current) {
            searchRef.current = false;
            return;
        }
        const timer = setTimeout(() => {
            if (storePage !== 1) {
                setStorePage(1);
            } else {
                loadStores(1);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const loadStores = async (page = 1) => {
        setLoading(true);
        try {
            const data = await getWalletStores(page, STORES_PER_PAGE, searchQuery, sortOrder);

            let loadedStores = [];
            // Handle Laravel pagination
            if (data.data && Array.isArray(data.data)) {
                loadedStores = data.data;
                setTotalStores(data.total || 0);
                setTotalStorePages(data.last_page || 1);
            } else if (Array.isArray(data)) {
                loadedStores = data;
                setTotalStores(data.length);
                setTotalStorePages(1);
            } else if (data && data.data) {
                // Fallback if data.data is the array (standard Laravel resource collection sometimes)
                loadedStores = data.data;
                setTotalStores(data.total || data.data.length);
                setTotalStorePages(data.last_page || 1);
            }

            setStores(loadedStores);
            // setStorePage(page) is handled by the state change that triggered this or by calling with specific page
        } catch (err) {
            console.error('Failed to load wallet stores:', err);
            setError('Failed to load wallet stores');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateStore = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await createWalletStore(formData);
            setShowCreateForm(false);
            setFormData({ name: '', location: '', contact_email: '', contact_phone: '' });
            await loadStores(1); // Go to first page
        } catch (err) {
            console.error('Failed to create wallet store:', err);
            setError(err.response?.data?.message || 'Failed to create wallet store');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateStore = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await updateWalletStore(editingStore.id, formData);
            setEditingStore(null);
            setFormData({ name: '', location: '', contact_email: '', contact_phone: '' });
            await loadStores(storePage); // Reload current page
        } catch (err) {
            console.error('Failed to update wallet store:', err);
            setError(err.response?.data?.message || 'Failed to update wallet store');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteStore = async (storeId) => {
        if (!confirm('Are you sure you want to delete this wallet store? All associated cards will also be deleted.')) {
            return;
        }
        setActionLoading(true);
        try {
            await deleteWalletStore(storeId);
            await loadStores(storePage); // Reload current page
        } catch (err) {
            console.error('Failed to delete wallet store:', err);
            setError(err.response?.data?.message || 'Failed to delete wallet store');
        } finally {
            setActionLoading(false);
        }
    };

    const handleGenerateCards = async (e) => {
        e.preventDefault();
        if (!selectedStore) return;

        setActionLoading(true);
        try {
            const response = await generateWalletCards(
                selectedStore.id,
                generateData.count,
                generateData.email_type,
                generateData.email_prefix || null,
                accountIdType
            );

            // Transform cards for display and export
            const cards = (response.cards || []).map(card => ({
                ...card,
                batchId: response.batch_id,
                createdAt: new Date().toISOString(),
            }));

            setGeneratedCards(cards);

            if (cards.length > 0) {
                setSelectedPreviewCard(cards[0]);
            }

            // Group by batch
            const grouped = {
                [response.batch_id]: {
                    cards: cards,
                    createdAt: new Date().toISOString(),
                }
            };
            setCardsByBatch(grouped);

            setShowGenerateForm(false);
            setShowExportModal(true);
            await loadStores(storePage);
        } catch (err) {
            console.error('Failed to generate wallet cards:', err);
            setError(err.response?.data?.message || 'Failed to generate wallet cards');
        } finally {
            setActionLoading(false);
        }
    };

    const fetchStoreCards = async (storeId, page = 1) => {
        setActionLoading(true);
        try {
            // Request 20 cards per page (matching the UI slice)
            const data = await getWalletStoreCards(storeId, page, 20);

            let cards = [];
            let total = 0;
            let lastPage = 1;

            // Handle Laravel pagination or legacy structure
            if (data.cards && data.cards.data) {
                // New Paginated Structure: cards is a pagination object
                cards = data.cards.data;
                total = data.cards.total || data.total_cards || 0;
                lastPage = data.cards.last_page || 1;
            } else if (data.data && Array.isArray(data.data)) {
                cards = data.data;
                total = data.total || 0;
                lastPage = data.last_page || 1;
            } else if (data.cards && Array.isArray(data.cards)) {
                cards = data.cards;
                total = cards.length;
                lastPage = 1;
            } else if (Array.isArray(data)) {
                cards = data;
                total = cards.length;
                lastPage = 1;
            }

            if (cards.length > 0) {
                // Transform cards for display
                const transformedCards = cards.map(card => ({
                    ...card,
                    batchId: card.batch_id,
                    createdAt: card.created_at,
                }));

                setGeneratedCards(transformedCards);
                if (page === 1) {
                    setSelectedPreviewCard(transformedCards[0]);
                }

                // Group cards by batchId (only for current page)
                const grouped = transformedCards.reduce((acc, card) => {
                    const batchKey = card.batchId || 'legacy';
                    if (!acc[batchKey]) {
                        acc[batchKey] = {
                            cards: [],
                            createdAt: card.createdAt,
                        };
                    }
                    acc[batchKey].cards.push(card);
                    return acc;
                }, {});

                setCardsByBatch(grouped);

                // Merge with batches summary if available from API (to show all batches, not just current page's)
                if (data.batches && Array.isArray(data.batches)) {
                    const mergedBatches = { ...grouped };
                    data.batches.forEach(batchSummary => {
                        if (!mergedBatches[batchSummary.batch_id]) {
                            mergedBatches[batchSummary.batch_id] = {
                                cards: batchSummary.cards || [], // Might be empty if not loaded
                                createdAt: batchSummary.created_at,
                                count: batchSummary.cards_count, // Use count from summary
                                isPartial: true // Flag to indicate cards need fetching
                            };
                        } else {
                            // Update existing (current page) batch with correct total count
                            mergedBatches[batchSummary.batch_id].count = batchSummary.cards_count;
                        }
                    });
                    setCardsByBatch(mergedBatches);
                }

                setShowExportModal(true);
            } else {
                if (page === 1) {
                    setError('No cards found for this store. Generate some cards first.');
                    setGeneratedCards([]);
                    setCardsByBatch({});
                } else {
                    // Empty page handling
                    setGeneratedCards([]);
                }
            }

            setTotalCards(total);
            setTotalPages(lastPage);
            setCurrentPage(page);

        } catch (err) {
            console.error('Failed to load cards:', err);
            setError('Failed to load cards');
        } finally {
            setActionLoading(false);
        }
    };



    const handlePageChange = (page) => {
        if (selectedStore) {
            fetchStoreCards(selectedStore.id, page);
        }
    };

    // Export functions - using wallet-specific ZIP exporter for consistent card format
    const handleExportZip = async () => {
        if (generatedCards.length === 0) return;
        setActionLoading(true);
        setExportProgress({ current: 0, total: generatedCards.length, percentage: 0, status: 'creating-zip' });
        try {
            await downloadWalletCardsZip(generatedCards, (progress) => {
                setExportProgress(progress);
            }, accountIdType);
        } catch (err) {
            console.error('ZIP export failed:', err);
            setError('Failed to export ZIP');
        } finally {
            setActionLoading(false);
            setExportProgress(null);
        }
    };

    // Export ZIP with Images ONLY
    const handleExportZipImages = async () => {
        if (generatedCards.length === 0) return;
        setActionLoading(true);
        setExportProgress({ current: 0, total: generatedCards.length, percentage: 0, status: 'creating-zip-images' });
        try {
            await downloadWalletCardsImagesZip(generatedCards, (progress) => {
                setExportProgress(progress);
            }, accountIdType);
        } catch (err) {
            console.error('ZIP images export failed:', err);
            setError('Failed to export ZIP images');
        } finally {
            setActionLoading(false);
            setExportProgress(null);
        }
    };

    const handleExportPrintSheet = async () => {
        if (generatedCards.length === 0) return;
        setActionLoading(true);
        setExportProgress({ current: 0, total: generatedCards.length, percentage: 0, status: 'creating-sheet' });
        try {
            const widthMm = boardWidth ? parseFloat(boardWidth) * 10 : 900;
            const heightMm = boardHeight ? parseFloat(boardHeight) * 10 : 600;
            await downloadWalletPrintSheetPDF(generatedCards, setExportProgress, null, widthMm, heightMm, accountIdType);
        } catch (err) {
            console.error('Print sheet export failed:', err);
            setError('Failed to export print sheet');
        } finally {
            setActionLoading(false);
            setExportProgress(null);
        }
    };

    const handleExportCardBackPrintSheet = async () => {
        // Use selected count or all cards
        const cardsToExport = cardBackCount ? generatedCards.slice(0, parseInt(cardBackCount, 10)) : generatedCards;
        if (cardsToExport.length === 0) return;
        setActionLoading(true);
        setExportProgress({ current: 0, total: cardsToExport.length, percentage: 0, status: 'creating-cardback-sheet' });
        try {
            const widthMm = boardWidth ? parseFloat(boardWidth) * 10 : 600;
            const heightMm = boardHeight ? parseFloat(boardHeight) * 10 : 900;
            await downloadWalletCardBackPrintSheetPDF(cardsToExport, setExportProgress, widthMm, heightMm);
        } catch (err) {
            console.error('Card back print sheet export failed:', err);
            setError('Failed to export card back print sheet');
        } finally {
            setActionLoading(false);
            setExportProgress(null);
        }
    };

    // Export Card Backs as ZIP (Images)
    const handleExportCardBacksImages = async () => {
        const count = cardBackCount ? parseInt(cardBackCount, 10) : generatedCards.length;
        if (count <= 0) return;

        setActionLoading(true);
        setExportProgress({ current: 0, total: count, percentage: 0, status: 'creating-cardback-zip' });
        try {
            await downloadWalletCardBacksImagesZip(count, (progress) => {
                setExportProgress(progress);
            }, accountIdType);
        } catch (err) {
            console.error('Card back images export failed:', err);
            setError('Failed to export card back images');
        } finally {
            setActionLoading(false);
            setExportProgress(null);
        }
    };

    // Batch-specific exports

    // Batch Output as ZIP (Images)
    const handleExportBatchZipImages = async (batchId) => {
        let batch = cardsByBatch[batchId];
        if (!batch) return;

        setActionLoading(true);
        try {
            // Check if we need to fetch the full batch
            let cardsToExport = batch.cards;
            // If fetching required logic (similar to other batch exports) - simplifying here assuming generic fetch or reusing logic
            // But strict implementation requires checking partial status like others:
            if (batch.isPartial || cardsToExport.length < (batch.count || 0)) {
                const response = await getWalletBatchCards(selectedStore.id, batchId);
                if (response.cards) {
                    cardsToExport = response.cards;
                    setCardsByBatch(prev => ({
                        ...prev,
                        [batchId]: { ...prev[batchId], cards: response.cards, isPartial: false }
                    }));
                }
            }

            if (cardsToExport.length === 0) {
                setActionLoading(false);
                return;
            }

            setExportProgress({ current: 0, total: cardsToExport.length, percentage: 0, status: 'creating-zip-images' });
            await downloadWalletCardsImagesZip(cardsToExport, (progress) => {
                setExportProgress(progress);
            }, accountIdType);
        } catch (err) {
            console.error('Batch ZIP images export failed:', err);
            setError('Failed to export batch ZIP images');
        } finally {
            setActionLoading(false);
            setExportProgress(null);
        }
    };

    const handleExportBatchPrintSheet = async (batchId) => {
        let batch = cardsByBatch[batchId];
        if (!batch) return;

        setActionLoading(true);
        try {
            // Check if we need to fetch the full batch
            let cardsToExport = batch.cards;
            if (batch.isPartial || cardsToExport.length < (batch.count || 0)) {
                // Fetch full batch
                const response = await getWalletBatchCards(selectedStore.id, batchId);
                if (response.cards) {
                    cardsToExport = response.cards;
                    // Update local state to cache it? Optional, but good for UX
                    setCardsByBatch(prev => ({
                        ...prev,
                        [batchId]: { ...prev[batchId], cards: response.cards, isPartial: false }
                    }));
                }
            }

            if (cardsToExport.length === 0) {
                setActionLoading(false);
                return;
            }

            setExportProgress({ current: 0, total: cardsToExport.length, percentage: 0, status: 'creating-sheet' });

            const widthMm = boardWidth ? parseFloat(boardWidth) * 10 : 900;
            const heightMm = boardHeight ? parseFloat(boardHeight) * 10 : 600;
            await downloadWalletPrintSheetPDF(cardsToExport, setExportProgress, null, widthMm, heightMm, accountIdType);
        } catch (err) {
            console.error('Batch print sheet export failed:', err);
            setError('Failed to export batch print sheet');
        } finally {
            setActionLoading(false);
            setExportProgress(null);
        }
    };

    const handleExportBatchCardBackPrintSheet = async (batchId) => {
        let batch = cardsByBatch[batchId];
        if (!batch) return;

        setActionLoading(true);
        try {
            // Check if we need to fetch the full batch
            let cardsToExport = batch.cards;
            if (batch.isPartial || cardsToExport.length < (batch.count || 0)) {
                const response = await getWalletBatchCards(selectedStore.id, batchId);
                if (response.cards) {
                    cardsToExport = response.cards;
                    // Update local state
                    setCardsByBatch(prev => ({
                        ...prev,
                        [batchId]: { ...prev[batchId], cards: response.cards, isPartial: false }
                    }));
                }
            }

            if (cardsToExport.length === 0) {
                setActionLoading(false);
                return;
            }

            setExportProgress({ current: 0, total: cardsToExport.length, percentage: 0, status: 'creating-cardback-sheet' });
            const widthMm = boardWidth ? parseFloat(boardWidth) * 10 : 600;
            const heightMm = boardHeight ? parseFloat(boardHeight) * 10 : 900;
            await downloadWalletCardBackPrintSheetPDF(cardsToExport, setExportProgress, widthMm, heightMm);
        } catch (err) {
            console.error('Batch card back print sheet export failed:', err);
            setError('Failed to export batch card back print sheet');
        } finally {
            setActionLoading(false);
            setExportProgress(null);
        }
    };

    // Download single card PDF
    const handleDownloadCardPDF = async (card) => {
        try {
            await downloadWalletCardPDF(card, null, accountIdType);
        } catch (err) {
            console.error('PDF download failed:', err);
            setError('Failed to download PDF');
        }
    };

    // Logo upload handlers
    const handleLogoUpload = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please upload an image file');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setError('Image must be under 5MB');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => setCustomLogo(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleCardBackLogoUpload = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please upload an image file');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setError('Image must be under 5MB');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => setCardBackLogo(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    const viewBatchAccounts = async (batchId, page = 1, search = batchSearchQuery) => {
        setBatchAccountsPage(page);
        setActionLoading(true);
        try {
            const storeId = currentViewStoreId || selectedStore?.id;
            if (!storeId) {
                console.error("Store ID missing for batch fetch");
                setError("Cannot fetch batch: Store ID missing");
                return;
            }

            // Fetch specific page from server
            const data = await getWalletBatchCards(storeId, batchId, page, BATCH_ACCOUNTS_PER_PAGE, search);

            setCardsByBatch(prev => ({
                ...prev,
                [batchId]: {
                    ...prev[batchId],
                    cards: data.cards.data,
                    total: data.cards.total,
                    currentPage: data.cards.current_page,
                    lastPage: data.cards.last_page,
                    isPartial: false
                }
            }));

            setSelectedBatchId(batchId);
        } catch (err) {
            console.error('Failed to load batch cards:', err);
            setError('Failed to load batch accounts');
        } finally {
            setActionLoading(false);
        }
    };

    const openEditForm = (store) => {
        setEditingStore(store);
        setFormData({
            name: store.name,
            location: store.location || '',
            contact_email: store.contact_email || '',
            contact_phone: store.contact_phone || '',
        });
    };

    const openGenerateForm = (store) => {
        setSelectedStore(store);
        setShowGenerateForm(true);
        setGenerateData({ count: 10, email_type: 'icloud', email_prefix: '' });
    };

    const handleViewCards = async (store) => {
        setSelectedStore(store);
        setCurrentViewStoreId(store.id);
        await fetchStoreCards(store.id, 1);
    };



    if (loading) {
        return (
            <div className="loading-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                <div className="spinner"></div>
                <p>Loading wallet stores...</p>
            </div>
        );
    }

    return (
        <div className="store-management wallet-store-management">
            {/* View Batch Accounts Modal */}
            {selectedBatchId && cardsByBatch[selectedBatchId] && (() => {
                // Server-side pagination uses data directly from state
                const currentBatch = cardsByBatch[selectedBatchId];
                const paginatedCards = currentBatch.cards || [];
                const totalBatchPages = currentBatch.lastPage || 1;
                const totalBatchItems = currentBatch.total || 0;

                return (
                    <div className="modal-overlay" style={{ zIndex: 1100 }}>
                        <div className="modal-content" style={{
                            maxWidth: '900px',
                            maxHeight: '85vh',
                            background: 'var(--color-bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--border-radius-lg)',
                            padding: 'var(--spacing-xl)',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                <h3>
                                    <List size={20} style={{ marginRight: 'var(--spacing-sm)', verticalAlign: 'middle' }} />
                                    Batch Accounts
                                </h3>
                                <button
                                    onClick={() => { setSelectedBatchId(null); setBatchSearchQuery(''); setBatchAccountsPage(1); }}
                                    className="btn btn-ghost"
                                    style={{ padding: 'var(--spacing-xs)' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>



                            {/* Search Box - Matching Email Search styling */}
                            <div style={{
                                padding: 'var(--spacing-md)',
                                background: 'var(--color-bg-secondary)',
                                borderRadius: 'var(--border-radius-lg)',
                                border: '1px solid var(--border-color)',
                                marginBottom: 'var(--spacing-md)'
                            }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={18} style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--color-text-tertiary)'
                                    }} />
                                    <input
                                        type="text"
                                        placeholder="Search by email, name, phone, or serial..."
                                        value={batchSearchQuery}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setBatchSearchQuery(val);
                                            // Debounce could be added here, but for now calling directly
                                            viewBatchAccounts(selectedBatchId, 1, val);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--spacing-md) var(--spacing-md)',
                                            paddingLeft: '40px',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--border-radius-md)',
                                            background: 'var(--color-bg-primary)',
                                            fontSize: 'var(--font-size-md)',
                                            fontFamily: 'monospace'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Table */}
                            <div style={{
                                flex: 1,
                                overflow: 'auto',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--border-radius-md)',
                                position: 'relative'
                            }}>
                                {actionLoading && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: 'rgba(var(--color-bg-primary-rgb, 255, 255, 255), 0.7)',
                                        backdropFilter: 'blur(2px)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 10
                                    }}>
                                        <div className="spinner"></div>
                                    </div>
                                )}
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--color-bg-secondary)', position: 'sticky', top: 0 }}>
                                            <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Email</th>
                                            <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Name</th>
                                            <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Phone</th>
                                            <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Serial Number</th>
                                            <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedCards.map((card, index) => (
                                            <tr key={card.id || index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>{card.email}</td>
                                                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>{card.first_name} {card.last_name}</td>
                                                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: card.phone_number ? 'inherit' : 'var(--color-text-secondary)' }}>{card.phone_number || '—'}</td>
                                                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)', fontFamily: 'monospace' }}>{card.serial_number || 'N/A'}</td>
                                                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                                    {card.created_at ? new Date(card.created_at).toLocaleDateString() : 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <Pagination
                                currentPage={batchAccountsPage}
                                totalPages={totalBatchPages}
                                onPageChange={(page) => viewBatchAccounts(selectedBatchId, page)}
                                totalItems={totalBatchItems}
                                itemsPerPage={BATCH_ACCOUNTS_PER_PAGE}
                            />

                            <div style={{ marginTop: 'var(--spacing-md)', textAlign: 'right' }}>
                                <button onClick={() => { setSelectedBatchId(null); setBatchSearchQuery(''); setBatchAccountsPage(1); }} className="btn btn-primary-enhanced">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <div className="section-header">
                <h2>Wallet Cards</h2>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{
                            position: 'absolute',
                            left: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--color-text-tertiary)'
                        }} />
                        <input
                            type="text"
                            placeholder="Search wallet stores..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                padding: '8px 12px 8px 36px',
                                borderRadius: 'var(--border-radius-lg)',
                                border: '1px solid var(--border-color)',
                                background: 'var(--color-bg-primary)',
                                fontSize: 'var(--font-size-sm)',
                                width: '240px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                transition: 'all 0.2s ease'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--color-accent-blue)';
                                e.target.style.boxShadow = '0 0 0 3px rgba(0, 136, 204, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'var(--border-color)';
                                e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                            }}
                        />
                    </div>
                    <button
                        onClick={() => {
                            const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
                            setSortOrder(newOrder);
                            localStorage.setItem('walletStoresSortOrder', newOrder);
                        }}
                        className="btn btn-ghost"
                        title={sortOrder === 'desc' ? 'Showing newest first' : 'Showing oldest first'}
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                    >
                        {sortOrder === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                        {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
                    </button>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="btn btn-accent"
                        disabled={actionLoading}
                    >
                        <Plus size={18} /> Add Store
                    </button>
                </div>
            </div>


            {
                error && (
                    <div className="error-banner">
                        <AlertCircle size={18} />
                        {error}
                        <button onClick={() => setError(null)}><X size={16} /></button>
                    </div>
                )
            }

            {/* Create Store Modal */}
            {
                showCreateForm && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h3>Create Wallet Store</h3>
                                <button onClick={() => setShowCreateForm(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleCreateStore}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label>Store Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            placeholder="Enter store name"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Location</label>
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            placeholder="City, Country"
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-ghost">
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary-enhanced" disabled={actionLoading}>
                                        {actionLoading ? 'Creating...' : 'Create Store'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Edit Store Modal */}
            {
                editingStore && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h3>Edit Wallet Store</h3>
                                <button onClick={() => setEditingStore(null)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleUpdateStore}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label>Store Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Location</label>
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" onClick={() => setEditingStore(null)} className="btn btn-ghost">
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary-enhanced" disabled={actionLoading}>
                                        {actionLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Generate Cards Modal */}
            {
                showGenerateForm && selectedStore && (
                    <div className="modal-overlay">
                        <div className="modal" style={{ maxWidth: '500px' }}>
                            <div className="modal-header">
                                <h3>Generate Wallet Cards for {selectedStore.name}</h3>
                                <button onClick={() => setShowGenerateForm(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleGenerateCards}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label>Number of Cards *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="5000"
                                            value={generateData.count}
                                            onChange={(e) => setGenerateData({ ...generateData, count: parseInt(e.target.value) })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Email Type</label>
                                        <select
                                            value={generateData.email_type}
                                            onChange={(e) => setGenerateData({ ...generateData, email_type: e.target.value })}
                                        >
                                            <option value="icloud">iCloud Only</option>
                                            <option value="gmail">Gmail Only</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Email Prefix (up to 8 characters)</label>
                                        <input
                                            type="text"
                                            maxLength={8}
                                            placeholder="e.g., wallet01"
                                            value={generateData.email_prefix}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                                                setGenerateData({ ...generateData, email_prefix: value });
                                            }}
                                            style={{ fontFamily: 'monospace' }}
                                        />
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: '4px', display: 'block' }}>
                                            {generateData.email_prefix ? (
                                                <>Preview: <code style={{ background: 'var(--color-bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>{generateData.email_prefix.padEnd(8, '•')}{'########'}@{generateData.email_type === 'gmail' ? 'gmail.com' : 'icloud.com'}</code></>
                                            ) : (
                                                'Optional: Enter up to 8 alphanumeric characters'
                                            )}
                                        </span>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" onClick={() => setShowGenerateForm(false)} className="btn btn-ghost">
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary-enhanced" disabled={actionLoading}>
                                        {actionLoading ? 'Generating...' : 'Generate Cards'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Export Modal - Full Featured */}
            {
                showExportModal && generatedCards.length > 0 && (
                    <div className="modal-overlay">
                        <div className="modal" style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
                            <div className="modal-header">
                                <h3>
                                    <Check size={20} style={{ color: 'var(--color-accent-green)' }} />
                                    {generatedCards.length} Cards Generated Successfully!
                                </h3>
                                <button onClick={() => setShowExportModal(false)}><X size={20} /></button>
                            </div>

                            <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                                {/* Export Progress */}
                                {exportProgress && (
                                    <div style={{
                                        padding: 'var(--spacing-md)',
                                        background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.1) 0%, rgba(88, 86, 214, 0.1) 100%)',
                                        borderRadius: 'var(--border-radius-md)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                                            <span>{exportProgress.status === 'creating-zip' ? 'Creating ZIP...' : exportProgress.status === 'creating-sheet' ? 'Creating Print Sheet...' : 'Creating Card Backs...'}</span>
                                            <span>{exportProgress.percentage}%</span>
                                        </div>
                                        <div style={{ height: '4px', background: 'var(--color-bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${exportProgress.percentage}%`, background: 'var(--gradient-primary)', transition: 'width 0.3s' }}></div>
                                        </div>
                                    </div>
                                )}

                                {/* Export Actions with Colors */}
                                <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={handleExportZip}
                                        className="btn btn-success-enhanced"
                                        disabled={actionLoading}
                                        style={{ flex: 1, minWidth: '200px' }}
                                    >
                                        <FileArchive size={18} />
                                        {exportProgress?.status === 'creating-zip' ? `${exportProgress.percentage}%...` : `Download All as ZIP (${generatedCards.length} PDFs)`}
                                    </button>
                                    <button
                                        onClick={handleExportZipImages}
                                        className="btn btn-info-enhanced"
                                        disabled={actionLoading}
                                        style={{ flex: 1, minWidth: '200px' }}
                                    >
                                        <FileArchive size={18} />
                                        {exportProgress?.status === 'creating-zip-images' ? `${exportProgress.percentage}%...` : `ZIP (Images Only)`}
                                    </button>
                                    <button
                                        onClick={handleExportPrintSheet}
                                        className="btn btn-secondary-enhanced"
                                        disabled={actionLoading}
                                        style={{ flex: 1, minWidth: '200px' }}
                                    >
                                        <Printer size={18} />
                                        {exportProgress?.status === 'creating-sheet' ? `${exportProgress.percentage}%...` : 'Download Print Sheet PDF'}
                                    </button>
                                    <button
                                        onClick={handleExportCardBackPrintSheet}
                                        className="btn btn-purple-enhanced"
                                        disabled={actionLoading}
                                        style={{ flex: 1, minWidth: '200px' }}
                                    >
                                        <Printer size={18} />
                                        {exportProgress?.status === 'creating-cardback-sheet' ? `${exportProgress.percentage}%...` : 'Download Card Backs Print Sheet'}
                                    </button>
                                    <button
                                        onClick={handleExportCardBacksImages}
                                        className="btn btn-purple-enhanced"
                                        disabled={actionLoading}
                                        style={{ flex: 1, minWidth: '200px' }}
                                    >
                                        <FileArchive size={18} />
                                        {exportProgress?.status === 'creating-cardback-zip' ? `${exportProgress.percentage}%...` : 'ZIP Card Backs (Images)'}
                                    </button>
                                </div>

                                {/* Print Sheet Settings */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: 'var(--spacing-md)',
                                    padding: 'var(--spacing-md)',
                                    background: 'var(--color-bg-secondary)',
                                    borderRadius: 'var(--border-radius-lg)',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                        <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>
                                            Card Backs Count
                                        </label>
                                        <input
                                            type="number"
                                            placeholder={String(generatedCards.length)}
                                            value={cardBackCount}
                                            onChange={(e) => setCardBackCount(e.target.value)}
                                            min="1"
                                            max="5000"
                                            style={{
                                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--border-radius-md)',
                                                background: 'var(--color-bg-primary)',
                                                fontSize: 'var(--font-size-md)'
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                        <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>
                                            Print Sheet Width (cm)
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="60"
                                            value={boardWidth}
                                            onChange={(e) => setBoardWidth(e.target.value)}
                                            style={{
                                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--border-radius-md)',
                                                background: 'var(--color-bg-primary)',
                                                fontSize: 'var(--font-size-md)'
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                        <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>
                                            Print Sheet Height (cm)
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="90"
                                            value={boardHeight}
                                            onChange={(e) => setBoardHeight(e.target.value)}
                                            style={{
                                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--border-radius-md)',
                                                background: 'var(--color-bg-primary)',
                                                fontSize: 'var(--font-size-md)'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Card Preview & Settings */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                                    {/* Card Preview */}
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
                                                    color: 'var(--color-text-secondary)'
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
                                                        onClick={() => setCustomLogo(null)}
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
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </Card.Header>
                                        <Card.Body style={{ padding: 'var(--spacing-md)', display: 'flex', justifyContent: 'center' }}>
                                            {selectedPreviewCard && (
                                                <div style={{ transform: 'scale(0.85)', transformOrigin: 'center' }}>
                                                    <WalletCard card={selectedPreviewCard} walletType={accountIdType} />
                                                </div>
                                            )}
                                        </Card.Body>
                                    </Card>

                                    {/* Card Back Preview */}
                                    <Card hover={false}>
                                        <Card.Header>
                                            <Eye size={18} style={{ color: 'var(--color-accent-purple)' }} />
                                            <span>Card Back Preview</span>
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
                                                    color: 'var(--color-text-secondary)'
                                                }}>
                                                    <Upload size={14} />
                                                    {cardBackLogo ? 'Change' : 'Upload'}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleCardBackLogoUpload}
                                                        style={{ display: 'none' }}
                                                    />
                                                </label>
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
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </Card.Header>
                                        <Card.Body style={{ padding: 'var(--spacing-md)', display: 'flex', justifyContent: 'center' }}>
                                            {selectedPreviewCard && (
                                                <div style={{ transform: 'scale(0.85)', transformOrigin: 'center' }}>
                                                    <WalletCardBack card={selectedPreviewCard} />
                                                </div>
                                            )}
                                        </Card.Body>
                                    </Card>
                                </div>

                                {/* Card Settings */}
                                <Card hover={false}>
                                    <Card.Header>
                                        <Settings size={18} style={{ color: 'var(--color-accent-purple)' }} />
                                        <span>Card Settings</span>
                                    </Card.Header>
                                    <Card.Body>
                                        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)', display: 'block' }}>
                                                    نوع المحفظة / Wallet Type
                                                </label>
                                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                                    <button
                                                        onClick={() => setAccountIdType('apple')}
                                                        style={{
                                                            flex: 1,
                                                            padding: 'var(--spacing-sm) var(--spacing-md)',
                                                            border: accountIdType === 'apple' ? '2px solid var(--color-accent-blue)' : '2px solid var(--border-color)',
                                                            borderRadius: 'var(--border-radius-md)',
                                                            background: accountIdType === 'apple' ? 'rgba(0, 122, 255, 0.15)' : 'var(--color-bg-secondary)',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            gap: 'var(--spacing-xs)'
                                                        }}
                                                    >
                                                        <span style={{ fontWeight: accountIdType === 'apple' ? 600 : 400 }}>Apple Wallet</span>
                                                        <span dir="rtl" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'Arial, sans-serif' }}>محفظة أبل</span>
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
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            gap: 'var(--spacing-xs)'
                                                        }}
                                                    >
                                                        <span style={{ fontWeight: accountIdType === 'google' ? 600 : 400 }}>Google Wallet</span>
                                                        <span dir="rtl" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'Arial, sans-serif' }}>محفظة جوجل</span>
                                                    </button>
                                                </div>
                                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--spacing-xs)', display: 'block' }}>
                                                    يغير النص على الكارت / Changes the card text
                                                </span>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>

                                {/* Generated Cards List - Matching Store Management */}
                                <Card hover={false}>
                                    <Card.Header>
                                        <CreditCard size={18} style={{ color: 'var(--color-accent-blue)' }} />
                                        <span>Generated Cards ({generatedCards.length})</span>
                                    </Card.Header>
                                    <Card.Body>
                                        <div style={{ maxHeight: '400px', overflow: 'auto', marginBottom: 'var(--spacing-md)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                                {generatedCards.map((card, index) => (
                                                    <div
                                                        key={card.id || index}
                                                        onClick={() => setSelectedPreviewCard(card)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 'var(--spacing-md)',
                                                            padding: 'var(--spacing-sm) var(--spacing-md)',
                                                            background: selectedPreviewCard?.id === card.id ? 'var(--color-bg-tertiary)' : 'transparent',
                                                            borderRadius: 'var(--border-radius-md)',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <span style={{ color: 'var(--color-text-tertiary)', width: '30px' }}>#{((currentPage - 1) * 20) + index + 1}</span>
                                                        <span style={{ fontWeight: 'var(--font-weight-medium)', flex: 1 }}>{card.email}</span>
                                                        <span style={{ color: 'var(--color-text-secondary)' }}>{card.serial_number}</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownloadCardPDF(card);
                                                            }}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                padding: 'var(--spacing-xs)',
                                                                background: 'var(--color-bg-secondary)',
                                                                border: '1px solid var(--border-color)',
                                                                borderRadius: 'var(--border-radius-sm)',
                                                                cursor: 'pointer',
                                                                color: 'var(--color-accent-blue)',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                            title="Download PDF"
                                                        >
                                                            <Download size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {generatedCards.length === 0 && (
                                                    <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                                                        No cards found on this page
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Server-side Pagination */}
                                        {totalPages > 1 && (
                                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-md)' }}>
                                                <Pagination
                                                    currentPage={currentPage}
                                                    totalPages={totalPages}
                                                    onPageChange={handlePageChange}
                                                    totalItems={totalCards}
                                                    itemsPerPage={20}
                                                />
                                            </div>
                                        )}
                                    </Card.Body>
                                </Card>

                                {/* Batch List - Matching Store Management */}
                                {Object.keys(cardsByBatch).length > 0 && (
                                    <Card hover={false}>
                                        <Card.Header>
                                            <FileArchive size={18} style={{ color: 'var(--color-accent-purple)' }} />
                                            <span>Card Batches ({Object.keys(cardsByBatch).length})</span>
                                        </Card.Header>
                                        <Card.Body style={{ maxHeight: '250px', overflow: 'auto' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                                {Object.entries(cardsByBatch).map(([batchId, batch], index) => (
                                                    <div
                                                        key={batchId}
                                                        style={{
                                                            padding: 'var(--spacing-md)',
                                                            background: 'var(--color-bg-tertiary)',
                                                            borderRadius: 'var(--border-radius-md)',
                                                            border: '1px solid var(--border-color)',
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                                                            <div>
                                                                <span style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-md)' }}>
                                                                    {batchId === 'legacy' ? 'Legacy Cards' : `Batch ${Object.keys(cardsByBatch).length - index}`}
                                                                </span>
                                                                <span style={{ marginLeft: 'var(--spacing-sm)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                                                    ({batch.count || batch.cards.length} cards)
                                                                </span>
                                                            </div>
                                                            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                                                                {batch.createdAt ? new Date(batch.createdAt).toLocaleString() : 'Unknown date'}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                                                            <button
                                                                onClick={() => handleExportBatchZipImages(batchId)}
                                                                className="btn btn-info-enhanced"
                                                                disabled={actionLoading}
                                                                style={{ flex: 1, fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)', minWidth: '120px' }}
                                                            >
                                                                <FileArchive size={14} />
                                                                Images ZIP
                                                            </button>
                                                            <button
                                                                onClick={() => handleExportBatchPrintSheet(batchId)}
                                                                className="btn btn-secondary-enhanced"
                                                                disabled={actionLoading}
                                                                style={{ flex: 1, fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)', minWidth: '120px' }}
                                                            >
                                                                <Printer size={14} />
                                                                Print Sheet
                                                            </button>
                                                            <button
                                                                onClick={() => handleExportBatchCardBackPrintSheet(batchId)}
                                                                className="btn btn-purple-enhanced"
                                                                disabled={actionLoading}
                                                                style={{ flex: 1, fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)', minWidth: '120px' }}
                                                            >
                                                                <Printer size={14} />
                                                                Card Backs
                                                            </button>
                                                            <button
                                                                onClick={() => viewBatchAccounts(batchId)}
                                                                className="btn btn-primary-enhanced"
                                                                style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)', minWidth: '120px' }}
                                                                disabled={actionLoading}
                                                            >
                                                                <List size={14} />
                                                                View Accounts
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card.Body>
                                    </Card>
                                )}

                                <div className="modal-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-lg)' }}>
                                    <button onClick={() => setShowExportModal(false)} className="btn btn-primary-enhanced">
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Store Cards Grid */}
            {
                stores.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon wallet-empty-icon">
                            <CreditCard size={48} />
                        </div>
                        <h3>No Wallet Stores Yet</h3>
                        <p>Create your first wallet store to start generating Apple Wallet style cards.</p>
                        <button onClick={() => setShowCreateForm(true)} className="btn btn-primary-enhanced">
                            <Plus size={18} /> Create First Store
                        </button>
                    </div>
                ) : (
                    <div className="stores-grid">
                        {stores.map((store) => (
                            <div key={store.id} className="store-card wallet-store-card">
                                <div className="store-card-header">
                                    <div className="store-icon wallet-store-icon">
                                        <CreditCard size={24} />
                                    </div>
                                    <div className="store-actions">
                                        <button onClick={() => openEditForm(store)} title="Edit">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteStore(store.id)} title="Delete" className="danger">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="store-card-body">
                                    <h3>{store.name}</h3>
                                    {store.location && <p className="store-location">{store.location}</p>}
                                </div>
                                <div className="store-card-stats">
                                    <div className="stat">
                                        <span className="stat-value">{formatNumber(store.cards_count || 0)}</span>
                                        <span className="stat-label">Total</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-value active">{formatNumber(store.unlocked_cards_count || 0)}</span>
                                        <span className="stat-label">Unlocked</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-value inactive">{formatNumber(store.locked_cards_count || 0)}</span>
                                        <span className="stat-label">Locked</span>
                                    </div>
                                </div>
                                <div className="store-card-footer" style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                    <button onClick={() => handleViewCards(store)} className="btn btn-secondary-enhanced" style={{ flex: 1 }} disabled={actionLoading || (store.cards_count || 0) === 0}>
                                        <List size={16} /> View Cards
                                    </button>
                                    <button onClick={() => openGenerateForm(store)} className="btn btn-primary-enhanced" style={{ flex: 1 }}>
                                        <CreditCard size={16} /> Generate
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            {/* Store List Pagination */}
            {
                stores.length > 0 && (
                    <div style={{ marginTop: 'var(--spacing-xl)', textAlign: 'center' }}>
                        <Pagination
                            currentPage={storePage}
                            totalPages={totalStorePages}
                            onPageChange={setStorePage}
                            totalItems={totalStores}
                            itemsPerPage={STORES_PER_PAGE}
                        />
                    </div>
                )
            }
        </div >
    );
};

export default WalletStoreManagement;
