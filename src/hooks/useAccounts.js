import { useState, useCallback, useEffect } from 'react';
import { getSystemCards, generateSystemCards, deleteSystemCard, clearSystemCards } from '../services/api';

/**
 * Custom hook for managing accounts state with server synchronization
 * Accounts are now stored on the server and synced via API
 */
export const useAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load accounts from server on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  /**
   * Load accounts from server
   */
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSystemCards(1, 20); // Fetch up to 20 cards for Generator view
      const cards = response.cards?.data || response.cards || [];

      // Debug: Check if accessToken is present in loaded cards
      if (cards.length > 0) {
        console.log('loadAccounts: Sample card data:', {
          id: cards[0].id,
          hasAccessToken: !!cards[0].accessToken,
          accessTokenLength: cards[0].accessToken?.length,
          keys: Object.keys(cards[0])
        });
      }

      setAccounts(cards);
    } catch (err) {
      console.error('Failed to load system cards:', err);
      setError('Failed to load accounts');
      // Fallback to localStorage for offline mode
      try {
        const saved = localStorage.getItem('accounts');
        if (saved) {
          setAccounts(JSON.parse(saved));
        }
      } catch {
        // Ignore localStorage errors
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate accounts via server API
   */
  const generateAccountsApi = useCallback(async (count, emailType = 'random', color = 'blue') => {
    const response = await generateSystemCards(count, emailType, color);
    const newCards = response.cards || [];

    // Update local state with new cards at the beginning
    setAccounts((prev) => [...newCards, ...prev]);

    return newCards;
  }, []);

  /**
   * Add multiple accounts (for local-only operations, deprecated)
   */
  const addAccounts = useCallback((newAccounts) => {
    setAccounts((prev) => [...newAccounts, ...prev]);
  }, []);

  /**
   * Add a single account (for local-only operations, deprecated)
   */
  const addAccount = useCallback((account) => {
    setAccounts((prev) => [account, ...prev]);
  }, []);

  /**
   * Remove an account by ID via server API
   */
  const removeAccount = useCallback(async (accountId) => {
    try {
      await deleteSystemCard(accountId);
      setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
    } catch (err) {
      console.error('Failed to delete card:', err);
      throw err;
    }
  }, []);

  /**
   * Remove multiple accounts by IDs
   */
  const removeAccounts = useCallback(async (accountIds) => {
    // Delete each card individually
    for (const id of accountIds) {
      try {
        await deleteSystemCard(id);
      } catch (err) {
        console.error(`Failed to delete card ${id}:`, err);
      }
    }
    const idSet = new Set(accountIds);
    setAccounts((prev) => prev.filter((acc) => !idSet.has(acc.id)));
  }, []);

  /**
   * Clear all accounts via server API
   */
  const clearAccounts = useCallback(async () => {
    try {
      await clearSystemCards();
      setAccounts([]);
    } catch (err) {
      console.error('Failed to clear cards:', err);
      throw err;
    }
  }, []);

  /**
   * Update an account (local only for now)
   */
  const updateAccount = useCallback((accountId, updates) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId ? { ...acc, ...updates } : acc
      )
    );
  }, []);

  /**
   * Get account by ID
   */
  const getAccount = useCallback(
    (accountId) => {
      return accounts.find((acc) => acc.id === accountId);
    },
    [accounts]
  );

  /**
   * Get accounts count
   */
  const count = accounts.length;

  /**
   * Get accounts created today
   */
  const todayCount = accounts.filter((acc) => {
    const today = new Date();
    const created = new Date(acc.createdAt);
    return (
      created.getDate() === today.getDate() &&
      created.getMonth() === today.getMonth() &&
      created.getFullYear() === today.getFullYear()
    );
  }).length;

  /**
   * Get success rate (all active accounts / total)
   */
  const successRate =
    accounts.length > 0
      ? Math.round(
        (accounts.filter((acc) => acc.status === 'active').length /
          accounts.length) *
        100
      )
      : 100;

  /**
   * Search accounts
   */
  const searchAccounts = useCallback(
    (query) => {
      if (!query.trim()) return accounts;
      const lowerQuery = query.toLowerCase();
      return accounts.filter(
        (acc) =>
          acc.username?.toLowerCase().includes(lowerQuery) ||
          acc.email?.toLowerCase().includes(lowerQuery) ||
          acc.accountId?.toLowerCase().includes(lowerQuery) ||
          acc.firstName?.toLowerCase().includes(lowerQuery) ||
          acc.lastName?.toLowerCase().includes(lowerQuery)
      );
    },
    [accounts]
  );

  return {
    accounts,
    count,
    todayCount,
    successRate,
    loading,
    error,
    loadAccounts,
    generateAccountsApi,
    addAccount,
    addAccounts,
    removeAccount,
    removeAccounts,
    clearAccounts,
    updateAccount,
    getAccount,
    searchAccounts,
  };
};

export default useAccounts;
