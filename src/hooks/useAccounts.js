import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing accounts state
 */
export const useAccounts = () => {
  const [accounts, setAccounts] = useState(() => {
    // Load from localStorage on initial mount
    try {
      const saved = localStorage.getItem('accounts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage when accounts change
  useEffect(() => {
    try {
      localStorage.setItem('accounts', JSON.stringify(accounts));
    } catch (error) {
      console.error('Failed to save accounts to localStorage:', error);
    }
  }, [accounts]);

  /**
   * Add multiple accounts
   */
  const addAccounts = useCallback((newAccounts) => {
    setAccounts((prev) => [...newAccounts, ...prev]);
  }, []);

  /**
   * Add a single account
   */
  const addAccount = useCallback((account) => {
    setAccounts((prev) => [account, ...prev]);
  }, []);

  /**
   * Remove an account by ID
   */
  const removeAccount = useCallback((accountId) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
  }, []);

  /**
   * Remove multiple accounts by IDs
   */
  const removeAccounts = useCallback((accountIds) => {
    const idSet = new Set(accountIds);
    setAccounts((prev) => prev.filter((acc) => !idSet.has(acc.id)));
  }, []);

  /**
   * Clear all accounts
   */
  const clearAccounts = useCallback(() => {
    setAccounts([]);
  }, []);

  /**
   * Update an account
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
          acc.username.toLowerCase().includes(lowerQuery) ||
          acc.email.toLowerCase().includes(lowerQuery) ||
          acc.accountId.toLowerCase().includes(lowerQuery) ||
          acc.firstName.toLowerCase().includes(lowerQuery) ||
          acc.lastName.toLowerCase().includes(lowerQuery)
      );
    },
    [accounts]
  );

  return {
    accounts,
    count,
    todayCount,
    successRate,
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
