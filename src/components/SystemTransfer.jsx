import React, { useState, useEffect, useCallback } from 'react';
import { getSystemCards, getStores, transferSystemCards } from '../services/api';
import { getWalletSystemCards, transferWalletCards, getWalletStores } from '../services/walletApi';
import Card from './ui/Card';
import {
    ArrowRightLeft, Store, Check, CheckSquare, Square, AlertCircle,
    RefreshCw, X, Package, Search, CreditCard, Wallet
} from 'lucide-react';

/**
 * System Transfer Component
 * Transfer system-generated cards to existing stores with checkbox selection
 * Supports both regular cards and wallet cards with a toggle
 */
const SystemTransfer = () => {
    // Card type toggle
    const [cardType, setCardType] = useState(() => {
        const saved = localStorage.getItem('transferCardType');
        return saved || 'regular';
    });

    // State for cards and stores
    const [cards, setCards] = useState([]);
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Selection state
    const [selectedCardIds, setSelectedCardIds] = useState(new Set());
    const [targetStoreId, setTargetStoreId] = useState('');

    // UI state
    const [transferring, setTransferring] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Load cards and stores on mount and when card type changes
    useEffect(() => {
        loadData();
        // Clear selection when switching card types
        setSelectedCardIds(new Set());
        setTargetStoreId('');
    }, [cardType]);

    useEffect(() => {
        localStorage.setItem('transferCardType', cardType);
    }, [cardType]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (cardType === 'regular') {
                const [cardsResponse, storesData] = await Promise.all([
                    getSystemCards(),
                    getStores()
                ]);
                setCards(cardsResponse.cards || []);
                // Filter out the System store from the destination options (case-insensitive)
                setStores(storesData.filter(store => store.name.toLowerCase() !== 'system'));
            } else {
                const [cardsResponse, storesData] = await Promise.all([
                    getWalletSystemCards(),
                    getWalletStores()
                ]);
                setCards(cardsResponse.cards || []);
                // Filter out the System store from the destination options (case-insensitive)
                setStores(storesData.filter(store => store.name.toLowerCase() !== 'system'));
            }
        } catch (err) {
            console.error('Failed to load data:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Filter cards based on search
    const filteredCards = cards.filter(card => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        if (cardType === 'regular') {
            return (
                card.email?.toLowerCase().includes(query) ||
                card.firstName?.toLowerCase().includes(query) ||
                card.lastName?.toLowerCase().includes(query) ||
                card.accountId?.toLowerCase().includes(query)
            );
        } else {
            return (
                card.email?.toLowerCase().includes(query) ||
                card.first_name?.toLowerCase().includes(query) ||
                card.last_name?.toLowerCase().includes(query) ||
                card.serial_number?.toLowerCase().includes(query)
            );
        }
    });

    // Selection handlers
    const handleSelectAll = useCallback(() => {
        if (selectedCardIds.size === filteredCards.length) {
            // Deselect all
            setSelectedCardIds(new Set());
        } else {
            // Select all visible cards
            setSelectedCardIds(new Set(filteredCards.map(c => c.id)));
        }
    }, [filteredCards, selectedCardIds.size]);

    const handleToggleCard = useCallback((cardId) => {
        setSelectedCardIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cardId)) {
                newSet.delete(cardId);
            } else {
                newSet.add(cardId);
            }
            return newSet;
        });
    }, []);

    // Transfer handler
    const handleTransfer = async () => {
        if (selectedCardIds.size === 0 || !targetStoreId) return;

        setTransferring(true);
        setError(null);
        setSuccess(null);
        setShowConfirmModal(false);

        try {
            let response;
            if (cardType === 'regular') {
                response = await transferSystemCards(
                    Array.from(selectedCardIds),
                    parseInt(targetStoreId)
                );
            } else {
                response = await transferWalletCards(
                    Array.from(selectedCardIds),
                    parseInt(targetStoreId)
                );
            }
            setSuccess(`Successfully transferred ${response.count} ${cardType === 'wallet' ? 'wallet ' : ''}cards to ${response.store_name}`);
            setSelectedCardIds(new Set());
            setTargetStoreId('');
            // Reload cards to update the list
            await loadData();
        } catch (err) {
            console.error('Transfer failed:', err);
            setError(err.response?.data?.error || 'Failed to transfer cards. Please try again.');
        } finally {
            setTransferring(false);
        }
    };

    const isAllSelected = filteredCards.length > 0 && selectedCardIds.size === filteredCards.length;
    const selectedStore = stores.find(s => s.id === parseInt(targetStoreId));

    if (loading) {
        return (
            <div className="transfer-loading">
                <div className="spinner"></div>
                <p>Loading {cardType === 'wallet' ? 'wallet ' : ''}cards and stores...</p>
            </div>
        );
    }

    return (
        <div className="system-transfer">
            {/* Header */}
            <div className="transfer-header">
                <div className="transfer-title">
                    <ArrowRightLeft size={24} style={{ color: 'var(--color-accent-purple)' }} />
                    <div>
                        <h2>Transfer System Cards</h2>
                        <p>Select {cardType === 'wallet' ? 'wallet ' : ''}cards to transfer to an existing store</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                    {/* Card Type Toggle */}
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        background: 'var(--color-bg-tertiary)',
                        padding: '4px',
                        borderRadius: 'var(--border-radius-lg)',
                        border: '1px solid var(--border-color)'
                    }}>
                        <button
                            onClick={() => setCardType('regular')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: 'var(--border-radius-md)',
                                cursor: 'pointer',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 'var(--font-weight-medium)',
                                transition: 'all 0.2s ease',
                                background: cardType === 'regular' ? 'var(--color-accent-blue)' : 'transparent',
                                color: cardType === 'regular' ? 'white' : 'var(--color-text-secondary)'
                            }}
                        >
                            <CreditCard size={16} />
                            Regular
                        </button>
                        <button
                            onClick={() => setCardType('wallet')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                borderRadius: 'var(--border-radius-md)',
                                cursor: 'pointer',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 'var(--font-weight-medium)',
                                transition: 'all 0.2s ease',
                                background: cardType === 'wallet' ? 'linear-gradient(135deg, #0a1628 0%, #132b50 100%)' : 'transparent',
                                color: cardType === 'wallet' ? '#00c8ff' : 'var(--color-text-secondary)',
                                border: cardType === 'wallet' ? '1px solid rgba(0, 200, 255, 0.3)' : 'none'
                            }}
                        >
                            <Wallet size={16} />
                            Wallet
                        </button>
                    </div>
                    <button
                        className="btn btn-ghost"
                        onClick={loadData}
                        disabled={loading}
                    >
                        <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Error/Success messages */}
            {error && (
                <div className="transfer-alert transfer-alert-error">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                    <button onClick={() => setError(null)}><X size={16} /></button>
                </div>
            )}
            {success && (
                <div className="transfer-alert transfer-alert-success">
                    <Check size={18} />
                    <span>{success}</span>
                    <button onClick={() => setSuccess(null)}><X size={16} /></button>
                </div>
            )}

            {/* Transfer Controls */}
            <Card hover={false}>
                <Card.Body>
                    <div className="transfer-controls">
                        <div className="transfer-controls-left">
                            {/* Search */}
                            <div className="transfer-search">
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder={cardType === 'regular'
                                        ? "Search by email, name, or account ID..."
                                        : "Search by email, name, or serial number..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Selected count badge */}
                            <div className="transfer-selected-badge">
                                <Package size={16} />
                                <span>{selectedCardIds.size} of {filteredCards.length} selected</span>
                            </div>
                        </div>

                        <div className="transfer-controls-right">
                            {/* Store selector */}
                            <div className="transfer-store-select">
                                <Store size={18} />
                                <select
                                    value={targetStoreId}
                                    onChange={(e) => setTargetStoreId(e.target.value)}
                                    disabled={stores.length === 0}
                                >
                                    <option value="">Select destination {cardType === 'wallet' ? 'wallet ' : ''}store...</option>
                                    {stores.map(store => (
                                        <option key={store.id} value={store.id}>
                                            {store.name} ({store.cards_count || 0} cards)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Transfer button */}
                            <button
                                className="btn btn-primary-enhanced transfer-btn"
                                disabled={selectedCardIds.size === 0 || !targetStoreId || transferring}
                                onClick={() => setShowConfirmModal(true)}
                            >
                                <ArrowRightLeft size={18} />
                                {transferring ? 'Transferring...' : `Transfer ${selectedCardIds.size} Cards`}
                            </button>
                        </div>
                    </div>
                </Card.Body>
            </Card>

            {/* Cards Table */}
            <Card hover={false}>
                <Card.Body style={{ padding: 0 }}>
                    {filteredCards.length === 0 ? (
                        <div className="transfer-empty" style={
                            cardType === 'wallet' ? {
                                background: 'linear-gradient(135deg, rgba(10, 22, 40, 0.3) 0%, rgba(19, 43, 80, 0.3) 100%)',
                                borderColor: 'rgba(0, 200, 255, 0.2)'
                            } : {}
                        }>
                            {cardType === 'wallet' ? <Wallet size={48} style={{ color: '#00c8ff' }} /> : <Package size={48} />}
                            <h3>No {cardType === 'wallet' ? 'Wallet ' : ''}System Cards Found</h3>
                            <p>Generate some {cardType === 'wallet' ? 'wallet ' : ''}cards from the {cardType === 'wallet' ? 'Wallet Cards' : 'Generator'} page first.</p>
                        </div>
                    ) : (
                        <div className="transfer-table-container">
                            <table className="transfer-table">
                                <thead>
                                    <tr>
                                        <th className="transfer-checkbox-col">
                                            <button
                                                className="transfer-checkbox-btn"
                                                onClick={handleSelectAll}
                                                title={isAllSelected ? 'Deselect all' : 'Select all'}
                                            >
                                                {isAllSelected ? (
                                                    <CheckSquare size={20} style={{ color: cardType === 'wallet' ? '#00c8ff' : 'var(--color-accent-blue)' }} />
                                                ) : (
                                                    <Square size={20} />
                                                )}
                                            </button>
                                        </th>
                                        <th>Email</th>
                                        <th>Name</th>
                                        <th>{cardType === 'regular' ? 'Account ID' : 'Serial Number'}</th>
                                        {cardType === 'regular' && <th>Color</th>}
                                        {cardType === 'wallet' && <th>Status</th>}
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCards.map(card => (
                                        <tr
                                            key={card.id}
                                            className={selectedCardIds.has(card.id) ? 'selected' : ''}
                                            onClick={() => handleToggleCard(card.id)}
                                        >
                                            <td className="transfer-checkbox-col">
                                                <button
                                                    className="transfer-checkbox-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleCard(card.id);
                                                    }}
                                                >
                                                    {selectedCardIds.has(card.id) ? (
                                                        <CheckSquare size={20} style={{ color: cardType === 'wallet' ? '#00c8ff' : 'var(--color-accent-blue)' }} />
                                                    ) : (
                                                        <Square size={20} />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="transfer-email">{card.email}</td>
                                            <td>
                                                {cardType === 'regular'
                                                    ? `${card.firstName} ${card.lastName}`
                                                    : `${card.first_name} ${card.last_name}`}
                                            </td>
                                            <td className="transfer-account-id">
                                                {cardType === 'regular' ? card.accountId : card.serial_number}
                                            </td>
                                            {cardType === 'regular' && (
                                                <td>
                                                    <span
                                                        className="transfer-color-badge"
                                                        style={{
                                                            background: card.color === 'blue' ? '#0088CC' : '#1E1E1E',
                                                            color: 'white'
                                                        }}
                                                    >
                                                        {card.color}
                                                    </span>
                                                </td>
                                            )}
                                            {cardType === 'wallet' && (
                                                <td>
                                                    <span
                                                        className="transfer-color-badge"
                                                        style={{
                                                            background: card.is_locked
                                                                ? 'rgba(255, 107, 107, 0.2)'
                                                                : 'rgba(0, 200, 255, 0.2)',
                                                            color: card.is_locked ? '#ff6b6b' : '#00c8ff',
                                                            border: `1px solid ${card.is_locked ? 'rgba(255, 107, 107, 0.3)' : 'rgba(0, 200, 255, 0.3)'}`
                                                        }}
                                                    >
                                                        {card.is_locked ? 'Locked' : 'Active'}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="transfer-date">
                                                {new Date(cardType === 'regular' ? card.createdAt : card.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="modal-overlay">
                    <div className="modal transfer-confirm-modal">
                        <div className="modal-header">
                            <h3>Confirm Transfer</h3>
                            <button className="modal-close-btn" onClick={() => setShowConfirmModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>
                                Are you sure you want to transfer <strong>{selectedCardIds.size} {cardType === 'wallet' ? 'wallet ' : ''}cards</strong> to{' '}
                                <strong>{selectedStore?.name}</strong>?
                            </p>
                            <p style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-text-secondary)',
                                marginTop: 'var(--spacing-sm)'
                            }}>
                                This action will move the cards from the System {cardType === 'wallet' ? 'wallet ' : ''}store to the selected store.
                                {cardType === 'regular' && ' The cards will no longer appear in the Generator page.'}
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-ghost"
                                onClick={() => setShowConfirmModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary-enhanced"
                                onClick={handleTransfer}
                                disabled={transferring}
                            >
                                {transferring ? 'Transferring...' : 'Confirm Transfer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemTransfer;
