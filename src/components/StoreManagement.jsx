import React, { useState, useEffect } from 'react';
import { getStores, createStore, updateStore, deleteStore, generateCards, getStoreCardsForExport, getStoreBatchCards, deleteBatch, getActivatedCards, deactivateCard, lockStoreCards, unlockStoreCards } from '../services/api';
import { downloadAccountsZip } from '../services/zipExporter';
import { downloadPrintSheetPDF, downloadAccountPDF, downloadCardBackPrintSheetImage, downloadPrintSheetImage } from '../services/pdfGenerator';
import { downloadAccountCardsImagesZip, downloadCardBacksImagesZip } from '../services/storeImageExporter';
import AccountCard from './AccountCard';
import CardBack from './CardBack';
import Card from './ui/Card';
import Pagination from './ui/Pagination';
import {
    Store, Plus, Edit2, Trash2, CreditCard, X, AlertCircle,
    Download, FileArchive, Printer, Upload, Eye, Settings, Check, List,
    ArrowUpDown, ArrowUp, ArrowDown, Search, Phone, XCircle, Copy, CheckCircle, Lock, Unlock
} from 'lucide-react';

/**
 * Store Management Component
 * Create, edit, delete stores and generate cards with export functionality
 */
const StoreManagement = () => {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Sort order state with localStorage persistence
    const [sortOrder, setSortOrder] = useState(() => {
        const saved = localStorage.getItem('storesSortOrder');
        return saved || 'desc'; // default: newest first
    });

    // Form states
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showGenerateForm, setShowGenerateForm] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [editingStore, setEditingStore] = useState(null);
    const [selectedStore, setSelectedStore] = useState(null);

    // Generated cards state
    const [generatedCards, setGeneratedCards] = useState([]);
    const [cardsByBatch, setCardsByBatch] = useState({}); // Cards grouped by batch ID
    const [selectedBatchId, setSelectedBatchId] = useState(null); // Currently selected batch for export
    const [selectedPreviewCard, setSelectedPreviewCard] = useState(null);
    const [confirmDeleteBatch, setConfirmDeleteBatch] = useState(null); // Batch ID to confirm deletion
    const [batchSearchQuery, setBatchSearchQuery] = useState('');
    const [batchAccountsPage, setBatchAccountsPage] = useState(1);

    // Activated cards modal state
    const [showActivatedModal, setShowActivatedModal] = useState(false);
    const [activatedCards, setActivatedCards] = useState([]);
    const [activatedLoading, setActivatedLoading] = useState(false);
    const [activatedPage, setActivatedPage] = useState(1);
    const [activatedTotalPages, setActivatedTotalPages] = useState(1);
    const [activatedSort, setActivatedSort] = useState('newest');
    const [activatedSearch, setActivatedSearch] = useState('');

    // Action notification modal state
    const [actionNotificationModal, setActionNotificationModal] = useState({ show: false, card: null, action: '' });
    const [actionLoading, setActionLoading] = useState(false);

    // Custom confirmation modal state
    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', type: 'warning', confirmText: 'Confirm', onConfirm: null });

    // Server-side pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalStores, setTotalStores] = useState(0);
    const [totalCards, setTotalCards] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const contextSearchRef = React.useRef(true); // Track first render for debounce
    const CARDS_PER_PAGE = 20;
    const BATCH_ACCOUNTS_PER_PAGE = 20;

    // Create/Edit form data
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        contact_email: '',
        contact_phone: '',
    });

    // Generate cards form data with settings
    const [generateData, setGenerateData] = useState({
        count: 10,
        email_type: 'icloud',
        color: 'blue',
        email_prefix: '',
        password_prefix: '',
    });

    // Multiple email prefixes state
    const [emailPrefixes, setEmailPrefixes] = useState([]);

    // Card customization settings
    const [customLogo, setCustomLogo] = useState(null);
    const [cardBackLogo, setCardBackLogo] = useState(null);
    const [qrLogo, setQrLogo] = useState(null);
    const [cardColor, setCardColor] = useState('blue');
    const [accountIdType, setAccountIdType] = useState('apple'); // 'apple' or 'google'

    // Board size settings (in cm, defaults to 60x90cm)
    const [boardWidth, setBoardWidth] = useState('');
    const [boardHeight, setBoardHeight] = useState('');

    // Card Back count for print sheet (defaults to generated cards count)
    const [cardBackCount, setCardBackCount] = useState('');

    // Custom note for card exports (between SN and VIP-BATCH)
    const [customNote, setCustomNote] = useState('');

    const [exportProgress, setExportProgress] = useState(null);

    // Helper function to format large numbers (1000 -> 1k, 1000000 -> 1M)
    const formatNumber = (num) => {
        if (num === null || num === undefined) return '0';
        num = Number(num);
        if (num >= 1000000) {
            return (num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + 'k';
        }
        return num.toString();
    };

    useEffect(() => {
        loadStores();
    }, [currentPage, sortOrder]);

    // Debounce search
    useEffect(() => {
        if (contextSearchRef.current) {
            contextSearchRef.current = false;
            return;
        }
        const timer = setTimeout(() => {
            if (currentPage !== 1) {
                setCurrentPage(1); // loadStores will be triggered by currentPage change
            } else {
                loadStores();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const loadStores = async () => {
        setLoading(true);
        try {
            const data = await getStores(currentPage, 15, searchQuery, sortOrder);
            if (data && data.data) {
                setStores(data.data);
                setTotalPages(data.last_page || 1);
                setTotalStores(data.total || 0);
            } else {
                setStores(data || []);
                setTotalPages(1);
                setTotalStores(data?.length || 0);
            }
        } catch (err) {
            console.error('Failed to load stores:', err);
            setError('Failed to load stores');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateStore = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await createStore(formData);
            setShowCreateForm(false);
            setFormData({ name: '', location: '', contact_email: '', contact_phone: '' });
            await loadStores();
        } catch (err) {
            console.error('Failed to create store:', err);
            setError(err.response?.data?.message || 'Failed to create store');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateStore = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await updateStore(editingStore.id, formData);
            setEditingStore(null);
            setFormData({ name: '', location: '', contact_email: '', contact_phone: '' });
            await loadStores();
        } catch (err) {
            console.error('Failed to update store:', err);
            setError(err.response?.data?.message || 'Failed to update store');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteStore = async (storeId) => {
        setConfirmModal({
            show: true,
            title: 'Delete Store',
            message: 'Are you sure you want to delete this store? All associated cards will also be deleted.',
            type: 'danger',
            confirmText: 'Delete',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, show: false }));
                setActionLoading(true);
                try {
                    await deleteStore(storeId);
                    await loadStores();
                } catch (err) {
                    console.error('Failed to delete store:', err);
                    setError(err.response?.data?.message || 'Failed to delete store');
                } finally {
                    setActionLoading(false);
                }
            }
        });
    };

    const handleGenerateCards = async (e) => {
        e.preventDefault();
        if (!selectedStore) return;

        // Filter out empty prefixes
        const activePrefixes = emailPrefixes.filter(p => p.trim().length > 0);

        setActionLoading(true);
        try {
            let allCards = [];

            if (activePrefixes.length > 0) {
                // Multiple prefixes: make one API call per prefix
                for (const prefix of activePrefixes) {
                    const response = await generateCards(
                        selectedStore.id,
                        generateData.count,
                        generateData.email_type,
                        generateData.color,
                        prefix,
                        generateData.password_prefix || null
                    );
                    
                    let newCards = response.cards || [];
                    if (response.batch_id) {
                        try {
                            let allBatchCards = [];
                            let currentPage = 1;
                            let lastPage = 1;
                            do {
                                const batchRes = await getStoreBatchCards(selectedStore.id, response.batch_id, currentPage, 100);
                                const pageCards = batchRes.cards?.data || batchRes.cards || [];
                                allBatchCards = [...allBatchCards, ...pageCards];
                                lastPage = batchRes.cards?.last_page || 1;
                                currentPage++;
                            } while (currentPage <= lastPage);
                            newCards = allBatchCards.length > 0 ? allBatchCards : newCards;
                        } catch (e) {
                            console.error('Failed to fetch full batch', e);
                        }
                    }
                    allCards = [...allCards, ...newCards];
                }
            } else {
                // No prefixes: single call with optional single prefix
                const response = await generateCards(
                    selectedStore.id,
                    generateData.count,
                    generateData.email_type,
                    generateData.color,
                    generateData.email_prefix || null,
                    generateData.password_prefix || null
                );
                
                let newCards = response.cards || [];
                if (response.batch_id) {
                    try {
                        let allBatchCards = [];
                        let currentPage = 1;
                        let lastPage = 1;
                        do {
                            const batchRes = await getStoreBatchCards(selectedStore.id, response.batch_id, currentPage, 100);
                            const pageCards = batchRes.cards?.data || batchRes.cards || [];
                            allBatchCards = [...allBatchCards, ...pageCards];
                            lastPage = batchRes.cards?.last_page || 1;
                            currentPage++;
                        } while (currentPage <= lastPage);
                        newCards = allBatchCards.length > 0 ? allBatchCards : newCards;
                    } catch (e) {
                        console.error('Failed to fetch full batch', e);
                    }
                }
                allCards = newCards;
            }

            // Store generated cards for export
            setGeneratedCards(allCards);
            setCardColor(generateData.color);

            // Select first card for preview
            if (allCards.length > 0) {
                setSelectedPreviewCard(allCards[0]);
            }

            setShowGenerateForm(false);
            setShowExportModal(true); // Show export modal with cards
            await loadStores();
        } catch (err) {
            console.error('Failed to generate cards:', err);
            setError(err.response?.data?.message || 'Failed to generate cards');
        } finally {
            setActionLoading(false);
        }
    };

    // Helper: fetch ALL store cards by paginating through all pages
    const fetchAllStoreCards = async () => {
        if (!selectedStore) return generatedCards;
        let allCards = [];
        let currentPage = 1;
        let lastPage = 1;

        do {
            const response = await getStoreCardsForExport(selectedStore.id, currentPage, 100);
            if (response.cards && response.cards.data) {
                allCards = [...allCards, ...response.cards.data];
                lastPage = response.cards.last_page || 1;
            } else if (response.cards && Array.isArray(response.cards)) {
                allCards = [...allCards, ...response.cards];
                break;
            } else {
                break;
            }
            currentPage++;
        } while (currentPage <= lastPage);

        if (allCards.length > 0) {
            setGeneratedCards(allCards);
        }
        return allCards.length > 0 ? allCards : generatedCards;
    };

    // Export handlers
    const handleExportZip = async () => {
        if (generatedCards.length === 0) return;

        setActionLoading(true);
        setExportProgress({ current: 0, total: generatedCards.length, percentage: 0, status: 'packaging' });

        try {
            // Fetch all cards if we only have a partial view
            const allCards = await fetchAllStoreCards();
            setExportProgress({ current: 0, total: allCards.length, percentage: 0, status: 'packaging' });
            await downloadAccountsZip(allCards, (progress) => {
                setExportProgress(progress);
            }, customLogo, cardColor, cardBackLogo, undefined, undefined, customNote);
        } catch (err) {
            console.error('Export failed:', err);
            setError('Failed to export ZIP');
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
            // Fetch all cards if we only have a partial view
            const allCards = await fetchAllStoreCards();
            setExportProgress({ current: 0, total: allCards.length, percentage: 0, status: 'creating-sheet' });

            // Convert cm to mm (or use defaults: 60cm x 90cm = 600mm x 900mm)
            const widthMm = boardWidth ? parseFloat(boardWidth) * 10 : 600;
            const heightMm = boardHeight ? parseFloat(boardHeight) * 10 : 900;

            await downloadPrintSheetPDF(allCards, (progress) => {
                setExportProgress(progress);
            }, 1, customLogo, undefined, cardColor, widthMm, heightMm, qrLogo, customNote);
        } catch (err) {
            console.error('Print sheet export failed:', err);
            setError('Failed to export print sheet');
        } finally {
            setActionLoading(false);
            setExportProgress(null);
        }
    };

    const handleExportPrintSheetImage = async () => {
        if (generatedCards.length === 0) return;

        setActionLoading(true);
        setExportProgress({ current: 0, total: generatedCards.length, percentage: 0, status: 'creating-image' });

        try {
            // Fetch all cards if we only have a partial view
            const allCards = await fetchAllStoreCards();
            setExportProgress({ current: 0, total: allCards.length, percentage: 0, status: 'creating-image' });

            // Convert cm to mm (or use defaults: 60cm x 90cm = 600mm x 900mm)
            const widthMm = boardWidth ? parseFloat(boardWidth) * 10 : 600;
            const heightMm = boardHeight ? parseFloat(boardHeight) * 10 : 900;

            await downloadPrintSheetImage(allCards, (progress) => {
                setExportProgress(progress);
            }, 1, customLogo, cardColor, widthMm, heightMm, qrLogo, customNote);
        } catch (err) {
            console.error('Print sheet image export failed:', err);
            setError('Failed to export print sheet image');
        } finally {
            setActionLoading(false);
            setExportProgress(null);
        }
    };

    const handleExportCardBackPrintSheet = async () => {
        // Use cardBackCount or default to generated cards count
        const count = cardBackCount ? parseInt(cardBackCount, 10) : generatedCards.length;
        if (count <= 0) return;

        setActionLoading(true);
        setExportProgress({ current: 0, total: count, percentage: 0, status: 'creating-cardback-sheet' });

        try {
            // Convert cm to mm (or use defaults: 60cm x 90cm = 600mm x 900mm)
            const widthMm = boardWidth ? parseFloat(boardWidth) * 10 : 600;
            const heightMm = boardHeight ? parseFloat(boardHeight) * 10 : 900;

            await downloadCardBackPrintSheetImage(count, (progress) => {
                setExportProgress(progress);
            }, 1, cardBackLogo, cardColor, accountIdType, widthMm, heightMm);
        } catch (err) {
            console.error('Card back print sheet export failed:', err);
            setError('Failed to export card back print sheet');
        } finally {
            setActionLoading(false);
            setExportProgress(null);
        }
    };

    // Export print sheet for a specific batch
    const handleExportBatchPrintSheet = async (batchId) => {
        let batch = cardsByBatch[batchId];
        if (!batch) return;

        setActionLoading(true);
        try {
            // Fetch all batch cards if only partial data is loaded
            let cardsToExport = batch.cards;
            if (batch.isPartial || cardsToExport.length < (batch.count || 0)) {
                let allBatchCards = [];
                let currentPage = 1;
                let lastPage = 1;

                do {
                    const response = await getStoreBatchCards(selectedStore.id, batchId, currentPage, 1000);
                    if (response.cards) {
                        const newCards = response.cards.data || response.cards;
                        allBatchCards = [...allBatchCards, ...newCards];
                        lastPage = response.cards.last_page || 1;
                    } else {
                        break;
                    }
                    currentPage++;
                } while (currentPage <= lastPage);

                if (allBatchCards.length > 0) {
                    cardsToExport = allBatchCards;
                    setCardsByBatch(prev => ({
                        ...prev,
                        [batchId]: { ...prev[batchId], cards: cardsToExport, isPartial: false }
                    }));
                }
            }

            if (cardsToExport.length === 0) {
                setActionLoading(false);
                return;
            }

            setExportProgress({ current: 0, total: cardsToExport.length, percentage: 0, status: 'creating-sheet' });

            const widthMm = boardWidth ? parseFloat(boardWidth) * 10 : 600;
            const heightMm = boardHeight ? parseFloat(boardHeight) * 10 : 900;

            await downloadPrintSheetPDF(cardsToExport, (progress) => {
                setExportProgress(progress);
            }, 1, customLogo, undefined, cardColor, widthMm, heightMm, qrLogo, customNote);
        } catch (err) {
            console.error('Batch print sheet export failed:', err);
            setError('Failed to export batch print sheet');
        } finally {
            setActionLoading(false);
            setExportProgress(null);
        }
    };

    // Export print sheet image for a specific batch
    const handleExportBatchPrintSheetImage = async (batchId) => {
        let batch = cardsByBatch[batchId];
        if (!batch) return;

        setActionLoading(true);
        try {
            // Fetch all batch cards if only partial data is loaded
            let cardsToExport = batch.cards;
            if (batch.isPartial || cardsToExport.length < (batch.count || 0)) {
                let allBatchCards = [];
                let currentPage = 1;
                let lastPage = 1;

                do {
                    const response = await getStoreBatchCards(selectedStore.id, batchId, currentPage, 1000);
                    if (response.cards) {
                        const newCards = response.cards.data || response.cards;
                        allBatchCards = [...allBatchCards, ...newCards];
                        lastPage = response.cards.last_page || 1;
                    } else {
                        break;
                    }
                    currentPage++;
                } while (currentPage <= lastPage);

                if (allBatchCards.length > 0) {
                    cardsToExport = allBatchCards;
                    setCardsByBatch(prev => ({
                        ...prev,
                        [batchId]: { ...prev[batchId], cards: cardsToExport, isPartial: false }
                    }));
                }
            }

            if (cardsToExport.length === 0) {
                setActionLoading(false);
                return;
            }

            setExportProgress({ current: 0, total: cardsToExport.length, percentage: 0, status: 'creating-image' });

            const widthMm = boardWidth ? parseFloat(boardWidth) * 10 : 600;
            const heightMm = boardHeight ? parseFloat(boardHeight) * 10 : 900;

            await downloadPrintSheetImage(cardsToExport, (progress) => {
                setExportProgress(progress);
            }, 1, customLogo, cardColor, widthMm, heightMm, qrLogo, customNote);
        } catch (err) {
            console.error('Batch print sheet image export failed:', err);
            setError('Failed to export batch print sheet image');
        } finally {
            setActionLoading(false);
            setExportProgress(null);
        }
    };

    // Export card backs for a specific batch count
    const handleExportBatchCardBackPrintSheet = async (batchId) => {
        let batch = cardsByBatch[batchId];
        if (!batch) return;

        setActionLoading(true);
        try {
            // Fetch all batch cards if only partial data is loaded
            let cardsToExport = batch.cards;
            if (batch.isPartial || cardsToExport.length < (batch.count || 0)) {
                let allBatchCards = [];
                let currentPage = 1;
                let lastPage = 1;

                do {
                    const response = await getStoreBatchCards(selectedStore.id, batchId, currentPage, 1000);
                    if (response.cards) {
                        const newCards = response.cards.data || response.cards;
                        allBatchCards = [...allBatchCards, ...newCards];
                        lastPage = response.cards.last_page || 1;
                    } else {
                        break;
                    }
                    currentPage++;
                } while (currentPage <= lastPage);

                if (allBatchCards.length > 0) {
                    cardsToExport = allBatchCards;
                    setCardsByBatch(prev => ({
                        ...prev,
                        [batchId]: { ...prev[batchId], cards: cardsToExport, isPartial: false }
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

            await downloadCardBackPrintSheetImage(cardsToExport.length, (progress) => {
                setExportProgress(progress);
            }, 1, cardBackLogo, cardColor, accountIdType, widthMm, heightMm);
        } catch (err) {
            console.error('Batch card back print sheet export failed:', err);
            setError('Failed to export batch card back print sheet');
        } finally {
            setActionLoading(false);
            setExportProgress(null);
        }
    };

    // Delete an entire batch - show confirmation modal
    const handleDeleteBatch = (batchId) => {
        if (!selectedStore) return;
        if (batchId === 'legacy') {
            setError('Cannot delete legacy cards batch');
            return;
        }
        setConfirmDeleteBatch(batchId);
    };

    // Confirm batch deletion
    const confirmBatchDeletion = async () => {
        if (!confirmDeleteBatch || !selectedStore) return;
        setActionLoading(true);
        try {
            await deleteBatch(selectedStore.id, confirmDeleteBatch);
            setConfirmDeleteBatch(null);
            // Refresh cards after deletion
            await handleViewCards(selectedStore);
            // Reload stores to update counts
            loadStores();
        } catch (err) {
            console.error('Batch deletion failed:', err);
            setError('Failed to delete batch');
        } finally {
            setActionLoading(false);
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

    const handleQrLogoUpload = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please upload an image file');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                setError('QR logo must be under 2MB');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => setQrLogo(e.target.result);
            reader.readAsDataURL(file);
        }
        event.target.value = '';
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
        setGenerateData({ count: 10, email_type: 'icloud', color: 'blue', email_prefix: '', password_prefix: '' });
        setEmailPrefixes([]);
    };

    // Export ZIP (Images Only)
    const handleExportZipImages = async () => {
        if (generatedCards.length === 0) return;
        setActionLoading(true);
        setExportProgress({ current: 0, total: generatedCards.length, percentage: 0, status: 'creating-zip-images' });
        try {
            const allCards = await fetchAllStoreCards();
            setExportProgress({ current: 0, total: allCards.length, percentage: 0, status: 'creating-zip-images' });
            await downloadAccountCardsImagesZip(allCards, (progress) => {
                setExportProgress(progress);
            }, customLogo, cardColor, qrLogo);
        } catch (err) {
            console.error('ZIP images export failed:', err);
            setError('Failed to export ZIP images');
        } finally {
            setActionLoading(false);
            setExportProgress(null);
        }
    };

    // Export Card Backs (Images)
    const handleExportCardBacksImages = async () => {
        const count = cardBackCount ? parseInt(cardBackCount, 10) : generatedCards.length;
        if (count <= 0) return;

        setActionLoading(true);
        setExportProgress({ current: 0, total: count, percentage: 0, status: 'creating-cardback-zip' });
        try {
            await downloadCardBacksImagesZip(count, (progress) => {
                setExportProgress(progress);
            }, cardBackLogo, cardColor, accountIdType);
        } catch (err) {
            console.error('Card back images export failed:', err);
            setError('Failed to export card back images');
        } finally {
            setActionLoading(false);
            setExportProgress(null);
        }
    };

    // Batch Output as ZIP (Images)
    const handleExportBatchZipImages = async (batchId) => {
        let batch = cardsByBatch[batchId];
        if (!batch) return;

        setActionLoading(true);
        try {
            // Check if we need to fetch the full batch
            let cardsToExport = batch.cards;
            if (batch.isPartial || cardsToExport.length < (batch.count || 0)) {
                let allBatchCards = [];
                let currentPage = 1;
                let lastPage = 1;

                do {
                    const response = await getStoreBatchCards(selectedStore.id, batchId, currentPage, 1000);
                    if (response.cards) {
                        const newCards = response.cards.data || response.cards;
                        allBatchCards = [...allBatchCards, ...newCards];
                        lastPage = response.cards.last_page || 1;
                    } else {
                        break;
                    }
                    currentPage++;
                } while (currentPage <= lastPage);

                if (allBatchCards.length > 0) {
                    cardsToExport = allBatchCards;
                    setCardsByBatch(prev => ({
                        ...prev,
                        [batchId]: { ...prev[batchId], cards: cardsToExport, isPartial: false }
                    }));
                }
            }

            if (cardsToExport.length === 0) {
                setActionLoading(false);
                return;
            }

            setExportProgress({ current: 0, total: cardsToExport.length, percentage: 0, status: 'creating-zip-images' });
            await downloadAccountCardsImagesZip(cardsToExport, (progress) => {
                setExportProgress(progress);
            }, customLogo, cardColor, qrLogo);
        } catch (err) {
            console.error('Batch ZIP images export failed:', err);
            setError('Failed to export batch ZIP images');
        } finally {
            setActionLoading(false);
            setExportProgress(null);
        }
    };

    // View existing cards for a store (for export) - with server-side pagination
    const handleViewCards = async (store, page = 1) => {
        setActionLoading(true);
        setSelectedStore(store);
        try {
            const response = await getStoreCardsForExport(store.id, page, CARDS_PER_PAGE);

            let cards = [];
            let total = 0;
            let lastPage = 1;

            // Handle Laravel pagination structure
            if (response.cards && response.cards.data) {
                cards = response.cards.data;
                total = response.cards.total || response.total_cards || 0;
                lastPage = response.cards.last_page || 1;
            } else if (response.cards && Array.isArray(response.cards)) {
                cards = response.cards;
                total = cards.length;
                lastPage = 1;
            }

            if (cards.length > 0) {
                setGeneratedCards(cards);
                if (page === 1) {
                    setSelectedPreviewCard(cards[0]);
                    setCardColor(cards[0].color || 'blue');
                }

                // Group current page cards by batchId
                const grouped = cards.reduce((acc, card) => {
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

                // Merge with batches summary if available
                if (response.batches && Array.isArray(response.batches)) {
                    const mergedBatches = { ...grouped };
                    response.batches.forEach(batchSummary => {
                        if (!mergedBatches[batchSummary.batchId]) {
                            mergedBatches[batchSummary.batchId] = {
                                cards: [],
                                createdAt: batchSummary.createdAt,
                                count: batchSummary.cards_count,
                                isPartial: true
                            };
                        } else {
                            mergedBatches[batchSummary.batchId].count = batchSummary.cards_count;
                        }
                    });
                    setCardsByBatch(mergedBatches);
                } else {
                    setCardsByBatch(grouped);
                }

                setShowExportModal(true);
            } else {
                if (page === 1) {
                    setError('No cards found for this store. Generate some cards first.');
                    setGeneratedCards([]);
                    setCardsByBatch({});
                }
            }

            setTotalCards(total);
            setTotalPages(lastPage);
            setCurrentPage(page);

        } catch (err) {
            console.error('Failed to load cards:', err);
            setError('Failed to load cards for export');
        } finally {
            setActionLoading(false);
        }
    };

    // Page change handler for main cards pagination
    const handlePageChange = (page) => {
        if (selectedStore) {
            handleViewCards(selectedStore, page);
        }
    };

    // View batch accounts with server-side pagination and search
    const viewBatchAccounts = async (batchId, page = 1, search = batchSearchQuery) => {
        setBatchAccountsPage(page);
        setActionLoading(true);
        try {
            const storeId = selectedStore?.id;
            if (!storeId) {
                setError('Cannot fetch batch: Store ID missing');
                return;
            }

            const response = await getStoreBatchCards(storeId, batchId, page, BATCH_ACCOUNTS_PER_PAGE, search);

            setCardsByBatch(prev => ({
                ...prev,
                [batchId]: {
                    ...prev[batchId],
                    cards: response.cards.data,
                    total: response.cards.total,
                    currentPage: response.cards.current_page,
                    lastPage: response.cards.last_page,
                    isPartial: response.cards.total > response.cards.data.length
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

    // Load activated cards
    const loadActivatedCards = async (page = 1, searchOverride = null) => {
        setActivatedLoading(true);
        try {
            // Use override if provided, otherwise use state
            const searchTerm = searchOverride !== null ? searchOverride : activatedSearch;
            const data = await getActivatedCards(page, 15, activatedSort, searchTerm);
            setActivatedCards(data.data);
            setActivatedPage(data.current_page);
            setActivatedTotalPages(data.last_page);
        } catch (err) {
            console.error('Failed to load activated cards:', err);
            // Non-critical error, just log it
        } finally {
            setActivatedLoading(false);
        }
    };

    useEffect(() => {
        if (showActivatedModal) {
            loadActivatedCards(activatedPage);
        }
    }, [showActivatedModal, activatedPage, activatedSort]);

    // Deactivate card handler - Confirmation handled by Action Notification Modal
    const handleDeactivateCard = async (cardId) => {
        try {
            await deactivateCard(cardId);
            loadActivatedCards(activatedPage); // Reload list
            loadStores(); // Reload stores to update counts
        } catch (err) {
            console.error('Failed to deactivate card:', err);
            alert('Failed to deactivate card');
        }
    };

    if (loading) {
        return (
            <div className="stores-loading">
                <div className="spinner"></div>
                <p>Loading stores...</p>
            </div>
        );
    }

    return (
        <>
            <div className="store-management">
                {/* Batch Delete Confirmation Modal */}
                {confirmDeleteBatch && (
                    <div className="modal-overlay" style={{ zIndex: 1100 }}>
                        <div className="modal-content" style={{
                            maxWidth: '400px',
                            textAlign: 'center',
                            background: 'var(--color-bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--border-radius-lg)',
                            padding: 'var(--spacing-xl)',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                        }}>
                            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <AlertCircle size={48} style={{ color: 'var(--color-accent-red)', marginBottom: 'var(--spacing-md)' }} />
                                <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Delete Batch</h3>
                                <p style={{ color: 'var(--color-text-secondary)' }}>
                                    Are you sure you want to delete this entire batch? This action cannot be undone.
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setConfirmDeleteBatch(null)}
                                    className="btn btn-secondary-enhanced"
                                    disabled={actionLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmBatchDeletion}
                                    className="btn"
                                    disabled={actionLoading}
                                    style={{
                                        background: 'var(--color-accent-red)',
                                        color: 'white',
                                        border: 'none'
                                    }}
                                >
                                    {actionLoading ? 'Deleting...' : 'Delete Batch'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* View Batch Accounts Modal */}
                {selectedBatchId && cardsByBatch[selectedBatchId] && (() => {
                    const currentBatch = cardsByBatch[selectedBatchId];
                    const paginatedCards = currentBatch.cards || [];
                    const totalBatchPages = currentBatch.lastPage || 1;
                    const totalBatchItems = currentBatch.total || currentBatch.count || paginatedCards.length;

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

                                {/* Search Box */}
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
                                                <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Serial</th>
                                                <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Created</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedCards.map((card, index) => (
                                                <tr key={card.id || index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>{card.email}</td>
                                                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>{card.firstName} {card.lastName}</td>
                                                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: card.phone ? 'inherit' : 'var(--color-text-secondary)' }}>{card.phone || '—'}</td>
                                                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)', fontFamily: 'monospace' }}>{card.serialNumber || card.accountId || 'N/A'}</td>
                                                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                                        {card.created_at ? new Date(card.created_at).toLocaleDateString('en-CA') : 'N/A'}
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

                {/* View Activated Cards Modal */}
                {showActivatedModal && (
                    <div className="modal-overlay" style={{ zIndex: 1100 }}>
                        <div className="modal-content" style={{
                            maxWidth: '1000px',
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
                                    <Phone size={20} style={{ marginRight: 'var(--spacing-sm)', verticalAlign: 'middle' }} />
                                    Activated Cards
                                </h3>
                                <button
                                    onClick={() => setShowActivatedModal(false)}
                                    className="btn btn-ghost"
                                    style={{ padding: 'var(--spacing-xs)' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Search and Sort */}
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <Search size={18} style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--color-text-tertiary)'
                                    }} />
                                    <input
                                        type="text"
                                        placeholder="Search by email, phone, or serial..."
                                        value={activatedSearch}
                                        onChange={(e) => {
                                            const newValue = e.target.value;
                                            setActivatedSearch(newValue);
                                            if (newValue === '' || newValue.length > 2) {
                                                setActivatedPage(1);
                                                loadActivatedCards(1, newValue);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setActivatedPage(1);
                                                loadActivatedCards(1, activatedSearch);
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--spacing-sm) var(--spacing-md)',
                                            paddingLeft: '40px',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--border-radius-md)',
                                            background: 'var(--color-bg-secondary)',
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        setActivatedSort(prev => prev === 'newest' ? 'oldest' : 'newest');
                                    }}
                                    className="btn btn-secondary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    {activatedSort === 'newest' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                                    {activatedSort === 'newest' ? 'Newest' : 'Oldest'}
                                </button>
                            </div>

                            {/* Table */}
                            <div style={{
                                flex: 1,
                                overflow: 'auto',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--border-radius-md)',
                                position: 'relative'
                            }}>
                                {activatedLoading && (
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
                                            <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Account Info</th>
                                            <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Store</th>
                                            <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Phone</th>
                                            <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Password</th>
                                            <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Serial</th>
                                            <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Date</th>
                                            <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activatedCards.length === 0 && !activatedLoading ? (
                                            <tr>
                                                <td colSpan="6" style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                                    No activated cards found.
                                                </td>
                                            </tr>
                                        ) : (
                                            activatedCards.map((card) => (
                                                <tr key={card.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
                                                        <div style={{ fontWeight: 500 }}>{card.email}</div>
                                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{card.firstName} {card.lastName}</div>
                                                        {card.birthday && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>DOB: {`${card.birthday.year}/${card.birthday.month}/${card.birthday.day}`}</div>}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>{card.storeName}</td>
                                                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)', fontFamily: 'monospace' }}>{card.phone}</td>
                                                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)', fontFamily: 'monospace', color: 'var(--color-accent-purple)' }}>{card.password || '***'}</td>
                                                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)', fontFamily: 'monospace' }}>{card.serialNumber}</td>
                                                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                                        {new Date(card.created_at).toLocaleDateString('en-CA')}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                            <button
                                                                onClick={() => setActionNotificationModal({ show: true, card, action: 'deactivate' })}
                                                                className="btn btn-ghost"
                                                                title="Deactivate Card"
                                                                style={{ color: 'var(--color-accent-red)', padding: '4px' }}
                                                            >
                                                                <XCircle size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => navigator.clipboard.writeText(`Email: ${card.email}\nPassword: ${card.password || ''}\nName: ${card.firstName} ${card.lastName}\nPhone: ${card.phone}`)}
                                                                className="btn btn-ghost"
                                                                title="Copy Card Info"
                                                                style={{ color: 'var(--color-accent-blue)', padding: '4px' }}
                                                            >
                                                                <Copy size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div style={{ marginTop: 'var(--spacing-md)' }}>
                                <Pagination
                                    currentPage={activatedPage}
                                    totalPages={activatedTotalPages}
                                    onPageChange={(page) => setActivatedPage(page)}
                                    totalItems={-1} // Hide detailed count for simplicity or pass meaningful if available
                                    itemsPerPage={15}
                                />
                            </div>
                        </div>
                    </div>
                )}


                {/* Action Notification Modal */}
                {actionNotificationModal.show && (
                    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => !actionLoading && setActionNotificationModal({ show: false, card: null, action: '' })}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                            <div className="modal-header">
                                <h3 style={{ margin: 0, color: 'var(--color-accent-red)' }}>
                                    <AlertCircle size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                    Confirm Deactivation
                                </h3>
                                <button
                                    className="modal-close"
                                    onClick={() => setActionNotificationModal({ show: false, card: null, action: '' })}
                                    disabled={actionLoading}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div style={{ padding: 'var(--spacing-md)' }}>
                                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                                    Are you sure you want to deactivate this card? This will clear the phone number and make the card available for another customer.
                                </p>
                                <div style={{
                                    background: 'var(--color-bg-secondary)',
                                    padding: 'var(--spacing-md)',
                                    borderRadius: '8px',
                                    marginBottom: 'var(--spacing-md)'
                                }}>
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>Card Info:</div>
                                    <div style={{ fontWeight: 500 }}>{actionNotificationModal.card?.email}</div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                        {actionNotificationModal.card?.firstName} {actionNotificationModal.card?.lastName}
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', fontFamily: 'monospace', color: 'var(--color-text-tertiary)' }}>
                                        Phone: {actionNotificationModal.card?.phone}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setActionNotificationModal({ show: false, card: null, action: '' })}
                                        disabled={actionLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-accent-red"
                                        onClick={async () => {
                                            setActionLoading(true);
                                            try {
                                                await handleDeactivateCard(actionNotificationModal.card.id);
                                                setActionNotificationModal({ show: false, card: null, action: '' });
                                            } finally {
                                                setActionLoading(false);
                                            }
                                        }}
                                        disabled={actionLoading}
                                        style={{
                                            background: 'var(--color-accent-red)',
                                            color: '#fff'
                                        }}
                                    >
                                        {actionLoading ? 'Deactivating...' : 'Deactivate'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="section-header">
                    <h2>Store Management</h2>
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
                                placeholder="Search stores..."
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
                                localStorage.setItem('storesSortOrder', newOrder);
                            }}
                            className="btn btn-ghost"
                            title={sortOrder === 'desc' ? 'Showing newest first' : 'Showing oldest first'}
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                        >
                            {sortOrder === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
                        </button>
                        <button
                            onClick={() => {
                                setShowActivatedModal(true);
                                loadActivatedCards(1);
                            }}
                            className="btn btn-secondary-enhanced"
                        >
                            <Phone size={18} /> View Activated Cards
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

                {error && (
                    <div className="error-banner">
                        <AlertCircle size={18} />
                        {error}
                        <button onClick={() => setError(null)}><X size={16} /></button>
                    </div>
                )}

                {/* Create Store Modal */}
                {showCreateForm && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h3>Create New Store</h3>
                                <button onClick={() => setShowCreateForm(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleCreateStore}>
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
                                <div className="form-group">
                                    <label>Contact Email</label>
                                    <input
                                        type="email"
                                        value={formData.contact_email}
                                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                                        placeholder="store@example.com"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Contact Phone</label>
                                    <input
                                        type="text"
                                        value={formData.contact_phone}
                                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                                        placeholder="+1234567890"
                                    />
                                </div>
                                <div className="modal-actions">
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
                )}

                {/* Edit Store Modal */}
                {editingStore && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h3>Edit Store</h3>
                                <button onClick={() => setEditingStore(null)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleUpdateStore}>
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
                                <div className="form-group">
                                    <label>Contact Email</label>
                                    <input
                                        type="email"
                                        value={formData.contact_email}
                                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Contact Phone</label>
                                    <input
                                        type="text"
                                        value={formData.contact_phone}
                                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                                    />
                                </div>
                                <div className="modal-actions">
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
                )}

                {/* Generate Cards Modal */}
                {showGenerateForm && selectedStore && (
                    <div className="modal-overlay">
                        <div className="modal" style={{ maxWidth: '600px' }}>
                            <div className="modal-header">
                                <h3>Generate Cards for {selectedStore.name}</h3>
                                <button onClick={() => setShowGenerateForm(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleGenerateCards}>
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
                                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Email Prefixes (up to 8 characters each)</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (emailPrefixes.length < 10) {
                                                    setEmailPrefixes([...emailPrefixes, '']);
                                                }
                                            }}
                                            disabled={emailPrefixes.length >= 10}
                                            className="btn btn-sm btn-secondary"
                                            style={{
                                                padding: '4px 10px',
                                                fontSize: 'var(--font-size-xs)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <Plus size={14} /> Add Prefix
                                        </button>
                                    </label>

                                    {emailPrefixes.length === 0 ? (
                                        <>
                                            <input
                                                type="text"
                                                maxLength={8}
                                                placeholder="e.g., abcd1234"
                                                value={generateData.email_prefix}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                                                    setGenerateData({ ...generateData, email_prefix: value });
                                                }}
                                                style={{
                                                    fontFamily: 'monospace',
                                                    letterSpacing: '0.1em'
                                                }}
                                            />
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: '4px', display: 'block' }}>
                                                {generateData.email_prefix ? (
                                                    <>Preview: <code style={{ background: 'var(--color-bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>{generateData.email_prefix.padEnd(8, '•')}{'########'}@{generateData.email_type === 'gmail' ? 'gmail.com' : 'icloud.com'}</code></>
                                                ) : (
                                                    'Optional: single prefix or click "Add Prefix" for multiple'
                                                )}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {emailPrefixes.map((prefix, index) => (
                                                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{
                                                            fontSize: 'var(--font-size-xs)',
                                                            color: 'var(--color-text-tertiary)',
                                                            minWidth: '20px',
                                                            textAlign: 'center',
                                                            fontWeight: 600
                                                        }}>{index + 1}</span>
                                                        <input
                                                            type="text"
                                                            maxLength={8}
                                                            placeholder={`Prefix ${index + 1}`}
                                                            value={prefix}
                                                            onChange={(e) => {
                                                                const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                                                                const updated = [...emailPrefixes];
                                                                updated[index] = value;
                                                                setEmailPrefixes(updated);
                                                            }}
                                                            style={{
                                                                flex: 1,
                                                                fontFamily: 'monospace',
                                                                letterSpacing: '0.1em'
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEmailPrefixes(emailPrefixes.filter((_, i) => i !== index));
                                                            }}
                                                            className="btn btn-ghost"
                                                            style={{ padding: '4px', color: 'var(--color-accent-red)' }}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: '8px', display: 'block' }}>
                                                {emailPrefixes.filter(p => p.trim()).length > 0 ? (
                                                    <>Total: <strong>{emailPrefixes.filter(p => p.trim()).length} prefix(es)</strong> × {generateData.count} cards = <strong>{emailPrefixes.filter(p => p.trim()).length * generateData.count} cards</strong></>
                                                ) : (
                                                    'Enter prefixes in the fields above. Each prefix generates its own batch of cards.'
                                                )}
                                            </span>
                                        </>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Password Prefix (exactly 6 characters)</label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        placeholder="e.g., MyPass"
                                        value={generateData.password_prefix}
                                        onChange={(e) => {
                                            let value = e.target.value.slice(0, 6);
                                            if (value.length > 0) {
                                                value = value.charAt(0).toUpperCase() + value.slice(1);
                                            }
                                            setGenerateData({ ...generateData, password_prefix: value });
                                        }}
                                        style={{ fontFamily: 'monospace' }}
                                    />
                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: '4px', display: 'block' }}>
                                        {generateData.password_prefix ? (
                                            generateData.password_prefix.length === 6 ? (
                                                <>Preview: <code style={{ background: 'var(--color-bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>{generateData.password_prefix}<span style={{ color: 'var(--color-accent-blue)' }}>••••••</span></code> (6 chars auto-generated)</>
                                            ) : (
                                                <span style={{ color: 'var(--color-accent-orange)' }}>Enter exactly 6 characters ({generateData.password_prefix.length}/6)</span>
                                            )
                                        ) : (
                                            'Optional: Enter exactly 6 characters, remaining 6 will be auto-generated'
                                        )}
                                    </span>
                                </div>
                                <div className="form-group">
                                    <label>Card Color</label>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                        <button
                                            type="button"
                                            onClick={() => setGenerateData({ ...generateData, color: 'blue' })}
                                            style={{
                                                flex: 1,
                                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                                border: generateData.color === 'blue' ? '2px solid var(--color-accent-blue)' : '2px solid var(--border-color)',
                                                borderRadius: 'var(--border-radius-md)',
                                                background: generateData.color === 'blue' ? 'rgba(0, 136, 204, 0.15)' : 'var(--color-bg-secondary)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--spacing-sm)'
                                            }}
                                        >
                                            <span style={{ width: 16, height: 16, borderRadius: 4, background: '#0088CC' }}></span>
                                            <span style={{ fontWeight: generateData.color === 'blue' ? 600 : 400 }}>Blue</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setGenerateData({ ...generateData, color: 'black' })}
                                            style={{
                                                flex: 1,
                                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                                border: generateData.color === 'black' ? '2px solid #1E1E1E' : '2px solid var(--border-color)',
                                                borderRadius: 'var(--border-radius-md)',
                                                background: generateData.color === 'black' ? 'rgba(30, 30, 30, 0.15)' : 'var(--color-bg-secondary)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--spacing-sm)'
                                            }}
                                        >
                                            <span style={{ width: 16, height: 16, borderRadius: 4, background: '#1E1E1E' }}></span>
                                            <span style={{ fontWeight: generateData.color === 'black' ? 600 : 400 }}>Black</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" onClick={() => setShowGenerateForm(false)} className="btn btn-ghost">
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-success-enhanced" disabled={actionLoading}>
                                        {actionLoading ? 'Generating...' : `Generate ${generateData.count} Cards`}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Export Modal - Shows after card generation */}
                {showExportModal && generatedCards.length > 0 && (
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
                                {/* Export Actions */}
                                <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={handleExportZip}
                                        className="btn btn-success-enhanced"
                                        disabled={actionLoading}
                                        style={{ flex: 1, minWidth: '200px' }}
                                    >
                                        <FileArchive size={18} />
                                        {exportProgress && ['packaging', 'compressing', 'finalizing'].includes(exportProgress.status) ? `${exportProgress.percentage}%...` : `Download All as ZIP (${generatedCards.length} PDFs)`}
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
                                        {exportProgress?.status === 'creating-sheet' ? `${exportProgress.percentage}%...` : `Download Print Sheet PDF`}
                                    </button>
                                    <button
                                        onClick={handleExportPrintSheetImage}
                                        className="btn btn-primary-enhanced"
                                        disabled={actionLoading}
                                        style={{ flex: 1, minWidth: '200px' }}
                                    >
                                        <FileArchive size={18} />
                                        {exportProgress?.status === 'creating-image' ? `${exportProgress.percentage}%...` : `Download Print Sheet Image`}
                                    </button>
                                    <button
                                        onClick={handleExportCardBackPrintSheet}
                                        className="btn btn-purple-enhanced"
                                        disabled={actionLoading}
                                        style={{ flex: 1, minWidth: '200px' }}
                                    >
                                        <Printer size={18} />
                                        {exportProgress?.status === 'creating-cardback-sheet' ? `${exportProgress.percentage}%...` : `Download Card Backs Sheet Image`}
                                    </button>
                                    <button
                                        onClick={handleExportCardBacksImages}
                                        className="btn btn-purple-enhanced"
                                        disabled={actionLoading}
                                        style={{ flex: 1, minWidth: '200px' }}
                                    >
                                        <FileArchive size={18} />
                                        {exportProgress?.status === 'creating-cardback-zip' ? `${exportProgress.percentage}%...` : `ZIP Card Backs (Images)`}
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

                                {/* Custom Note Input */}
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    background: 'var(--color-bg-secondary)',
                                    borderRadius: 'var(--border-radius-lg)',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 'var(--spacing-xs)' }}>
                                        Custom Note (Optional — appears between SN and VIP-BATCH)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Store name, promo text..."
                                        value={customNote}
                                        onChange={(e) => setCustomNote(e.target.value)}
                                        maxLength={50}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--spacing-sm) var(--spacing-md)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--border-radius-md)',
                                            background: 'var(--color-bg-primary)',
                                            fontSize: 'var(--font-size-md)',
                                            boxSizing: 'border-box'
                                        }}
                                    />
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
                                            {/* QR Logo Upload */}
                                            <label style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--spacing-xs)',
                                                padding: 'var(--spacing-xs) var(--spacing-sm)',
                                                background: qrLogo ? 'rgba(0, 122, 255, 0.15)' : 'var(--color-bg-tertiary)',
                                                borderRadius: 'var(--border-radius-sm)',
                                                cursor: 'pointer',
                                                fontSize: 'var(--font-size-xs)',
                                                color: qrLogo ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)'
                                            }}>
                                                <Upload size={14} />
                                                {qrLogo ? 'QR Logo ✓' : 'QR Logo'}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleQrLogoUpload}
                                                    style={{ display: 'none' }}
                                                />
                                            </label>
                                            {qrLogo && (
                                                <button
                                                    onClick={() => setQrLogo(null)}
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
                                        </Card.Header>
                                        <Card.Body style={{ padding: 0 }}>
                                            <AccountCard account={selectedPreviewCard} customLogo={customLogo} cardColor={cardColor} qrLogo={qrLogo} />
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
                                        <Card.Body style={{ padding: 'var(--spacing-md)' }}>
                                            <CardBack batchNumber={1} customLogo={cardBackLogo} cardColor={cardColor} accountIdType={accountIdType} />
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
                                                    Card Color
                                                </label>
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
                                                            gap: 'var(--spacing-sm)'
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
                                                            gap: 'var(--spacing-sm)'
                                                        }}
                                                    >
                                                        <span style={{ width: 16, height: 16, borderRadius: 4, background: '#1E1E1E' }}></span>
                                                        <span style={{ fontWeight: cardColor === 'black' ? 600 : 400 }}>Black</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Account ID Type */}
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)', display: 'block' }}>
                                                    Card Back Account Type
                                                </label>
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
                                                            gap: 'var(--spacing-sm)'
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
                                                            gap: 'var(--spacing-sm)'
                                                        }}
                                                    >
                                                        <span style={{ fontWeight: accountIdType === 'google' ? 600 : 400 }}>Google ID</span>
                                                    </button>
                                                </div>
                                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--spacing-xs)', display: 'block' }}>
                                                    Changes the text on the card back
                                                </span>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>

                                {/* Generated Cards List */}
                                <Card hover={false}>
                                    <Card.Header>
                                        <CreditCard size={18} style={{ color: 'var(--color-accent-blue)' }} />
                                        <span>Generated Cards ({generatedCards.length})</span>
                                    </Card.Header>
                                    <Card.Body style={{ maxHeight: '200px', overflow: 'auto' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                            {generatedCards.slice(0, 20).map((card, index) => (
                                                <div
                                                    key={card.id}
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
                                                    <span style={{ color: 'var(--color-text-tertiary)', width: '30px' }}>#{index + 1}</span>
                                                    <span style={{ fontWeight: 'var(--font-weight-medium)', flex: 1 }}>{card.email}</span>
                                                    <span style={{ color: 'var(--color-text-secondary)' }}>{card.serialNumber}</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            downloadAccountPDF(card, 1, customLogo, undefined, cardColor, undefined, undefined, qrLogo);
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
                                            {generatedCards.length > 20 && (
                                                <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: 'var(--spacing-sm)' }}>
                                                    ... and {generatedCards.length - 20} more cards
                                                </div>
                                            )}
                                        </div>
                                    </Card.Body>
                                </Card>

                                {/* Batch List - For Separate Exports */}
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
                                                                    ({batch.count || batch.cards_count || batch.cards?.length || 0} cards)
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
                                                                onClick={() => handleExportBatchPrintSheetImage(batchId)}
                                                                className="btn btn-primary-enhanced"
                                                                disabled={actionLoading}
                                                                style={{ flex: 1, fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)', minWidth: '120px' }}
                                                            >
                                                                <FileArchive size={14} />
                                                                Print Sheet (Img)
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
                                                                onClick={() => {
                                                                    viewBatchAccounts(batchId, 1, '');
                                                                }}
                                                                className="btn btn-primary-enhanced"
                                                                style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                                                            >
                                                                <List size={14} />
                                                                View Accounts
                                                            </button>
                                                            {batchId !== 'legacy' && (
                                                                <button
                                                                    onClick={() => handleDeleteBatch(batchId)}
                                                                    className="btn"
                                                                    disabled={actionLoading}
                                                                    style={{
                                                                        fontSize: 'var(--font-size-sm)',
                                                                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                                                                        background: 'rgba(255, 59, 48, 0.1)',
                                                                        color: 'var(--color-accent-red)',
                                                                        border: '1px solid rgba(255, 59, 48, 0.3)'
                                                                    }}
                                                                >
                                                                    <Trash2 size={14} />
                                                                    Delete
                                                                </button>
                                                            )}
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
                )}

                {stores.length === 0 ? (
                    <div className="empty-state" style={{
                        padding: 'var(--spacing-3xl)',
                        background: 'linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%)',
                        borderRadius: 'var(--border-radius-xl)',
                        border: '1px solid var(--border-color)',
                        textAlign: 'center',
                        maxWidth: '500px',
                        margin: 'var(--spacing-3xl) auto'
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            margin: '0 auto var(--spacing-lg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, rgba(0, 136, 204, 0.1) 0%, rgba(0, 136, 204, 0.05) 100%)',
                            borderRadius: 'var(--border-radius-xl)',
                            border: '2px solid rgba(0, 136, 204, 0.2)'
                        }}>
                            <Store size={40} style={{ color: 'var(--color-accent-blue)' }} />
                        </div>
                        <h3 style={{
                            fontSize: 'var(--font-size-2xl)',
                            fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--color-text-primary)',
                            marginBottom: 'var(--spacing-sm)'
                        }}>No Stores Yet</h3>
                        <p style={{
                            fontSize: 'var(--font-size-md)',
                            color: 'var(--color-text-secondary)',
                            marginBottom: 'var(--spacing-xl)',
                            lineHeight: 1.6
                        }}>Get started by creating your first store. Generate and manage account cards for your business.</p>
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="btn-primary"
                            style={{
                                padding: 'var(--spacing-md) var(--spacing-2xl)',
                                fontSize: 'var(--font-size-md)',
                                fontWeight: 'var(--font-weight-semibold)',
                                background: 'linear-gradient(135deg, var(--color-accent-blue) 0%, #0077BB 100%)',
                                boxShadow: '0 4px 12px rgba(0, 136, 204, 0.3)',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 16px rgba(0, 136, 204, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 12px rgba(0, 136, 204, 0.3)';
                            }}
                        >
                            <Plus size={18} /> Create First Store
                        </button>
                    </div>
                ) : (
                    <div className="stores-grid">
                        {stores.map((store) => (
                            <div key={store.id} className="store-card">
                                <div className="store-card-header">
                                    <div className="store-icon">
                                        <Store size={24} />
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
                                        <span className="stat-value">{formatNumber(store.cards_count)}</span>
                                        <span className="stat-label">Total Cards</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-value active">{formatNumber(store.active_cards_count)}</span>
                                        <span className="stat-label">Active</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-value inactive">{formatNumber(store.inactive_cards_count)}</span>
                                        <span className="stat-label">Inactive</span>
                                    </div>
                                    {(store.locked_cards_count > 0) && (
                                        <div className="stat">
                                            <span className="stat-value" style={{ color: 'var(--color-accent-red)' }}>{formatNumber(store.locked_cards_count)}</span>
                                            <span className="stat-label">Locked</span>
                                        </div>
                                    )}
                                </div>
                                <div className="store-card-footer" style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                                    <button onClick={() => handleViewCards(store)} className="btn btn-secondary-enhanced" style={{ flex: 1 }} disabled={actionLoading || (store.cards_count || 0) === 0}>
                                        <List size={16} /> View Cards
                                    </button>
                                    <button onClick={() => openGenerateForm(store)} className="btn btn-primary-enhanced" style={{ flex: 1 }}>
                                        <CreditCard size={16} /> Generate
                                    </button>
                                    {(store.cards_count || 0) > 0 && (
                                        <button
                                            onClick={() => {
                                                const isLocked = store.is_locked;
                                                setConfirmModal({
                                                    show: true,
                                                    title: isLocked ? 'Unlock Store' : 'Lock Store',
                                                    message: isLocked
                                                        ? `Unlock store "${store.name}"? Users will be able to scan cards again.`
                                                        : `Lock store "${store.name}"? All ${store.cards_count} cards will become inaccessible. Users scanning locked cards will see a blocked message.`,
                                                    type: isLocked ? 'success' : 'danger',
                                                    confirmText: isLocked ? 'Unlock' : 'Lock',
                                                    onConfirm: async () => {
                                                        setConfirmModal(prev => ({ ...prev, show: false }));
                                                        setActionLoading(true);
                                                        try {
                                                            if (isLocked) {
                                                                await unlockStoreCards(store.id);
                                                            } else {
                                                                await lockStoreCards(store.id);
                                                            }
                                                            loadStores(currentPage);
                                                        } catch (err) {
                                                            setError(err.response?.data?.message || 'Failed to update lock status');
                                                        } finally {
                                                            setActionLoading(false);
                                                        }
                                                    }
                                                });
                                            }}
                                            className={`btn ${store.is_locked ? 'btn-secondary-enhanced' : 'btn-ghost'}`}
                                            style={{
                                                flex: 1,
                                                color: store.is_locked ? 'var(--color-accent-green)' : 'var(--color-accent-red)',
                                                borderColor: store.is_locked ? 'var(--color-accent-green)' : 'var(--color-accent-red)',
                                            }}
                                            disabled={actionLoading}
                                            title={store.is_locked ? 'Unlock store' : 'Lock store'}
                                        >
                                            {store.is_locked ? <Unlock size={16} /> : <Lock size={16} />}
                                            {store.is_locked ? 'Unlock' : 'Lock'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Main Stores Pagination */}
                {stores.length > 0 && (
                    <div style={{ padding: 'var(--spacing-md)' }}>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => setCurrentPage(page)}
                            totalItems={totalStores}
                            itemsPerPage={15}
                        />
                    </div>
                )}
            </div>

            {/* Custom Confirmation Modal */}
            {
                confirmModal.show && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10000, padding: 'var(--spacing-lg)',
                        animation: 'fadeIn 0.2s ease'
                    }}>
                        <div style={{
                            background: 'var(--color-bg-primary)', borderRadius: 'var(--border-radius-lg)',
                            padding: 0, maxWidth: '420px', width: '100%',
                            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
                            border: '1px solid var(--color-border-primary)',
                            animation: 'slideUp 0.3s ease', overflow: 'hidden'
                        }}>
                            <div style={{
                                padding: 'var(--spacing-lg)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)'
                            }}>
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: confirmModal.type === 'danger' ? 'rgba(255, 59, 48, 0.12)'
                                        : confirmModal.type === 'success' ? 'rgba(52, 199, 89, 0.12)'
                                            : 'rgba(255, 149, 0, 0.12)',
                                }}>
                                    {confirmModal.type === 'danger' ? (
                                        <AlertCircle size={28} style={{ color: 'var(--color-accent-red)' }} />
                                    ) : confirmModal.type === 'success' ? (
                                        <Unlock size={28} style={{ color: 'var(--color-accent-green)' }} />
                                    ) : (
                                        <Lock size={28} style={{ color: 'var(--color-accent-orange, #ff9500)' }} />
                                    )}
                                </div>
                                <h3 style={{
                                    margin: 0, fontSize: 'var(--font-size-lg)',
                                    fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)',
                                    textAlign: 'center'
                                }}>{confirmModal.title}</h3>
                                <p style={{
                                    margin: 0, fontSize: 'var(--font-size-sm)',
                                    color: 'var(--color-text-secondary)', textAlign: 'center',
                                    lineHeight: '1.5'
                                }}>{confirmModal.message}</p>
                            </div>
                            <div style={{
                                display: 'flex', gap: 'var(--spacing-sm)',
                                padding: 'var(--spacing-md) var(--spacing-lg)',
                                borderTop: '1px solid var(--color-border-primary)',
                                background: 'var(--color-bg-secondary)'
                            }}>
                                <button
                                    onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                                    className="btn btn-secondary-enhanced"
                                    style={{ flex: 1, padding: '10px' }}
                                >Cancel</button>
                                <button
                                    onClick={confirmModal.onConfirm}
                                    className="btn"
                                    style={{
                                        flex: 1, padding: '10px', fontWeight: 'var(--font-weight-semibold)',
                                        background: confirmModal.type === 'danger' ? 'var(--color-accent-red)'
                                            : confirmModal.type === 'success' ? 'var(--color-accent-green)'
                                                : 'var(--color-accent-orange, #ff9500)',
                                        color: '#fff', border: 'none'
                                    }}
                                >{confirmModal.confirmText || 'Confirm'}</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default StoreManagement;

