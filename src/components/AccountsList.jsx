import React, { useState, useMemo } from 'react';
import {
    User,
    Copy,
    Trash2,
    Eye,
    EyeOff,
    Download,
    Search,
    CheckCircle,
    MoreVertical,
    Mail,
    Key
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import EmptyState from './ui/EmptyState';
import { formatDate, maskPassword } from '../utils/formatters';
import { copyAccountCredentials, copyPassword, copyEmail, copyUsername } from '../utils/clipboard';

/**
 * Accounts list component
 */
const AccountsList = ({
    accounts,
    onDelete,
    onSelect,
    selectedId,
    onCopy,
    onDownloadSingle
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [visiblePasswords, setVisiblePasswords] = useState(new Set());
    const [copiedField, setCopiedField] = useState(null);

    // Filter accounts based on search
    const filteredAccounts = useMemo(() => {
        if (!searchQuery.trim()) return accounts;

        const query = searchQuery.toLowerCase();
        return accounts.filter(account =>
            account.username.toLowerCase().includes(query) ||
            account.email.toLowerCase().includes(query) ||
            account.accountId.toLowerCase().includes(query) ||
            account.firstName.toLowerCase().includes(query) ||
            account.lastName.toLowerCase().includes(query)
        );
    }, [accounts, searchQuery]);

    const togglePasswordVisibility = (accountId) => {
        setVisiblePasswords(prev => {
            const newSet = new Set(prev);
            if (newSet.has(accountId)) {
                newSet.delete(accountId);
            } else {
                newSet.add(accountId);
            }
            return newSet;
        });
    };

    const handleCopy = async (account, field) => {
        let result;
        switch (field) {
            case 'all':
                result = await copyAccountCredentials(account);
                break;
            case 'password':
                result = await copyPassword(account.password);
                break;
            case 'email':
                result = await copyEmail(account.email);
                break;
            case 'username':
                result = await copyUsername(account.username);
                break;
            default:
                result = await copyAccountCredentials(account);
        }

        if (result.success) {
            setCopiedField(`${account.id}-${field}`);
            setTimeout(() => setCopiedField(null), 2000);
            if (onCopy) onCopy(field, account.id);
        }
    };

    if (accounts.length === 0) {
        return (
            <Card>
                <Card.Header>
                    <User size={18} style={{ color: 'var(--color-accent-blue)' }} />
                    <span>Generated Accounts</span>
                </Card.Header>
                <Card.Body>
                    <EmptyState
                        icon={User}
                        title="No accounts yet"
                        description="Generate some accounts to see them here"
                    />
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card>
            <Card.Header
                actions={
                    <span style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)'
                    }}>
                        {filteredAccounts.length} of {accounts.length} accounts
                    </span>
                }
            >
                <User size={18} style={{ color: 'var(--color-accent-blue)' }} />
                <span>Generated Accounts</span>
            </Card.Header>

            {/* Search bar */}
            <div style={{
                padding: 'var(--spacing-md) var(--spacing-lg)',
                borderBottom: '1px solid var(--border-color)'
            }}>
                <div style={{ position: 'relative' }}>
                    <Search
                        size={16}
                        style={{
                            position: 'absolute',
                            left: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--color-text-tertiary)'
                        }}
                    />
                    <input
                        type="text"
                        className="input"
                        placeholder="Search accounts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: 36 }}
                    />
                </div>
            </div>

            <div className="accounts-list">
                {filteredAccounts.length === 0 ? (
                    <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
                        <p style={{ color: 'var(--color-text-secondary)' }}>
                            No accounts match your search
                        </p>
                    </div>
                ) : (
                    filteredAccounts.slice(0, 100).map((account) => (
                        <AccountListItem
                            key={account.id}
                            account={account}
                            isSelected={selectedId === account.id}
                            isPasswordVisible={visiblePasswords.has(account.id)}
                            copiedField={copiedField}
                            onSelect={() => onSelect(account.id)}
                            onTogglePassword={() => togglePasswordVisibility(account.id)}
                            onCopy={(field) => handleCopy(account, field)}
                            onDelete={() => onDelete(account.id)}
                            onDownload={() => onDownloadSingle(account)}
                        />
                    ))
                )}

                {filteredAccounts.length > 100 && (
                    <div style={{
                        padding: 'var(--spacing-md)',
                        textAlign: 'center',
                        color: 'var(--color-text-secondary)',
                        fontSize: 'var(--font-size-sm)',
                        borderTop: '1px solid var(--border-color)'
                    }}>
                        Showing first 100 of {filteredAccounts.length} accounts
                    </div>
                )}
            </div>
        </Card>
    );
};

/**
 * Single account list item
 */
const AccountListItem = ({
    account,
    isSelected,
    isPasswordVisible,
    copiedField,
    onSelect,
    onTogglePassword,
    onCopy,
    onDelete,
    onDownload
}) => {
    const [showActions, setShowActions] = useState(false);

    return (
        <div
            className={`account-list-item ${isSelected ? 'selected' : ''}`}
            onClick={onSelect}
            style={isSelected ? {
                background: 'rgba(0, 122, 255, 0.05)',
                borderLeft: '3px solid var(--color-accent-blue)'
            } : {}}
        >
            <div className="account-list-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="account-list-username">{account.username}</span>
                    {isSelected && (
                        <CheckCircle size={14} style={{ color: 'var(--color-accent-green)' }} />
                    )}
                </div>
                <span className="account-list-email">{account.email}</span>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 4
                }}>
                    <span style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-tertiary)',
                        fontFamily: "'SF Mono', Monaco, monospace"
                    }}>
                        {isPasswordVisible ? account.password : maskPassword(account.password)}
                    </span>
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            onTogglePassword();
                        }}
                        style={{ padding: 2 }}
                        title={isPasswordVisible ? 'Hide password' : 'Show password'}
                    >
                        {isPasswordVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                </div>
            </div>

            <div className="account-list-actions" onClick={(e) => e.stopPropagation()}>
                {/* Copy dropdown */}
                <div style={{ position: 'relative' }}>
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={copiedField?.startsWith(account.id) ? CheckCircle : Copy}
                        onClick={() => onCopy('all')}
                        title="Copy all credentials"
                        style={copiedField?.startsWith(account.id) ? { color: 'var(--color-accent-green)' } : {}}
                    />
                </div>

                {/* Download PDF */}
                <Button
                    variant="ghost"
                    size="sm"
                    icon={Download}
                    onClick={onDownload}
                    title="Download PDF"
                />

                {/* Delete */}
                <Button
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    onClick={onDelete}
                    title="Delete account"
                    style={{ color: 'var(--color-accent-red)' }}
                />
            </div>
        </div>
    );
};

export default AccountsList;
