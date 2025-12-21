import React from 'react';
import { Zap, TrendingUp, CheckCircle } from 'lucide-react';
import { formatNumber } from '../utils/formatters';

/**
 * Header component with live statistics
 */
const Header = ({ totalAccounts, todayCount, successRate }) => {
    return (
        <header className="header">
            <div className="header-content">
                <div className="header-logo">
                    <div className="header-logo-icon">AG</div>
                    <h1 className="header-title">Account Generator</h1>
                </div>

                <div className="header-stats">
                    <StatItem
                        icon={Zap}
                        value={formatNumber(totalAccounts)}
                        label="Total Accounts"
                        color="var(--color-accent-blue)"
                    />
                    <StatItem
                        icon={TrendingUp}
                        value={formatNumber(todayCount)}
                        label="Generated Today"
                        color="var(--color-accent-purple)"
                    />
                    <StatItem
                        icon={CheckCircle}
                        value={`${successRate}%`}
                        label="Success Rate"
                        color="var(--color-accent-green)"
                    />
                </div>
            </div>
        </header>
    );
};

/**
 * Individual stat item in header
 */
const StatItem = ({ icon: Icon, value, label, color }) => {
    return (
        <div className="stat-item">
            <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon size={18} style={{ color }} />
                {value}
            </div>
            <div className="stat-label">{label}</div>
        </div>
    );
};

export default Header;
