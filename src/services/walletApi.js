import api from './api';

// ============================================
// WALLET STORES API
// ============================================

/**
 * Get all wallet stores
 */
export const getWalletStores = async (page = 1, perPage = 15, search = '', sort = 'desc') => {
    const response = await api.get('/api/wallet-stores', {
        params: { page, per_page: perPage, search, sort }
    });
    return response.data;
};

/**
 * Create a new wallet store
 */
export const createWalletStore = async (storeData) => {
    const response = await api.post('/api/wallet-stores', storeData);
    return response.data;
};

/**
 * Update a wallet store
 */
export const updateWalletStore = async (storeId, storeData) => {
    const response = await api.put(`/api/wallet-stores/${storeId}`, storeData);
    return response.data;
};

/**
 * Delete a wallet store
 */
export const deleteWalletStore = async (storeId) => {
    const response = await api.delete(`/api/wallet-stores/${storeId}`);
    return response.data;
};

// ============================================
// WALLET CARDS API (Protected - Management)
// ============================================

/**
 * Generate wallet cards for a store
 */
export const generateWalletCards = async (storeId, count, emailType = 'icloud', emailPrefix = null, walletType = 'apple') => {
    const response = await api.post(`/api/wallet-stores/${storeId}/cards/generate`, {
        count,
        email_type: emailType,
        email_prefix: emailPrefix,
        wallet_type: walletType,
    });
    return response.data;
};

/**
 * Get wallet cards for a store (for export)
 */
export const getWalletStoreCards = async (storeId, page = 1, perPage = 50) => {
    const response = await api.get(`/api/wallet-stores/${storeId}/cards`, {
        params: { page, per_page: perPage }
    });
    return response.data;
};

/**
 * Delete a wallet card
 */
export const deleteWalletCard = async (cardId) => {
    const response = await api.delete(`/api/wallet-cards/${cardId}`);
    return response.data;
};

/**
 * Delete all wallet cards in a batch
 */
export const deleteWalletBatch = async (storeId, batchId) => {
    const response = await api.delete(`/api/wallet-stores/${storeId}/batches/${batchId}`);
    return response.data;
};

/**
 * Get all wallet cards in a batch (for export)
 */
export const getWalletBatchCards = async (storeId, batchId, page = 1, perPage = 20, search = '') => {
    const response = await api.get(`/api/wallet-stores/${storeId}/batches/${batchId}/cards`, {
        params: { page, per_page: perPage, search }
    });
    return response.data;
};

// ============================================
// WALLET CARDS API (Public - QR Scan)
// ============================================

/**
 * Get wallet card by access token (public, for QR scan)
 */
export const getWalletCardByToken = async (token) => {
    const response = await api.get(`/api/wallet/${token}`);
    return response.data;
};

/**
 * Submit phone number for wallet card
 */
export const submitWalletCardPhone = async (token, phoneNumber) => {
    const response = await api.post(`/api/wallet/${token}/phone`, {
        phone_number: phoneNumber,
    });
    return response.data;
};

/**
 * Switch - regenerate all random fields
 */
export const switchWalletCard = async (token) => {
    const response = await api.post(`/api/wallet/${token}/switch`);
    return response.data;
};

/**
 * Edit - update specific fields
 */
export const editWalletCard = async (token, data) => {
    const response = await api.put(`/api/wallet/${token}/edit`, data);
    return response.data;
};

/**
 * Manual fill - reset all fields for manual entry
 */
export const manualFillWalletCard = async (token, data) => {
    const response = await api.post(`/api/wallet/${token}/manual`, data);
    return response.data;
};

/**
 * Save - lock the card permanently
 */
export const saveWalletCard = async (token) => {
    const response = await api.post(`/api/wallet/${token}/save`);
    return response.data;
};

// ==================== Wallet System Cards (Transfer) ====================

/**
 * Get wallet system cards (cards in "System" store for transfer)
 */
export const getWalletSystemCards = async (page = 1, perPage = 50) => {
    const response = await api.get('/api/wallet-system/cards', {
        params: { page, per_page: perPage }
    });
    return response.data;
};

/**
 * Transfer wallet cards to a different store
 */
export const transferWalletCards = async (cardIds, storeId) => {
    const response = await api.post('/api/wallet-system/cards/transfer', {
        card_ids: cardIds,
        store_id: storeId,
    });
    return response.data;
};

// ==================== Wallet Dashboard APIs ====================

/**
 * Search wallet cards by phone number
 */
export const searchWalletPhone = async (query) => {
    const response = await api.get(`/api/wallet-dashboard/search-phone?q=${encodeURIComponent(query)}`);
    return response.data;
};

/**
 * Get recent wallet card scans/locks
 */
export const getWalletRecentScans = async () => {
    const response = await api.get('/api/wallet-dashboard/recent-activity');
    return response.data;
};
