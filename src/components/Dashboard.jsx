import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getDashboardStores, getRecentActivity, searchEmail, getWalletDashboardStats, getWalletDashboardStores } from '../services/api';
import { searchWalletPhone, getWalletRecentScans } from '../services/walletApi';
import { Store, CreditCard, Users, Activity, TrendingUp, AlertCircle, CheckCircle, XCircle, Search, Mail, Wallet, Lock, Unlock, Phone, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Dashboard Component
 * Shows overview of stores, cards, and activity with card type switching
 */
const Dashboard = () => {
    const navigate = useNavigate();
    const isFirstSearch = React.useRef(true); // Track first render for search debounce
    const [cardType, setCardType] = useState(() => {
        const saved = localStorage.getItem('dashboardCardType');
        return saved || 'regular';
    });

    const [stats, setStats] = useState(null);
    const [stores, setStores] = useState([]);
    const [recentActivity, setRecentActivity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Store Search & Sort state
    const [storeSearchQuery, setStoreSearchQuery] = useState('');
    const [storeSortOrder, setStoreSortOrder] = useState('desc');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalStores, setTotalStores] = useState(0);
    const ITEMS_PER_PAGE = 10;

    // Search state (email for regular, phone for wallet)
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Activity pagination state
    const [activityPage, setActivityPage] = useState(1);
    const [activityTotalPages, setActivityTotalPages] = useState(1);
    const ACTIVITY_PER_PAGE = 10;

    // Navigation handler based on card type
    const handleNavigateToStores = () => {
        navigate(cardType === 'wallet' ? '/sys-admin/wallet-stores' : '/sys-admin/stores');
    };

    const handleCardTypeChange = (type) => {
        if (type === cardType) return;
        setCardType(type);
        setLoading(true);
        setCurrentPage(1);
        setActivityPage(1);
        setStoreSearchQuery('');
        setStoreSortOrder('desc');
    };

    useEffect(() => {
        loadDashboardData(currentPage);
    }, [cardType, currentPage, storeSortOrder, activityPage]); // Reload when sort or activity page changes

    // Debounce store search
    useEffect(() => {
        if (isFirstSearch.current) {
            isFirstSearch.current = false;
            return;
        }
        const timer = setTimeout(() => {
            loadDashboardData(1); // Reset to page 1 on search
        }, 500);
        return () => clearTimeout(timer);
    }, [storeSearchQuery]);

    useEffect(() => {
        localStorage.setItem('dashboardCardType', cardType);
    }, [cardType]);

    const loadDashboardData = async (page = 1) => {
        setLoading(true);
        setError(null);
        setSearchQuery('');
        setSearchResults([]);
        try {
            if (cardType === 'regular') {
                const [statsData, storesData, activityData] = await Promise.all([
                    getDashboardStats(),
                    getDashboardStores(page, ITEMS_PER_PAGE, storeSearchQuery, storeSortOrder),
                    getRecentActivity(activityPage, ACTIVITY_PER_PAGE),
                ]);
                setStats(statsData);

                // Handle paginated stores data
                if (storesData && storesData.data) {
                    setStores(storesData.data);
                    setTotalPages(storesData.last_page || 1);
                    setTotalStores(storesData.total || 0);
                } else {
                    setStores(storesData || []);
                    setTotalPages(1);
                    setTotalStores(storesData?.length || 0);
                }

                setRecentActivity(activityData);
                // Set activity pagination from paginated recent_scans
                if (activityData?.recent_scans?.last_page) {
                    setActivityTotalPages(activityData.recent_scans.last_page);
                }
            } else {
                const [statsData, storesData, activityData] = await Promise.all([
                    getWalletDashboardStats(),
                    getWalletDashboardStores(page, ITEMS_PER_PAGE, storeSearchQuery, storeSortOrder),
                    getWalletRecentScans(activityPage, ACTIVITY_PER_PAGE),
                ]);
                setStats(statsData);

                // Handle paginated wallet stores data
                if (storesData && storesData.data) {
                    setStores(storesData.data);
                    setTotalPages(storesData.last_page || 1);
                    setTotalStores(storesData.total || 0);
                } else {
                    setStores(storesData || []);
                    setTotalPages(1);
                    setTotalStores(storesData?.length || 0);
                }

                setRecentActivity(activityData);
                // Set activity pagination from paginated recent_scans
                if (activityData?.recent_scans?.last_page) {
                    setActivityTotalPages(activityData.recent_scans.last_page);
                }
            }
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // Toggle Sort Order
    const toggleStoreSort = () => {
        setStoreSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    // Search handler - email for regular, phone for wallet
    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        try {
            if (cardType === 'regular') {
                const response = await searchEmail(query);
                setSearchResults(response.results || []);
            } else {
                const response = await searchWalletPhone(query);
                setSearchResults(response.results || []);
            }
        } catch (err) {
            console.error('Search failed:', err);
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    };

    if (loading && stores.length === 0) {
        return (
            <div className="dashboard-loading">
                <div className="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-error">
                <AlertCircle size={48} />
                <p>{error}</p>
                <button onClick={() => loadDashboardData(currentPage)} className="btn-primary">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h2>Dashboard</h2>
                    <p>Overview of your {cardType === 'regular' ? 'stores and cards' : 'wallet stores and cards'}</p>
                </div>
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
                        onClick={() => handleCardTypeChange('regular')}
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
                        Regular Cards
                    </button>
                    <button
                        onClick={() => handleCardTypeChange('wallet')}
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
                        Wallet Cards
                    </button>
                </div>
            </div>

            {/* Stats Cards - Different for regular vs wallet */}
            <div className="dashboard-stats">
                <div className="stat-card">
                    <div className="stat-icon stores">
                        <Store size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats?.stores?.total || 0}</div>
                        <div className="stat-label">{cardType === 'regular' ? 'Total Stores' : 'Wallet Stores'}</div>
                        <div className="stat-detail">
                            <span className="active">{stats?.stores?.active || 0} active</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon cards">
                        {cardType === 'regular' ? <CreditCard size={24} /> : <Wallet size={24} />}
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats?.cards?.total || 0}</div>
                        <div className="stat-label">{cardType === 'regular' ? 'Total Cards' : 'Wallet Cards'}</div>
                        <div className="stat-detail">
                            {cardType === 'regular' ? (
                                <>
                                    <span className="active">{stats?.cards?.active || 0} active</span>
                                    <span className="inactive">{stats?.cards?.inactive || 0} inactive</span>
                                </>
                            ) : (
                                <>
                                    <span className="active">{stats?.cards?.active || 0} active</span>
                                    <span className="inactive">{stats?.cards?.locked || 0} locked</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon scanned">
                        {cardType === 'regular' ? <Users size={24} /> : <Lock size={24} />}
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            {cardType === 'regular' ? (stats?.cards?.scanned || 0) : (stats?.cards?.locked || 0)}
                        </div>
                        <div className="stat-label">
                            {cardType === 'regular' ? 'Scanned Cards' : 'Locked Cards'}
                        </div>
                        <div className="stat-detail">
                            {cardType === 'regular' ? (
                                <span className="pending">{stats?.cards?.unscanned || 0} pending</span>
                            ) : (
                                <span className="pending">{stats?.cards?.with_phone || 0} with phone</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon conversion">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            {cardType === 'regular' ? (
                                stats?.cards?.total > 0
                                    ? Math.round((stats?.cards?.scanned / stats?.cards?.total) * 100)
                                    : 0
                            ) : (
                                stats?.cards?.total > 0
                                    ? Math.round((stats?.cards?.locked / stats?.cards?.total) * 100)
                                    : 0
                            )}%
                        </div>
                        <div className="stat-label">
                            {cardType === 'regular' ? 'Scan Rate' : 'Lock Rate'}
                        </div>
                        <div className="stat-detail">
                            <span>{cardType === 'regular' ? 'Cards activated by users' : 'Cards saved by users'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Section - Email for regular, Phone for wallet */}
            <div className="dashboard-section" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div className="section-header">
                    <h3>
                        {cardType === 'regular' ? (
                            <><Search size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Card Search</>
                        ) : (
                            <><Phone size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Phone Search</>
                        )}
                    </h3>
                </div>
                <div style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--border-radius-lg)',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={18} style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--color-text-tertiary)'
                            }} />
                            <input
                                type="text"
                                placeholder={cardType === 'regular'
                                    ? "Search by email, phone, or serial number... (min 2 characters)"
                                    : "Search by phone number... (min 2 characters)"}
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-sm) var(--spacing-md)',
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

                    {searchLoading && (
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
                            Searching...
                        </div>
                    )}

                    {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: 'var(--spacing-lg)',
                            color: 'var(--color-text-secondary)',
                            background: 'var(--color-bg-tertiary)',
                            borderRadius: 'var(--border-radius-md)'
                        }}>
                            <CheckCircle size={24} style={{ color: 'var(--color-accent-green)', marginBottom: '8px' }} />
                            <p style={{ margin: 0 }}>No results found matching "{searchQuery}"</p>
                            {cardType === 'regular' && (
                                <span style={{ fontSize: 'var(--font-size-xs)' }}>This prefix is available for use</span>
                            )}
                        </div>
                    )}

                    {searchResults.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                            <div style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-tertiary)',
                                marginBottom: 'var(--spacing-xs)'
                            }}>
                                Found {searchResults.length} result(s)
                            </div>
                            {searchResults.map((card) => (
                                <div
                                    key={card.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-md)',
                                        padding: 'var(--spacing-sm) var(--spacing-md)',
                                        background: 'var(--color-bg-tertiary)',
                                        borderRadius: 'var(--border-radius-md)',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    {cardType === 'regular' ? (
                                        <Mail size={16} style={{ color: 'var(--color-accent-blue)' }} />
                                    ) : (
                                        <Phone size={16} style={{ color: 'var(--color-accent-blue)' }} />
                                    )}
                                    <span style={{
                                        fontFamily: 'monospace',
                                        flex: 1,
                                        fontWeight: 'var(--font-weight-medium)'
                                    }}>
                                        {cardType === 'regular' ? card.email : card.phone_number}
                                    </span>
                                    <span style={{
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--color-text-secondary)',
                                        background: 'var(--color-bg-secondary)',
                                        padding: '2px 8px',
                                        borderRadius: 'var(--border-radius-sm)'
                                    }}>
                                        {card.store?.name || 'System'}
                                    </span>
                                    <span style={{
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--color-text-tertiary)'
                                    }}>
                                        {card.first_name} {card.last_name}
                                    </span>
                                    <span style={{
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--color-text-tertiary)'
                                    }}>
                                        {new Date(card.updated_at || card.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Stores Table */}
            <div className="dashboard-section">
                <div className="section-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {cardType === 'regular' ? 'Stores Overview' : 'Wallet Stores Overview'}
                        {loading && <div className="spinner-small"></div>}
                    </h3>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{
                                position: 'absolute',
                                left: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--color-text-tertiary)'
                            }} />
                            <input
                                type="text"
                                placeholder="Search stores..."
                                value={storeSearchQuery}
                                onChange={(e) => setStoreSearchQuery(e.target.value)}
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
                            onClick={toggleStoreSort}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
                        >
                            {storeSortOrder === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                            {storeSortOrder === 'desc' ? 'Newest' : 'Oldest'}
                        </button>
                        <button onClick={handleNavigateToStores} className="btn btn-secondary-enhanced">
                            {cardType === 'regular' ? 'Manage Stores' : 'Manage Wallet Stores'}
                        </button>
                    </div>
                </div>

                {stores.length === 0 ? (
                    <div className="empty-state" style={{
                        padding: 'var(--spacing-2xl)',
                        background: cardType === 'wallet'
                            ? 'linear-gradient(135deg, rgba(10, 22, 40, 0.5) 0%, rgba(19, 43, 80, 0.5) 100%)'
                            : 'linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%)',
                        borderRadius: 'var(--border-radius-lg)',
                        border: cardType === 'wallet' ? '1px solid rgba(0, 200, 255, 0.2)' : '1px solid var(--border-color)',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            margin: '0 auto var(--spacing-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: cardType === 'wallet'
                                ? 'linear-gradient(135deg, rgba(0, 200, 255, 0.1) 0%, rgba(0, 200, 255, 0.05) 100%)'
                                : 'linear-gradient(135deg, rgba(0, 136, 204, 0.1) 0%, rgba(0, 136, 204, 0.05) 100%)',
                            borderRadius: 'var(--border-radius-lg)',
                            border: cardType === 'wallet' ? '2px solid rgba(0, 200, 255, 0.2)' : '2px solid rgba(0, 136, 204, 0.2)'
                        }}>
                            {cardType === 'wallet' ? (
                                <Wallet size={32} style={{ color: '#00c8ff' }} />
                            ) : (
                                <Store size={32} style={{ color: 'var(--color-accent-blue)' }} />
                            )}
                        </div>
                        <p style={{
                            fontSize: 'var(--font-size-md)',
                            color: 'var(--color-text-secondary)',
                            marginBottom: 'var(--spacing-lg)',
                            lineHeight: 1.5
                        }}>
                            {cardType === 'regular'
                                ? 'Create your first store to get started with account generation'
                                : 'Create your first wallet store to get started with wallet cards'}
                        </p>
                        <button
                            onClick={handleNavigateToStores}
                            className="btn-primary"
                            style={{
                                padding: 'var(--spacing-sm) var(--spacing-xl)',
                                fontSize: 'var(--font-size-md)',
                                fontWeight: 'var(--font-weight-semibold)',
                                background: cardType === 'wallet'
                                    ? 'linear-gradient(135deg, #0a1628 0%, #132b50 100%)'
                                    : 'linear-gradient(135deg, var(--color-accent-blue) 0%, #0077BB 100%)',
                                boxShadow: cardType === 'wallet'
                                    ? '0 4px 12px rgba(0, 200, 255, 0.25)'
                                    : '0 4px 12px rgba(0, 136, 204, 0.25)',
                                border: cardType === 'wallet' ? '1px solid rgba(0, 200, 255, 0.3)' : 'none',
                                color: cardType === 'wallet' ? '#00c8ff' : 'white',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {cardType === 'regular' ? 'Create Store' : 'Create Wallet Store'}
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="stores-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Store Name</th>
                                        <th>Location</th>
                                        <th>Total Cards</th>
                                        <th>{cardType === 'regular' ? 'Active' : 'Active'}</th>
                                        <th>{cardType === 'regular' ? 'Inactive' : 'Locked'}</th>
                                        <th>{cardType === 'regular' ? 'Scanned' : 'With Phone'}</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stores.map((store) => (
                                        <tr key={store.id}>
                                            <td className="store-name">{store.name}</td>
                                            <td>{store.location || '-'}</td>
                                            <td>{store.cards_count || 0}</td>
                                            <td className="active-count">{store.active_cards_count || 0}</td>
                                            <td className="inactive-count">
                                                {cardType === 'regular' ? (store.inactive_cards_count || 0) : (store.locked_cards_count || 0)}
                                            </td>
                                            <td>
                                                {cardType === 'regular' ? (store.scanned_cards_count || 0) : (store.with_phone_cards_count || 0)}
                                            </td>
                                            <td>
                                                {store.is_active ? (
                                                    <span className="status-badge active">
                                                        <CheckCircle size={14} /> Active
                                                    </span>
                                                ) : (
                                                    <span className="status-badge inactive">
                                                        <XCircle size={14} /> Inactive
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="pagination-controls" style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 'var(--spacing-md)',
                                padding: 'var(--spacing-sm)',
                                background: 'var(--color-bg-secondary)',
                                borderRadius: 'var(--border-radius-md)'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                    Showing {stores.length} of {totalStores} stores
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1 || loading}
                                        className="btn btn-secondary"
                                        style={{ padding: '4px 12px', fontSize: 'var(--font-size-sm)' }}
                                    >
                                        Previous
                                    </button>
                                    <span style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '0 8px',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: 'var(--font-weight-medium)'
                                    }}>
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages || loading}
                                        className="btn btn-secondary"
                                        style={{ padding: '4px 12px', fontSize: 'var(--font-size-sm)' }}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Recent Activity - Now shows for both card types with pagination */}
            <div className="dashboard-section">
                <div className="section-header">
                    <h3>
                        {cardType === 'regular' ? 'Recent Scans' : 'Recent Locked Cards'}
                    </h3>
                </div>

                {/* Get data from paginated response */}
                {(() => {
                    const scansData = recentActivity?.recent_scans?.data || recentActivity?.recent_scans || [];
                    const isEmpty = !scansData || scansData.length === 0;

                    return isEmpty ? (
                        <div className="empty-state small">
                            <Activity size={32} />
                            <p>
                                {cardType === 'regular' ? 'No scans yet' : 'No locked cards yet'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="activity-list">
                                {scansData.map((scan) => (
                                    <div key={scan.id} className="activity-item">
                                        <div className="activity-icon">
                                            {cardType === 'wallet' ? <Lock size={16} /> : <Users size={16} />}
                                        </div>
                                        <div className="activity-content">
                                            <div className="activity-title">
                                                {scan.first_name} {scan.last_name}
                                            </div>
                                            <div className="activity-detail">
                                                Phone: {scan.phone_number} • {cardType === 'wallet' ? 'Serial' : 'Store'}: {cardType === 'wallet' ? scan.serial_number : (scan.store?.name || 'Unknown')}
                                            </div>
                                        </div>
                                        <div className="activity-time">
                                            {new Date(scan.locked_at || scan.scanned_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Activity Pagination Controls */}
                            {activityTotalPages > 1 && (
                                <div className="pagination-controls" style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: 'var(--spacing-md)',
                                    padding: 'var(--spacing-sm)',
                                    background: 'var(--color-bg-secondary)',
                                    borderRadius: 'var(--border-radius-md)'
                                }}>
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                        Page {activityPage} of {activityTotalPages}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => setActivityPage(prev => Math.max(1, prev - 1))}
                                            disabled={activityPage === 1 || loading}
                                            className="btn btn-secondary"
                                            style={{ padding: '4px 12px', fontSize: 'var(--font-size-sm)' }}
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setActivityPage(prev => Math.min(activityTotalPages, prev + 1))}
                                            disabled={activityPage === activityTotalPages || loading}
                                            className="btn btn-secondary"
                                            style={{ padding: '4px 12px', fontSize: 'var(--font-size-sm)' }}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>
        </div>
    );
};

export default Dashboard;
