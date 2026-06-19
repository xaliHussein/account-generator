import React, { useState, useEffect, useRef } from 'react';
import {
    getIdStores, createIdStore, updateIdStore, deleteIdStore, getIdStore,
    importIdCardsFile, getIdStoreCards, getIdBatchCards,
    deleteIdBatch, lockIdStoreCards, unlockIdStoreCards
} from '../services/idApi';
import {
    downloadIdPrintSheetPDF, downloadIdCardPDF,
    downloadIdCardBackPrintSheetImage, downloadIdPrintSheetImage
} from '../services/idPdfGenerator';
import {
    downloadIdCardsZip, downloadIdCardsImagesZip, downloadIdCardBacksImagesZip
} from '../services/idZipExporter';
import { resizeImageToDataUrl, validateImageFile } from '../services/imageUtils';
import IdCard from './IdCard';
import IdCardLight from './IdCardLight';
import IdCardBack from './IdCardBack';
import IdCardBackLight from './IdCardBackLight';
import IdCardCustom from './IdCardCustom';
import IdCardBackCustom from './IdCardBackCustom';
import Card from './ui/Card';
import Pagination from './ui/Pagination';
import {
    Plus, Edit2, Trash2, CreditCard, X, AlertCircle, Download, Printer, Eye,
    List, ArrowUp, ArrowDown, FileArchive, Upload, Check, Search, Lock, Unlock,
    FileText, ExternalLink, Image as ImageIcon
} from 'lucide-react';

/**
 * ID Store Management Component
 * Same operations as Wallet Cards (design selection, print types, batches, generated cards)
 * except the Apple/Google "Card Settings" (ID cards are Apple ID only).
 * Cards are created by uploading an Excel/CSV file.
 */
