import React, { useState, useEffect } from 'react';
import { getDashboardStats, getDashboardStores, getRecentActivity, searchEmail } from '../services/api';
import { Store, CreditCard, Users, Activity, TrendingUp, AlertCircle, CheckCircle, XCircle, Search, Mail } from 'lucide-react';

/**
 * Dashboard Component
 * Shows overview of stores, cards, and activity
 */
const Dashboard = ({ onNavigateToStores }) => {
    const [stats, setStats] = useState(null);
    const [stores, setStores] = useState([]);
    const [recentActivity, setRecentActivity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Email search state
    const [emailSearchQuery, setEmailSearchQuery] = useState('');
    const [emailSearchResults, setEmailSearchResults] = useState([]);
    const [emailSearchLoading, setEmailSearchLoading] = useState(false);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [statsData, storesData, activityData] = await Promise.all([
                getDashboardStats(),
                getDashboardStores(),
                getRecentActivity(),
            ]);
            setStats(statsData);
            setStores(storesData);
            setRecentActivity(activityData);
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Email search handler
    const handleEmailSearch = async (query) => {
        setEmailSearchQuery(query);
        if (query.length < 2) {
            setEmailSearchResults([]);
            return;
        }

        setEmailSearchLoading(true);
        try {
            const response = await searchEmail(query);
            setEmailSearchResults(response.results || []);
        } catch (err) {
            console.error('Email search failed:', err);
            setEmailSearchResults([]);
        } finally {
            setEmailSearchLoading(false);
        }
    };

    if (loading) {
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
                <button onClick={loadDashboardData} className="btn-primary">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h2>Dashboard</h2>
                <p>Overview of your stores and cards</p>
            </div>

            {/* Stats Cards */}
            <div className="dashboard-stats">
                <div className="stat-card">
                    <div className="stat-icon stores">
                        <Store size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats?.stores?.total || 0}</div>
                        <div className="stat-label">Total Stores</div>
                        <div className="stat-detail">
                            <span className="active">{stats?.stores?.active || 0} active</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon cards">
                        <CreditCard size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats?.cards?.total || 0}</div>
                        <div className="stat-label">Total Cards</div>
                        <div className="stat-detail">
                            <span className="active">{stats?.cards?.active || 0} active</span>
                            <span className="inactive">{stats?.cards?.inactive || 0} inactive</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon scanned">
                        <Users size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats?.cards?.scanned || 0}</div>
                        <div className="stat-label">Scanned Cards</div>
                        <div className="stat-detail">
                            <span className="pending">{stats?.cards?.unscanned || 0} pending</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon conversion">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            {stats?.cards?.total > 0
                                ? Math.round((stats?.cards?.scanned / stats?.cards?.total) * 100)
                                : 0}%
                        </div>
                        <div className="stat-label">Scan Rate</div>
                        <div className="stat-detail">
                            <span>Cards activated by users</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Email Search Section */}
            <div className="dashboard-section" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div className="section-header">
                    <h3><Mail size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Email Search</h3>
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
                                placeholder="Search for emails... (min 2 characters)"
                                value={emailSearchQuery}
                                onChange={(e) => handleEmailSearch(e.target.value)}
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

                    {emailSearchLoading && (
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
                            Searching...
                        </div>
                    )}

                    {!emailSearchLoading && emailSearchQuery.length >= 2 && emailSearchResults.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: 'var(--spacing-lg)',
                            color: 'var(--color-text-secondary)',
                            background: 'var(--color-bg-tertiary)',
                            borderRadius: 'var(--border-radius-md)'
                        }}>
                            <CheckCircle size={24} style={{ color: 'var(--color-accent-green)', marginBottom: '8px' }} />
                            <p style={{ margin: 0 }}>No emails found matching "{emailSearchQuery}"</p>
                            <span style={{ fontSize: 'var(--font-size-xs)' }}>This prefix is available for use</span>
                        </div>
                    )}

                    {emailSearchResults.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                            <div style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-tertiary)',
                                marginBottom: 'var(--spacing-xs)'
                            }}>
                                Found {emailSearchResults.length} email(s)
                            </div>
                            {emailSearchResults.map((card) => (
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
                                    <Mail size={16} style={{ color: 'var(--color-accent-blue)' }} />
                                    <span style={{
                                        fontFamily: 'monospace',
                                        flex: 1,
                                        fontWeight: 'var(--font-weight-medium)'
                                    }}>
                                        {card.email}
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
                                        {new Date(card.created_at).toLocaleDateString()}
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
                    <h3>Stores Overview</h3>
                    <button onClick={onNavigateToStores} className="btn btn-secondary-enhanced">
                        Manage Stores
                    </button>
                </div>

                {stores.length === 0 ? (
                    <div className="empty-state" style={{
                        padding: 'var(--spacing-2xl)',
                        background: 'linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%)',
                        borderRadius: 'var(--border-radius-lg)',
                        border: '1px solid var(--border-color)',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            margin: '0 auto var(--spacing-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, rgba(0, 136, 204, 0.1) 0%, rgba(0, 136, 204, 0.05) 100%)',
                            borderRadius: 'var(--border-radius-lg)',
                            border: '2px solid rgba(0, 136, 204, 0.2)'
                        }}>
                            <Store size={32} style={{ color: 'var(--color-accent-blue)' }} />
                        </div>
                        <p style={{
                            fontSize: 'var(--font-size-md)',
                            color: 'var(--color-text-secondary)',
                            marginBottom: 'var(--spacing-lg)',
                            lineHeight: 1.5
                        }}>Create your first store to get started with account generation</p>
                        <button
                            onClick={onNavigateToStores}
                            className="btn-primary"
                            style={{
                                padding: 'var(--spacing-sm) var(--spacing-xl)',
                                fontSize: 'var(--font-size-md)',
                                fontWeight: 'var(--font-weight-semibold)',
                                background: 'linear-gradient(135deg, var(--color-accent-blue) 0%, #0077BB 100%)',
                                boxShadow: '0 4px 12px rgba(0, 136, 204, 0.25)',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 16px rgba(0, 136, 204, 0.35)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 12px rgba(0, 136, 204, 0.25)';
                            }}
                        >
                            Create Store
                        </button>
                    </div>
                ) : (
                    <div className="stores-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Store Name</th>
                                    <th>Location</th>
                                    <th>Total Cards</th>
                                    <th>Active</th>
                                    <th>Inactive</th>
                                    <th>Scanned</th>
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
                                        <td className="inactive-count">{store.inactive_cards_count || 0}</td>
                                        <td>{store.scanned_cards_count || 0}</td>
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
                )}
            </div>

            {/* Recent Activity */}
            <div className="dashboard-section">
                <div className="section-header">
                    <h3>Recent Scans</h3>
                </div>

                {recentActivity?.recent_scans?.length === 0 ? (
                    <div className="empty-state small">
                        <Activity size={32} />
                        <p>No scans yet</p>
                    </div>
                ) : (
                    <div className="activity-list">
                        {recentActivity?.recent_scans?.map((scan) => (
                            <div key={scan.id} className="activity-item">
                                <div className="activity-icon">
                                    <Users size={16} />
                                </div>
                                <div className="activity-content">
                                    <div className="activity-title">
                                        {scan.first_name} {scan.last_name}
                                    </div>
                                    <div className="activity-detail">
                                        Phone: {scan.phone_number} • Store: {scan.store?.name || 'Unknown'}
                                    </div>
                                </div>
                                <div className="activity-time">
                                    {new Date(scan.scanned_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