const IdStoreManagement = () => {
    const [stores, setStores] = useState([]);
    const [storePage, setStorePage] = useState(1);
    const [totalStorePages, setTotalStorePages] = useState(1);
    const [totalStores, setTotalStores] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const searchRef = useRef(true);
    const STORES_PER_PAGE = 15;
    const GENERATED_PER_PAGE = 20;
    const BATCH_ACCOUNTS_PER_PAGE = 20;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('idStoresSortOrder') || 'desc');

    // Store form state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingStore, setEditingStore] = useState(null);
    const [formData, setFormData] = useState({ name: '', location: '', contact_email: '', contact_phone: '', instagram: '', tiktok: '', logo: '', show_store_info: false });

    const [selectedStore, setSelectedStore] = useState(null);
    const [currentViewStoreId, setCurrentViewStoreId] = useState(null);

    // Generate (Excel upload) state
    const [showGenerateForm, setShowGenerateForm] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const fileInputRef = useRef(null);

    // Export modal + cards state
    const [showExportModal, setShowExportModal] = useState(false);
    const [generatedCards, setGeneratedCards] = useState([]);
    const [cardsByBatch, setCardsByBatch] = useState({});
    const [selectedBatchId, setSelectedBatchId] = useState(null);
    const [selectedPreviewCard, setSelectedPreviewCard] = useState(null);
    const [batchSearchQuery, setBatchSearchQuery] = useState('');
    const [batchAccountsPage, setBatchAccountsPage] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCards, setTotalCards] = useState(0);

    // Export settings
    const [boardWidth, setBoardWidth] = useState('');
    const [boardHeight, setBoardHeight] = useState('');
    const [cardBackCount, setCardBackCount] = useState('');
    const [qrLogo, setQrLogo] = useState(null);
    const [exportProgress, setExportProgress] = useState(null);
    const [cardDesignExport, setCardDesignExport] = useState('classic');
    const [exportingCsv, setExportingCsv] = useState(false);

    // Custom card design images (per store)
    const [customFront, setCustomFront] = useState(null);
    const [customBack, setCustomBack] = useState(null);
    const [designSaving, setDesignSaving] = useState(false);
    const customFrontRef = useRef(null);
    const customBackRef = useRef(null);
    const logoInputRef = useRef(null);

    // Confirmation modal
    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', type: 'warning', confirmText: 'Confirm', onConfirm: null });

    const formatNumber = (num) => {
        if (num === null || num === undefined) return '0';
        num = Number(num);
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toString();
    };

    const statusLabel = (s) => ({
        'creating-zip': 'Creating ZIP...',
        'creating-zip-images': 'Creating Images ZIP...',
        'creating-sheet': 'Creating Print Sheet...',
        'creating-image': 'Creating Print Sheet Image...',
        'creating-cardback-sheet': 'Creating Card Backs Sheet...',
        'creating-cardback-zip': 'Creating Card Backs ZIP...',
        'compressing': 'Compressing...'
    }[s] || 'Working...');

    useEffect(() => {
        loadStores(storePage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storePage, sortOrder]);

    useEffect(() => {
        if (searchRef.current) {
            searchRef.current = false;
            return;
        }
        const timer = setTimeout(() => {
            if (storePage !== 1) setStorePage(1);
            else loadStores(1);
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    const loadStores = async (page = 1) => {
        setLoading(true);
        try {
            const data = await getIdStores(page, STORES_PER_PAGE, searchQuery, sortOrder);
            let loadedStores = [];
            if (data.data && Array.isArray(data.data)) {
                loadedStores = data.data;
                setTotalStores(data.total || 0);
                setTotalStorePages(data.last_page || 1);
            } else if (Array.isArray(data)) {
                loadedStores = data;
                setTotalStores(data.length);
                setTotalStorePages(1);
            }
            setStores(loadedStores);
        } catch (err) {
            console.error('Failed to load ID stores:', err);
            setError('Failed to load ID stores');
        } finally {
            setLoading(false);
        }
    };

    // ==================== Store CRUD ====================

    const handleCreateStore = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await createIdStore(formData);
            setShowCreateForm(false);
            setFormData({ name: '', location: '', contact_email: '', contact_phone: '', instagram: '', tiktok: '', logo: '', show_store_info: false });
            await loadStores(1);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create ID store');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateStore = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await updateIdStore(editingStore.id, formData);
            setEditingStore(null);
            setFormData({ name: '', location: '', contact_email: '', contact_phone: '', instagram: '', tiktok: '', logo: '', show_store_info: false });
            await loadStores(storePage);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update ID store');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteStore = (storeId) => {
        setConfirmModal({
            show: true,
            title: 'Delete ID Store',
            message: 'Are you sure you want to delete this ID store? All associated cards will also be deleted.',
            type: 'danger',
            confirmText: 'Delete',
            onConfirm: async () => {
                setConfirmModal((prev) => ({ ...prev, show: false }));
                setActionLoading(true);
                try {
                    await deleteIdStore(storeId);
                    await loadStores(storePage);
                } catch (err) {
                    setError(err.response?.data?.message || 'Failed to delete ID store');
                } finally {
                    setActionLoading(false);
                }
            }
        });
    };

    const openCreateForm = () => {
        setFormData({ name: '', location: '', contact_email: '', contact_phone: '', instagram: '', tiktok: '', logo: '', show_store_info: false });
        setShowCreateForm(true);
    };

    const openEditForm = async (store) => {
        setEditingStore(store);
        setFormData({
            name: store.name,
            location: store.location || '',
            contact_email: store.contact_email || '',
            contact_phone: store.contact_phone || '',
            instagram: store.instagram || '',
            tiktok: store.tiktok || '',
            logo: '',
            show_store_info: !!store.show_store_info,
        });
        // Fetch the full store to load the logo (excluded from the list for performance)
        try {
            const full = await getIdStore(store.id);
            setFormData((prev) => ({ ...prev, logo: full.logo || '' }));
        } catch (e) { /* keep partial form */ }
    };

    // ==================== Generate (Excel upload) ====================

    const openGenerateForm = (store) => {
        setSelectedStore(store);
        setUploadFile(null);
        setUploadResult(null);
        setUploadError(null);
        setUploading(false);
        setDragActive(false);
        setShowGenerateForm(true);
    };

    const closeGenerateForm = () => {
        if (uploading) return;
        setShowGenerateForm(false);
        setUploadFile(null);
        setUploadResult(null);
        setUploadError(null);
    };

    const isValidFile = (file) => {
        if (!file) return false;
        const name = file.name.toLowerCase();
        return name.endsWith('.xlsx') || name.endsWith('.csv');
    };

    const handleFileSelected = (file) => {
        setUploadError(null);
        setUploadResult(null);
        if (!file) return;
        if (!isValidFile(file)) {
            setUploadError('Unsupported file type. Please choose an .xlsx or .csv file.');
            return;
        }
        setUploadFile(file);
    };

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); if (!uploading) setDragActive(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (uploading) return;
        handleFileSelected(e.dataTransfer.files && e.dataTransfer.files[0]);
    };

    const handleUpload = async () => {
        if (!uploadFile || !selectedStore) return;
        setUploading(true);
        setUploadError(null);
        setUploadResult(null);
        try {
            const result = await importIdCardsFile(selectedStore.id, uploadFile);
            setUploadResult(result);
            await loadStores(storePage);
        } catch (err) {
            setUploadError(err.response?.data?.error || err.response?.data?.message || 'Failed to import the file. Please check the format and try again.');
        } finally {
            setUploading(false);
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // ==================== Cards / export modal ====================

    const handleViewCards = async (store) => {
        setCurrentViewStoreId(store.id);
        setCardDesignExport('classic');
        // Load the full store (card design images are excluded from the list)
        let full = store;
        try { full = await getIdStore(store.id); } catch (e) { /* fall back to list data */ }
        setSelectedStore(full);
        setCustomFront(full.card_front_image || null);
        setCustomBack(full.card_back_image || null);
        await fetchStoreCards(store.id, 1);
    };

    // Upload + save a custom card design image (front/back) to the store.
    const handleCustomImageUpload = async (event, side) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || !selectedStore) return;
        const err = validateImageFile(file, 10 * 1024 * 1024);
        if (err) { setError(err); return; }
        setDesignSaving(true);
        setError(null);
        try {
            const dataUrl = await resizeImageToDataUrl(file, 1400, 1400, 0.9);
            const payload = side === 'front' ? { card_front_image: dataUrl } : { card_back_image: dataUrl };
            await updateIdStore(selectedStore.id, payload);
            if (side === 'front') setCustomFront(dataUrl); else setCustomBack(dataUrl);
        } catch (e) {
            setError('Failed to save the card image');
        } finally {
            setDesignSaving(false);
        }
    };

    const handleClearCustomImage = async (side) => {
        if (!selectedStore) return;
        setDesignSaving(true);
        try {
            const payload = side === 'front' ? { card_front_image: null } : { card_back_image: null };
            await updateIdStore(selectedStore.id, payload);
            if (side === 'front') setCustomFront(null); else setCustomBack(null);
        } catch (e) {
            setError('Failed to remove the card image');
        } finally {
            setDesignSaving(false);
        }
    };

    // Logo upload inside the create/edit store form (kept small, stored as data URL)
    const handleLogoFormUpload = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        const err = validateImageFile(file, 5 * 1024 * 1024);
        if (err) { setError(err); return; }
        try {
            const dataUrl = await resizeImageToDataUrl(file, 400, 400, 0.9);
            setFormData((prev) => ({ ...prev, logo: dataUrl }));
        } catch (e) {
            setError('Failed to process logo');
        }
    };

    // Full store form (shared by Create + Edit modals), grouped into clean sections.
    const renderStoreForm = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {/* Store details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                <div style={formSectionTitle}>Store Details</div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label>Store Name *</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="Enter store name" />
                </div>
                <div style={formGrid2}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Location / Address</label>
                        <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="City, Country" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Contact Phone</label>
                        <input type="text" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} placeholder="+1 555 000 0000" />
                    </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label>Contact Email</label>
                    <input type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} placeholder="store@example.com" />
                </div>
            </div>

            {/* Branding & social */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                <div style={formSectionTitle}>Branding &amp; Social</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
                    {formData.logo ? (
                        <img src={formData.logo} alt="logo" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border-color)' }} />
                    ) : (
                        <div style={{ width: 60, height: 60, borderRadius: 12, border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}><ImageIcon size={22} /></div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Store Logo</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Shown on the customer card page. Square image recommended.</div>
                    </div>
                    <label className="btn btn-secondary-enhanced" style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <Upload size={14} /> {formData.logo ? 'Change' : 'Upload'}
                        <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoFormUpload} style={{ display: 'none' }} />
                    </label>
                    {formData.logo && (
                        <button type="button" className="btn btn-ghost" style={{ color: 'var(--color-accent-red)', padding: '6px' }} onClick={() => setFormData({ ...formData, logo: '' })} title="Remove logo"><X size={16} /></button>
                    )}
                </div>
                <div style={formGrid2}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Instagram</label>
                        <input type="text" value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} placeholder="@username or link" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>TikTok</label>
                        <input type="text" value={formData.tiktok} onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })} placeholder="@username or link" />
                    </div>
                </div>
            </div>

            {/* Show store info toggle */}
            <button
                type="button"
                onClick={() => setFormData({ ...formData, show_store_info: !formData.show_store_info })}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: 'var(--border-radius-md)', background: formData.show_store_info ? 'rgba(0,122,255,0.08)' : 'var(--color-bg-secondary)', border: `1px solid ${formData.show_store_info ? 'var(--color-accent-blue)' : 'var(--border-color)'}`, transition: 'all 0.2s ease' }}
            >
                <div>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>Show store info on the card page</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Display logo, name, Instagram, TikTok, phone &amp; address to customers</div>
                </div>
                <span style={{ position: 'relative', width: 46, height: 26, borderRadius: 13, flexShrink: 0, background: formData.show_store_info ? 'var(--color-accent-blue)' : 'var(--color-bg-tertiary)', transition: 'background 0.2s ease' }}>
                    <span style={{ position: 'absolute', top: 3, left: formData.show_store_info ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s ease' }} />
                </span>
            </button>
        </div>
    );

    const fetchStoreCards = async (storeId, page = 1) => {
        setActionLoading(true);
        try {
            const data = await getIdStoreCards(storeId, page, GENERATED_PER_PAGE);

            let cards = [];
            let total = 0;
            let lastPage = 1;

            if (data.cards && data.cards.data) {
                cards = data.cards.data;
                total = data.cards.total || data.total_cards || 0;
                lastPage = data.cards.last_page || 1;
            } else if (Array.isArray(data.cards)) {
                cards = data.cards;
                total = cards.length;
            }

            if (cards.length > 0) {
                const transformed = cards.map((c) => ({ ...c, batchId: c.batch_id, createdAt: c.created_at }));
                setGeneratedCards(transformed);
                if (page === 1) setSelectedPreviewCard(transformed[0]);

                const grouped = transformed.reduce((acc, card) => {
                    const key = card.batchId || 'legacy';
                    if (!acc[key]) acc[key] = { cards: [], createdAt: card.createdAt };
                    acc[key].cards.push(card);
                    return acc;
                }, {});

                if (Array.isArray(data.batches)) {
                    const merged = { ...grouped };
                    data.batches.forEach((b) => {
                        if (!merged[b.batch_id]) {
                            merged[b.batch_id] = { cards: b.cards || [], createdAt: b.created_at, count: b.cards_count, isPartial: true };
                        } else {
                            merged[b.batch_id].count = b.cards_count;
                        }
                    });
                    setCardsByBatch(merged);
                } else {
                    setCardsByBatch(grouped);
                }

                setShowExportModal(true);
            } else if (page === 1) {
                setError('No cards found for this store. Generate some cards first.');
                setGeneratedCards([]);
                setCardsByBatch({});
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
        if (selectedStore) fetchStoreCards(selectedStore.id, page);
    };

    const fetchAllIdCards = async () => {
        if (!selectedStore) return generatedCards;
        let allCards = [];
        let page = 1;
        let lastPage = 1;
        do {
            const response = await getIdStoreCards(selectedStore.id, page, 100);
            if (response.cards && response.cards.data) {
                allCards = [...allCards, ...response.cards.data];
                lastPage = response.cards.last_page || 1;
            } else if (response.cards && Array.isArray(response.cards)) {
                allCards = [...allCards, ...response.cards];
                break;
            } else {
                break;
            }
            page++;
        } while (page <= lastPage && page < 1000);

        if (allCards.length > 0) setGeneratedCards(allCards);
        return allCards.length > 0 ? allCards : generatedCards;
    };

    const closeExportModal = () => {
        setShowExportModal(false);
        setGeneratedCards([]);
        setCardsByBatch({});
        setSelectedPreviewCard(null);
        setExportProgress(null);
    };

    // ==================== Store-level exports ====================

    const runExport = async (fn) => {
        setActionLoading(true);
        try {
            await fn();
        } catch (err) {
            console.error('Export failed:', err);
            setError('Export failed. Please try again.');
        } finally {
            setActionLoading(false);
            setExportProgress(null);
        }
    };

    const handleExportZip = () => runExport(async () => {
        if (generatedCards.length === 0) return;
        setExportProgress({ percentage: 0, status: 'creating-zip' });
        const allCards = await fetchAllIdCards();
        await downloadIdCardsZip(allCards, setExportProgress, cardDesignExport, qrLogo, { front: customFront, back: customBack });
    });

    const handleExportZipImages = () => runExport(async () => {
        if (generatedCards.length === 0) return;
        setExportProgress({ percentage: 0, status: 'creating-zip-images' });
        const allCards = await fetchAllIdCards();
        await downloadIdCardsImagesZip(allCards, setExportProgress, cardDesignExport, qrLogo, { front: customFront, back: customBack });
    });

    const handleExportPrintSheet = () => runExport(async () => {
        if (generatedCards.length === 0) return;
        setExportProgress({ percentage: 0, status: 'creating-sheet' });
        const allCards = await fetchAllIdCards();
        const widthMm = boardWidth ? parseFloat(boardWidth) * 10 : 900;
        const heightMm = boardHeight ? parseFloat(boardHeight) * 10 : 600;
        await downloadIdPrintSheetPDF(allCards, setExportProgress, widthMm, heightMm, cardDesignExport, qrLogo, { front: customFront, back: customBack });
    });

    const handleExportPrintSheetImage = () => runExport(async () => {
        if (generatedCards.length === 0) return;
        setExportProgress({ percentage: 0, status: 'creating-image' });
        const allCards = await fetchAllIdCards();
        const widthMm = boardWidth ? parseFloat(boardWidth) * 10 : 900;
        const heightMm = boardHeight ? parseFloat(boardHeight) * 10 : 600;
        await downloadIdPrintSheetImage(allCards, setExportProgress, widthMm, heightMm, cardDesignExport, qrLogo, { front: customFront, back: customBack });
    });

    const handleExportCardBackPrintSheet = () => runExport(async () => {
        const cardsToExport = cardBackCount ? generatedCards.slice(0, parseInt(cardBackCount, 10)) : generatedCards;
        if (cardsToExport.length === 0) return;
        setExportProgress({ percentage: 0, status: 'creating-cardback-sheet' });
        const widthMm = boardWidth ? parseFloat(boardWidth) * 10 : 600;
        const heightMm = boardHeight ? parseFloat(boardHeight) * 10 : 900;
        await downloadIdCardBackPrintSheetImage(cardsToExport, setExportProgress, widthMm, heightMm, cardDesignExport, { front: customFront, back: customBack });
    });

    const handleExportCardBacksImages = () => runExport(async () => {
        const count = cardBackCount ? parseInt(cardBackCount, 10) : generatedCards.length;
        if (count <= 0) return;
        setExportProgress({ percentage: 0, status: 'creating-cardback-zip' });
        await downloadIdCardBacksImagesZip(count, setExportProgress, cardDesignExport, { front: customFront, back: customBack });
    });

    const handleDownloadCardPDF = async (card) => {
        try {
            await downloadIdCardPDF(card, qrLogo, cardDesignExport, { front: customFront, back: customBack });
        } catch (err) {
            setError('Failed to download PDF');
        }
    };

    const handleQrLogoUpload = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return; }
            if (file.size > 2 * 1024 * 1024) { setError('QR logo must be under 2MB'); return; }
            const reader = new FileReader();
            reader.onload = (e) => setQrLogo(e.target.result);
            reader.readAsDataURL(file);
        }
        event.target.value = '';
    };

    // ==================== Batch helpers ====================

    const ensureFullBatch = async (batchId) => {
        const batch = cardsByBatch[batchId];
        if (!batch) return [];
        let cardsToExport = batch.cards;
        if (batch.isPartial || cardsToExport.length < (batch.count || 0)) {
            let all = [];
            let page = 1;
            let lastPage = 1;
            do {
                const response = await getIdBatchCards(selectedStore.id, batchId, page, 1000);
                if (response.cards) {
                    const newCards = response.cards.data || response.cards;
                    all = [...all, ...newCards];
                    lastPage = response.cards.last_page || 1;
                } else break;
                page++;
            } while (page <= lastPage && page < 1000);

            if (all.length > 0) {
                cardsToExport = all;
                setCardsByBatch((prev) => ({ ...prev, [batchId]: { ...prev[batchId], cards: all, isPartial: false } }));
            }
        }
        return cardsToExport;
    };

    const handleExportBatchZipImages = (batchId) => runExport(async () => {
        const cardsToExport = await ensureFullBatch(batchId);
        if (cardsToExport.length === 0) return;
        setExportProgress({ percentage: 0, status: 'creating-zip-images' });
        await downloadIdCardsImagesZip(cardsToExport, setExportProgress, cardDesignExport, qrLogo, { front: customFront, back: customBack });
    });

    const handleExportBatchPrintSheet = (batchId) => runExport(async () => {
        const cardsToExport = await ensureFullBatch(batchId);
        if (cardsToExport.length === 0) return;
        setExportProgress({ percentage: 0, status: 'creating-sheet' });
        const widthMm = boardWidth ? parseFloat(boardWidth) * 10 : 900;
        const heightMm = boardHeight ? parseFloat(boardHeight) * 10 : 600;
        await downloadIdPrintSheetPDF(cardsToExport, setExportProgress, widthMm, heightMm, cardDesignExport, qrLogo, { front: customFront, back: customBack });
    });

    const handleExportBatchPrintSheetImage = (batchId) => runExport(async () => {
        const cardsToExport = await ensureFullBatch(batchId);
        if (cardsToExport.length === 0) return;
        setExportProgress({ percentage: 0, status: 'creating-image' });
        const widthMm = boardWidth ? parseFloat(boardWidth) * 10 : 900;
        const heightMm = boardHeight ? parseFloat(boardHeight) * 10 : 600;
        await downloadIdPrintSheetImage(cardsToExport, setExportProgress, widthMm, heightMm, cardDesignExport, qrLogo, { front: customFront, back: customBack });
    });

    const handleExportBatchCardBackPrintSheet = (batchId) => runExport(async () => {
        const cardsToExport = await ensureFullBatch(batchId);
        if (cardsToExport.length === 0) return;
        setExportProgress({ percentage: 0, status: 'creating-cardback-sheet' });
        const widthMm = boardWidth ? parseFloat(boardWidth) * 10 : 600;
        const heightMm = boardHeight ? parseFloat(boardHeight) * 10 : 900;
        await downloadIdCardBackPrintSheetImage(cardsToExport, setExportProgress, widthMm, heightMm, cardDesignExport, { front: customFront, back: customBack });
    });

    const handleDeleteBatch = (batchId, count) => {
        setConfirmModal({
            show: true,
            title: 'Delete Batch',
            message: `Delete all ${count || ''} cards in this batch? This cannot be undone.`,
            type: 'danger',
            confirmText: 'Delete Batch',
            onConfirm: async () => {
                setConfirmModal((prev) => ({ ...prev, show: false }));
                setActionLoading(true);
                try {
                    await deleteIdBatch(selectedStore.id, batchId);
                    await fetchStoreCards(selectedStore.id, 1);
                    await loadStores(storePage);
                } catch (err) {
                    setError(err.response?.data?.message || 'Failed to delete batch');
                } finally {
                    setActionLoading(false);
                }
            }
        });
    };

    const viewBatchAccounts = async (batchId, page = 1, search = batchSearchQuery) => {
        setBatchAccountsPage(page);
        setActionLoading(true);
        try {
            const storeId = currentViewStoreId || selectedStore?.id;
            if (!storeId) { setError('Cannot fetch batch: Store ID missing'); return; }
            const data = await getIdBatchCards(storeId, batchId, page, BATCH_ACCOUNTS_PER_PAGE, search);
            setCardsByBatch((prev) => ({
                ...prev,
                [batchId]: {
                    ...prev[batchId],
                    cards: data.cards.data,
                    total: data.cards.total,
                    currentPage: data.cards.current_page,
                    lastPage: data.cards.last_page,
                    isPartial: data.cards.total > data.cards.data.length
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

    // ==================== Store lock + CSV ====================

    const handleStoreLockToggle = (store) => {
        const isLocked = store.is_locked;
        setConfirmModal({
            show: true,
            title: isLocked ? 'Unlock Store' : 'Lock Store',
            message: isLocked
                ? `Unlock store "${store.name}"? Cards will become accessible again.`
                : `Lock store "${store.name}"? All ${store.cards_count} cards will become inaccessible.`,
            type: isLocked ? 'success' : 'danger',
            confirmText: isLocked ? 'Unlock' : 'Lock',
            onConfirm: async () => {
                setConfirmModal((prev) => ({ ...prev, show: false }));
                setActionLoading(true);
                try {
                    if (isLocked) await unlockIdStoreCards(store.id);
                    else await lockIdStoreCards(store.id);
                    await loadStores(storePage);
                } catch (err) {
                    setError(err.response?.data?.message || 'Failed to update lock status');
                } finally {
                    setActionLoading(false);
                }
            }
        });
    };

    const csvEscape = (val) => `"${(val === null || val === undefined ? '' : String(val)).replace(/"/g, '""')}"`;

    const handleExportCsv = async () => {
        if (!selectedStore) return;
        setExportingCsv(true);
        try {
            const all = await fetchAllIdCards();
            const header = ['Email', 'Password', 'Phone', 'Serial Number', 'OutAPI', 'Status', 'Created'];
            const rows = all.map((c) => [
                c.email, c.password, c.phone_number, c.serial_number, c.outapi,
                c.is_locked ? 'Locked' : 'Active',
                c.created_at ? new Date(c.created_at).toLocaleString('en-CA') : ''
            ].map(csvEscape).join(','));
            const csv = [header.map(csvEscape).join(','), ...rows].join('\r\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const safeName = (selectedStore.name || 'id-store').replace(/[^a-z0-9]+/gi, '_');
            link.setAttribute('download', `${safeName}_id_cards.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError('Failed to export CSV');
        } finally {
            setExportingCsv(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                <div className="spinner"></div>
                <p>Loading ID stores...</p>
            </div>
        );
    }

    const exportBtnStyle = { flex: 1, minWidth: '200px' };

    return (
        <>
            <div className="store-management wallet-store-management">
                {/* Batch Accounts Modal */}
                {selectedBatchId && cardsByBatch[selectedBatchId] && (() => {
                    const currentBatch = cardsByBatch[selectedBatchId];
                    const paginatedCards = currentBatch.cards || [];
                    const totalBatchPages = currentBatch.lastPage || 1;
                    const totalBatchItems = currentBatch.total || 0;

                    return (
                        <div className="modal-overlay" style={{ zIndex: 1200 }}>
                            <div className="modal-content" style={{ maxWidth: '900px', width: '100%', maxHeight: '85vh', background: 'var(--color-bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-xl)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                    <h3 style={{ margin: 0 }}><List size={20} style={{ marginRight: 'var(--spacing-sm)', verticalAlign: 'middle' }} /> Batch Accounts</h3>
                                    <button onClick={() => { setSelectedBatchId(null); setBatchSearchQuery(''); setBatchAccountsPage(1); }} className="btn btn-ghost" style={{ padding: 'var(--spacing-xs)' }}><X size={20} /></button>
                                </div>

                                <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)', marginBottom: 'var(--spacing-md)' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                                        <input
                                            type="text"
                                            placeholder="Search by email, phone, or serial..."
                                            value={batchSearchQuery}
                                            onChange={(e) => { const val = e.target.value; setBatchSearchQuery(val); viewBatchAccounts(selectedBatchId, 1, val); }}
                                            style={{ width: '100%', padding: 'var(--spacing-md)', paddingLeft: '40px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-bg-primary)', fontFamily: 'monospace' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', position: 'relative' }}>
                                    {actionLoading && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}><div className="spinner"></div></div>
                                    )}
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--color-bg-secondary)', position: 'sticky', top: 0 }}>
                                                <th style={thStyle}>Email</th>
                                                <th style={thStyle}>Password</th>
                                                <th style={thStyle}>Phone</th>
                                                <th style={thStyle}>Serial Number</th>
                                                <th style={thStyle}>OutAPI</th>
                                                <th style={thStyle}>Created</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedCards.map((card, index) => (
                                                <tr key={card.id || index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ ...tdStyle, fontWeight: 500 }}>{card.email}</td>
                                                    <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--color-accent-purple)' }}>{card.password || '***'}</td>
                                                    <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{card.phone_number || '—'}</td>
                                                    <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{card.serial_number || 'N/A'}</td>
                                                    <td style={tdStyle}>
                                                        {card.outapi ? (
                                                            <a href={card.outapi} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent-blue)', display: 'inline-flex', alignItems: 'center', gap: '4px' }} title={card.outapi}><ExternalLink size={14} /> Link</a>
                                                        ) : '—'}
                                                    </td>
                                                    <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>{card.created_at ? new Date(card.created_at).toLocaleDateString('en-CA') : 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <Pagination
                                    currentPage={batchAccountsPage}
                                    totalPages={totalBatchPages}
                                    onPageChange={(page) => viewBatchAccounts(selectedBatchId, page)}
                                    totalItems={totalBatchItems}
                                    itemsPerPage={BATCH_ACCOUNTS_PER_PAGE}
                                />

                                <div style={{ marginTop: 'var(--spacing-md)', textAlign: 'right' }}>
                                    <button onClick={() => { setSelectedBatchId(null); setBatchSearchQuery(''); setBatchAccountsPage(1); }} className="btn btn-primary-enhanced">Close</button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Export Modal */}
                {showExportModal && generatedCards.length > 0 && (
                    <div className="modal-overlay">
                        <div className="modal" style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
                            <div className="modal-header">
                                <h3>
                                    <CreditCard size={20} style={{ color: 'var(--color-accent-blue)', marginRight: '8px', verticalAlign: 'middle' }} />
                                    {selectedStore?.name} — ID Cards ({totalCards})
                                </h3>
                                <button onClick={closeExportModal}><X size={20} /></button>
                            </div>

                            <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                                {/* Card Design Selector */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Card Design:</span>
                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flex: 1, flexWrap: 'wrap' }}>
                                            <button onClick={() => setCardDesignExport('classic')} className={`btn ${cardDesignExport === 'classic' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, fontSize: 'var(--font-size-sm)', minWidth: '120px' }}>🌙 Classic (Dark)</button>
                                            <button onClick={() => setCardDesignExport('light')} className={`btn ${cardDesignExport === 'light' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, fontSize: 'var(--font-size-sm)', minWidth: '120px' }}>☀️ Elegant (Light)</button>
                                            <button onClick={() => setCardDesignExport('custom')} className={`btn ${cardDesignExport === 'custom' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, fontSize: 'var(--font-size-sm)', minWidth: '120px' }}>🖼️ Custom (Image)</button>
                                        </div>
                                    </div>

                                    {cardDesignExport === 'custom' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                                                Upload your own front & back artwork. Recommended size <strong>1012 × 638 px</strong> (CR80 card, ~1.6∶1), max 10MB. Images are stored on the store.
                                            </div>
                                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                                                {['front', 'back'].map((side) => {
                                                    const img = side === 'front' ? customFront : customBack;
                                                    const ref = side === 'front' ? customFrontRef : customBackRef;
                                                    return (
                                                        <div key={side} style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{side === 'front' ? 'Front image' : 'Back image'}</label>
                                                            <div
                                                                onClick={() => !designSaving && ref.current?.click()}
                                                                style={{ position: 'relative', border: `2px dashed ${img ? 'var(--color-accent-blue)' : 'var(--border-color)'}`, borderRadius: 'var(--border-radius-md)', background: 'var(--color-bg-primary)', cursor: designSaving ? 'wait' : 'pointer', aspectRatio: '1.6 / 1', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            >
                                                                <input ref={ref} type="file" accept="image/*" onChange={(e) => handleCustomImageUpload(e, side)} style={{ display: 'none' }} />
                                                                {img ? (
                                                                    <img src={img} alt={`${side}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                ) : (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                                                                        <ImageIcon size={22} /> Click to upload
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {img && (
                                                                <button onClick={() => handleClearCustomImage(side)} className="btn btn-ghost" disabled={designSaving} style={{ color: 'var(--color-accent-red)', fontSize: 'var(--font-size-xs)', alignSelf: 'flex-start', padding: '2px 6px' }}>
                                                                    <X size={12} /> Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {designSaving && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent-blue)' }}>Saving design…</div>}
                                        </div>
                                    )}
                                </div>

                                {/* Export Progress */}
                                {exportProgress && (
                                    <div style={{ padding: 'var(--spacing-md)', background: 'linear-gradient(135deg, rgba(0,122,255,0.1) 0%, rgba(88,86,214,0.1) 100%)', borderRadius: 'var(--border-radius-md)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                                            <span>{statusLabel(exportProgress.status)}</span>
                                            <span>{exportProgress.percentage || 0}%</span>
                                        </div>
                                        <div style={{ height: '4px', background: 'var(--color-bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${exportProgress.percentage || 0}%`, background: 'var(--gradient-primary, linear-gradient(135deg,#007AFF,#5856D6))', transition: 'width 0.3s' }}></div>
                                        </div>
                                    </div>
                                )}

                                {/* Export Actions */}
                                <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                                    <button onClick={handleExportZip} className="btn btn-success-enhanced" disabled={actionLoading} style={exportBtnStyle}>
                                        <FileArchive size={18} /> {exportProgress?.status === 'creating-zip' ? `${exportProgress.percentage}%...` : `Download All as ZIP (PDFs)`}
                                    </button>
                                    <button onClick={handleExportZipImages} className="btn btn-info-enhanced" disabled={actionLoading} style={exportBtnStyle}>
                                        <FileArchive size={18} /> {exportProgress?.status === 'creating-zip-images' ? `${exportProgress.percentage}%...` : `ZIP (Images Only)`}
                                    </button>
                                    <button onClick={handleExportPrintSheet} className="btn btn-secondary-enhanced" disabled={actionLoading} style={exportBtnStyle}>
                                        <Printer size={18} /> {exportProgress?.status === 'creating-sheet' ? `${exportProgress.percentage}%...` : 'Print Sheet (PDF)'}
                                    </button>
                                    <button onClick={handleExportPrintSheetImage} className="btn btn-primary-enhanced" disabled={actionLoading} style={exportBtnStyle}>
                                        <FileArchive size={18} /> {exportProgress?.status === 'creating-image' ? `${exportProgress.percentage}%...` : 'Download Print Sheet Image'}
                                    </button>
                                    <button onClick={handleExportCardBackPrintSheet} className="btn btn-purple-enhanced" disabled={actionLoading} style={exportBtnStyle}>
                                        <Printer size={18} /> {exportProgress?.status === 'creating-cardback-sheet' ? `${exportProgress.percentage}%...` : 'Card Backs Sheet (Image)'}
                                    </button>
                                    <button onClick={handleExportCardBacksImages} className="btn btn-purple-enhanced" disabled={actionLoading} style={exportBtnStyle}>
                                        <FileArchive size={18} /> {exportProgress?.status === 'creating-cardback-zip' ? `${exportProgress.percentage}%...` : 'ZIP Card Backs (Images)'}
                                    </button>
                                    <button onClick={handleExportCsv} className="btn btn-secondary-enhanced" disabled={exportingCsv} style={exportBtnStyle}>
                                        <Download size={18} /> {exportingCsv ? 'Exporting...' : 'Export CSV (credentials)'}
                                    </button>
                                </div>

                                {/* Print Sheet Settings */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                        <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Card Backs Count</label>
                                        <input type="number" placeholder={String(generatedCards.length)} value={cardBackCount} onChange={(e) => setCardBackCount(e.target.value)} min="1" max="5000" style={inputStyle} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                        <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Print Sheet Width (cm)</label>
                                        <input type="number" placeholder="90" value={boardWidth} onChange={(e) => setBoardWidth(e.target.value)} style={inputStyle} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                        <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Print Sheet Height (cm)</label>
                                        <input type="number" placeholder="60" value={boardHeight} onChange={(e) => setBoardHeight(e.target.value)} style={inputStyle} />
                                    </div>
                                </div>

                                {/* Previews */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                                    <Card hover={false}>
                                        <Card.Header>
                                            <Eye size={18} style={{ color: 'var(--color-accent-green)' }} />
                                            <span>Card Preview</span>
                                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--spacing-xs)' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: 'var(--spacing-xs) var(--spacing-sm)', background: qrLogo ? 'rgba(0,122,255,0.15)' : 'var(--color-bg-tertiary)', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', fontSize: 'var(--font-size-xs)', color: qrLogo ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)' }}>
                                                    <Upload size={14} /> {qrLogo ? 'QR Logo ✓' : 'QR Logo'}
                                                    <input type="file" accept="image/*" onChange={handleQrLogoUpload} style={{ display: 'none' }} />
                                                </label>
                                                {qrLogo && (
                                                    <button onClick={() => setQrLogo(null)} style={{ display: 'flex', alignItems: 'center', padding: 'var(--spacing-xs)', background: 'rgba(255,59,48,0.1)', border: 'none', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', color: 'var(--color-accent-red)' }}><X size={14} /></button>
                                                )}
                                            </div>
                                        </Card.Header>
                                        <Card.Body style={{ padding: 'var(--spacing-md)', display: 'flex', justifyContent: 'center' }}>
                                            {selectedPreviewCard && (
                                                <div style={{ transform: 'scale(0.85)', transformOrigin: 'center' }}>
                                                    {cardDesignExport === 'custom' ? <IdCardCustom card={selectedPreviewCard} image={customFront} qrLogo={qrLogo} /> : cardDesignExport === 'light' ? <IdCardLight card={selectedPreviewCard} qrLogo={qrLogo} /> : <IdCard card={selectedPreviewCard} qrLogo={qrLogo} />}
                                                </div>
                                            )}
                                        </Card.Body>
                                    </Card>

                                    <Card hover={false}>
                                        <Card.Header>
                                            <Eye size={18} style={{ color: 'var(--color-accent-purple)' }} />
                                            <span>Card Back Preview</span>
                                        </Card.Header>
                                        <Card.Body style={{ padding: 'var(--spacing-md)', display: 'flex', justifyContent: 'center' }}>
                                            <div style={{ transform: 'scale(0.85)', transformOrigin: 'center' }}>
                                                {cardDesignExport === 'custom' ? <IdCardBackCustom image={customBack} /> : cardDesignExport === 'light' ? <IdCardBackLight /> : <IdCardBack />}
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </div>

                                {/* Generated Cards list */}
                                <Card hover={false}>
                                    <Card.Header>
                                        <CreditCard size={18} style={{ color: 'var(--color-accent-blue)' }} />
                                        <span>Generated Cards ({totalCards})</span>
                                    </Card.Header>
                                    <Card.Body>
                                        <div style={{ maxHeight: '400px', overflow: 'auto', marginBottom: 'var(--spacing-md)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                                {generatedCards.map((card, index) => (
                                                    <div key={card.id || index} onClick={() => setSelectedPreviewCard(card)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-sm) var(--spacing-md)', background: selectedPreviewCard?.id === card.id ? 'var(--color-bg-tertiary)' : 'transparent', borderRadius: 'var(--border-radius-md)', cursor: 'pointer' }}>
                                                        <span style={{ color: 'var(--color-text-tertiary)', width: '30px' }}>#{((currentPage - 1) * GENERATED_PER_PAGE) + index + 1}</span>
                                                        <span style={{ fontWeight: 500, flex: 1, wordBreak: 'break-all' }}>{card.email}</span>
                                                        <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>{card.serial_number}</span>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDownloadCardPDF(card); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-xs)', background: 'var(--color-bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', color: 'var(--color-accent-blue)' }} title="Download PDF"><Download size={14} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {totalPages > 1 && (
                                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-md)' }}>
                                                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} totalItems={totalCards} itemsPerPage={GENERATED_PER_PAGE} />
                                            </div>
                                        )}
                                    </Card.Body>
                                </Card>

                                {/* Card Batches */}
                                {Object.keys(cardsByBatch).length > 0 && (
                                    <Card hover={false}>
                                        <Card.Header>
                                            <FileArchive size={18} style={{ color: 'var(--color-accent-purple)' }} />
                                            <span>Card Batches ({Object.keys(cardsByBatch).length})</span>
                                        </Card.Header>
                                        <Card.Body style={{ maxHeight: '260px', overflow: 'auto' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                                {Object.entries(cardsByBatch).map(([batchId, batch], index) => (
                                                    <div key={batchId} style={{ padding: 'var(--spacing-md)', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                                                            <div>
                                                                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>{batchId === 'legacy' ? 'Legacy Cards' : `Batch ${Object.keys(cardsByBatch).length - index}`}</span>
                                                                <span style={{ marginLeft: 'var(--spacing-sm)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>({batch.count || batch.cards.length} cards)</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                                                <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>{batch.createdAt ? new Date(batch.createdAt).toLocaleString() : ''}</span>
                                                                <button onClick={() => handleDeleteBatch(batchId, batch.count || batch.cards.length)} className="btn btn-ghost" title="Delete batch" style={{ padding: '2px', color: 'var(--color-accent-red)' }} disabled={actionLoading}><Trash2 size={14} /></button>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                                                            <button onClick={() => handleExportBatchZipImages(batchId)} className="btn btn-info-enhanced" disabled={actionLoading} style={{ flex: 1, fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)', minWidth: '120px' }}><FileArchive size={14} /> Images ZIP</button>
                                                            <button onClick={() => handleExportBatchPrintSheet(batchId)} className="btn btn-secondary-enhanced" disabled={actionLoading} style={{ flex: 1, fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)', minWidth: '120px' }}><Printer size={14} /> Print Sheet</button>
                                                            <button onClick={() => handleExportBatchPrintSheetImage(batchId)} className="btn btn-primary-enhanced" disabled={actionLoading} style={{ flex: 1, fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)', minWidth: '120px' }}><FileArchive size={14} /> Print Sheet (Img)</button>
                                                            <button onClick={() => handleExportBatchCardBackPrintSheet(batchId)} className="btn btn-purple-enhanced" disabled={actionLoading} style={{ flex: 1, fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)', minWidth: '120px' }}><Printer size={14} /> Card Backs</button>
                                                            <button onClick={() => viewBatchAccounts(batchId)} className="btn btn-primary-enhanced" disabled={actionLoading} style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)', minWidth: '120px' }}><List size={14} /> View Accounts</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card.Body>
                                    </Card>
                                )}

                                <div className="modal-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-lg)' }}>
                                    <button onClick={closeExportModal} className="btn btn-primary-enhanced">Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Section Header */}
                <div className="section-header">
                    <h2>ID Cards</h2>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                            <input
                                type="text"
                                placeholder="Search ID stores..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ padding: '8px 12px 8px 36px', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)', background: 'var(--color-bg-primary)', fontSize: 'var(--font-size-sm)', width: '240px' }}
                            />
                        </div>
                        <button onClick={() => { const newOrder = sortOrder === 'desc' ? 'asc' : 'desc'; setSortOrder(newOrder); localStorage.setItem('idStoresSortOrder', newOrder); }} className="btn btn-ghost" title={sortOrder === 'desc' ? 'Showing newest first' : 'Showing oldest first'} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                            {sortOrder === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
                        </button>
                        <button onClick={openCreateForm} className="btn btn-accent" disabled={actionLoading}><Plus size={18} /> Add Store</button>
                    </div>
                </div>

                {error && (
                    <div className="error-banner">
                        <AlertCircle size={18} /> {error}
                        <button onClick={() => setError(null)}><X size={16} /></button>
                    </div>
                )}

                {/* Create Store Modal */}
                {showCreateForm && (
                    <div className="modal-overlay">
                        <div className="modal" style={{ maxWidth: '620px' }}>
                            <div className="modal-header">
                                <h3>Create ID Store</h3>
                                <button onClick={() => setShowCreateForm(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleCreateStore}>
                                <div className="modal-body" style={{ maxHeight: '70vh', overflow: 'auto' }}>
                                    {renderStoreForm()}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-ghost">Cancel</button>
                                    <button type="submit" className="btn btn-primary-enhanced" disabled={actionLoading}>{actionLoading ? 'Creating...' : 'Create Store'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Store Modal */}
                {editingStore && (
                    <div className="modal-overlay">
                        <div className="modal" style={{ maxWidth: '620px' }}>
                            <div className="modal-header">
                                <h3>Edit ID Store</h3>
                                <button onClick={() => setEditingStore(null)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleUpdateStore}>
                                <div className="modal-body" style={{ maxHeight: '80vh', overflow: 'auto' }}>
                                    {renderStoreForm()}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" onClick={() => setEditingStore(null)} className="btn btn-ghost">Cancel</button>
                                    <button type="submit" className="btn btn-primary-enhanced" disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Save Changes'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Generate ID Cards (Excel upload) Modal */}
                {showGenerateForm && selectedStore && (
                    <div className="modal-overlay" onClick={closeGenerateForm}>
                        <div className="modal" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Generate ID Cards for {selectedStore.name}</h3>
                                <button onClick={closeGenerateForm} disabled={uploading}><X size={20} /></button>
                            </div>
                            <div className="modal-body">
                                {!uploadResult ? (
                                    <>
                                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 0, marginBottom: 'var(--spacing-md)' }}>
                                            Upload an Excel (<code>.xlsx</code>) or CSV file with columns in the order:
                                            <strong> email, password, phone number, outapi</strong>. Each row becomes one ID card.
                                        </p>
                                        <div
                                            onDragOver={handleDragOver}
                                            onDragEnter={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            onClick={() => !uploading && fileInputRef.current?.click()}
                                            style={{ border: `2px dashed ${dragActive ? 'var(--color-accent-blue)' : 'var(--border-color)'}`, borderRadius: 'var(--border-radius-lg)', background: dragActive ? 'rgba(0,122,255,0.06)' : 'var(--color-bg-secondary)', padding: 'var(--spacing-xl)', textAlign: 'center', cursor: uploading ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-sm)' }}
                                        >
                                            <input ref={fileInputRef} type="file" accept=".xlsx,.csv" onChange={(e) => handleFileSelected(e.target.files && e.target.files[0])} style={{ display: 'none' }} />
                                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(0,122,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent-blue)' }}>
                                                {uploadFile ? <FileText size={26} /> : <Upload size={26} />}
                                            </div>
                                            {uploadFile ? (
                                                <>
                                                    <div style={{ fontWeight: 600 }}>{uploadFile.name}</div>
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{formatBytes(uploadFile.size)} • Click to choose a different file</div>
                                                </>
                                            ) : (
                                                <>
                                                    <div style={{ fontWeight: 600 }}>Drag &amp; drop your file here</div>
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>or click to browse — .xlsx or .csv</div>
                                                </>
                                            )}
                                        </div>
                                        {uploadError && (
                                            <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-red)', fontSize: 'var(--font-size-sm)' }}>
                                                <AlertCircle size={16} /> {uploadError}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-accent-green)' }}>
                                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(52,199,89,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={24} /></div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>{uploadResult.created_count} cards generated</div>
                                                {uploadResult.skipped_count > 0 && (<div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{uploadResult.skipped_count} row(s) skipped</div>)}
                                            </div>
                                        </div>
                                        {uploadResult.skipped_count > 0 && Array.isArray(uploadResult.skipped) && uploadResult.skipped.length > 0 && (
                                            <div style={{ maxHeight: '160px', overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-sm)' }}>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: '6px' }}>Skipped rows:</div>
                                                {uploadResult.skipped.map((s, i) => (
                                                    <div key={i} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Row {s.row}{s.email ? ` (${s.email})` : ''} — {s.reason}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                {!uploadResult ? (
                                    <>
                                        <button type="button" onClick={closeGenerateForm} className="btn btn-ghost" disabled={uploading}>Cancel</button>
                                        <button type="button" onClick={handleUpload} className="btn btn-primary-enhanced" disabled={uploading || !uploadFile}>{uploading ? 'Generating...' : 'Generate Cards'}</button>
                                    </>
                                ) : (
                                    <>
                                        <button type="button" className="btn btn-ghost" onClick={() => { setUploadResult(null); setUploadFile(null); setUploadError(null); }}>Upload Another</button>
                                        <button type="button" className="btn btn-primary-enhanced" onClick={() => { const store = selectedStore; setShowGenerateForm(false); setUploadFile(null); setUploadResult(null); const fresh = stores.find((s) => s.id === store.id) || store; handleViewCards(fresh); }}>View / Export Cards</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Store Grid */}
                {stores.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon wallet-empty-icon"><CreditCard size={48} /></div>
                        <h3>No ID Stores Yet</h3>
                        <p>Create your first ID store, then generate cards by uploading an Excel file.</p>
                        <button onClick={openCreateForm} className="btn btn-primary-enhanced"><Plus size={18} /> Create First Store</button>
                    </div>
                ) : (
                    <div className="stores-grid">
                        {stores.map((store) => (
                            <div key={store.id} className="store-card wallet-store-card">
                                <div className="store-card-header">
                                    <div className="store-icon wallet-store-icon"><CreditCard size={24} /></div>
                                    <div className="store-actions">
                                        <button onClick={() => openEditForm(store)} title="Edit"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeleteStore(store.id)} title="Delete" className="danger"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <div className="store-card-body">
                                    <h3>{store.name}</h3>
                                    {store.location && <p className="store-location">{store.location}</p>}
                                </div>
                                <div className="store-card-stats">
                                    <div className="stat"><span className="stat-value">{formatNumber(store.cards_count || 0)}</span><span className="stat-label">Total</span></div>
                                    <div className="stat"><span className="stat-value active">{formatNumber(store.unlocked_cards_count || 0)}</span><span className="stat-label">Unlocked</span></div>
                                    <div className="stat"><span className="stat-value inactive">{formatNumber(store.locked_cards_count || 0)}</span><span className="stat-label">Locked</span></div>
                                </div>
                                <div className="store-card-footer" style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                                    <button onClick={() => handleViewCards(store)} className="btn btn-secondary-enhanced" style={{ flex: 1 }} disabled={actionLoading || (store.cards_count || 0) === 0}><List size={16} /> View Cards</button>
                                    <button onClick={() => openGenerateForm(store)} className="btn btn-primary-enhanced" style={{ flex: 1 }}><Upload size={16} /> Generate</button>
                                    {(store.cards_count || 0) > 0 && (
                                        <button onClick={() => handleStoreLockToggle(store)} className={`btn ${store.is_locked ? 'btn-secondary-enhanced' : 'btn-ghost'}`} style={{ flex: 1, color: store.is_locked ? 'var(--color-accent-green)' : 'var(--color-accent-red)', borderColor: store.is_locked ? 'var(--color-accent-green)' : 'var(--color-accent-red)' }} disabled={actionLoading} title={store.is_locked ? 'Unlock store' : 'Lock store'}>
                                            {store.is_locked ? <Unlock size={16} /> : <Lock size={16} />}
                                            {store.is_locked ? 'Unlock' : 'Lock'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Store List Pagination */}
                {stores.length > 0 && (
                    <div style={{ marginTop: 'var(--spacing-xl)', textAlign: 'center' }}>
                        <Pagination currentPage={storePage} totalPages={totalStorePages} onPageChange={setStorePage} totalItems={totalStores} itemsPerPage={STORES_PER_PAGE} />
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmModal.show && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 'var(--spacing-lg)' }}>
                    <div style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--border-radius-lg)', maxWidth: '420px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                        <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: confirmModal.type === 'danger' ? 'rgba(255,59,48,0.12)' : confirmModal.type === 'success' ? 'rgba(52,199,89,0.12)' : 'rgba(255,149,0,0.12)' }}>
                                {confirmModal.type === 'danger' ? <AlertCircle size={28} style={{ color: 'var(--color-accent-red)' }} /> : confirmModal.type === 'success' ? <Unlock size={28} style={{ color: 'var(--color-accent-green)' }} /> : <Lock size={28} style={{ color: 'var(--color-accent-orange, #ff9500)' }} />}
                            </div>
                            <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'center' }}>{confirmModal.title}</h3>
                            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', textAlign: 'center', lineHeight: '1.5' }}>{confirmModal.message}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', padding: 'var(--spacing-md) var(--spacing-lg)', borderTop: '1px solid var(--border-color)', background: 'var(--color-bg-secondary)' }}>
                            <button onClick={() => setConfirmModal((prev) => ({ ...prev, show: false }))} className="btn btn-secondary-enhanced" style={{ flex: 1, padding: '10px' }}>Cancel</button>
                            <button onClick={confirmModal.onConfirm} className="btn" style={{ flex: 1, padding: '10px', fontWeight: 600, color: '#fff', border: 'none', background: confirmModal.type === 'danger' ? 'var(--color-accent-red)' : confirmModal.type === 'success' ? 'var(--color-accent-green)' : 'var(--color-accent-orange, #ff9500)' }}>{confirmModal.confirmText || 'Confirm'}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const thStyle = { padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontSize: 'var(--font-size-sm)', fontWeight: 600, whiteSpace: 'nowrap' };
const tdStyle = { padding: 'var(--spacing-sm) var(--spacing-md)', fontSize: 'var(--font-size-sm)' };
const inputStyle = { padding: 'var(--spacing-sm) var(--spacing-md)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-bg-primary)', fontSize: 'var(--font-size-md)' };
const formSectionTitle = { fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)' };
const formGrid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' };

export default IdStoreManagement;
