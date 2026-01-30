import axios from 'axios';

// API base URL - update this for production
// const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://alishaker.it.com/api';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Required for Sanctum cookies
    withXSRFToken: true, // Automatically include XSRF token
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Add response interceptor for handling errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Redirect to login or handle unauthorized
            window.location.href = '/#/account-generation-313';
        }
        return Promise.reject(error);
    }
);

// ==================== Auth ====================

/**
 * Get CSRF cookie (required before login)
 */
export const getCsrfCookie = async () => {
    await api.get('/sanctum/csrf-cookie');
};

/**
 * Login with email and password
 */
export const login = async (email, password) => {
    await getCsrfCookie();
    const response = await api.post('/api/login', { email, password });
    return response.data;
};

/**
 * Logout current user
 */
export const logout = async () => {
    const response = await api.post('/api/logout');
    return response.data;
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async () => {
    const response = await api.get('/api/user');
    return response.data;
};

/**
 * Register a new user
 */
export const register = async (name, email, password, passwordConfirmation) => {
    await getCsrfCookie();
    const response = await api.post('/api/register', {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
    });
    return response.data;
};

// ==================== Dashboard ====================

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async () => {
    const response = await api.get('/api/dashboard');
    return response.data;
};

/**
 * Get stores with card counts for dashboard
 */
export const getDashboardStores = async () => {
    const response = await api.get('/api/dashboard/stores');
    return response.data;
};

/**
 * Get recent activity
 */
export const getRecentActivity = async () => {
    const response = await api.get('/api/dashboard/activity');
    return response.data;
};

/**
 * Search for emails in the database
 */
export const searchEmail = async (query) => {
    const response = await api.get('/api/dashboard/search-email', { params: { query } });
    return response.data;
};

/**
 * Get wallet dashboard statistics
 */
export const getWalletDashboardStats = async () => {
    const response = await api.get('/api/dashboard/wallet');
    return response.data;
};

/**
 * Get wallet stores with card counts for dashboard
 */
export const getWalletDashboardStores = async () => {
    const response = await api.get('/api/dashboard/wallet-stores');
    return response.data;
};

// ==================== Stores ====================

/**
 * Get all stores
 */
export const getStores = async () => {
    const response = await api.get('/api/stores');
    return response.data;
};

/**
 * Get a single store
 */
export const getStore = async (storeId) => {
    const response = await api.get(`/api/stores/${storeId}`);
    return response.data;
};

/**
 * Create a new store
 */
export const createStore = async (storeData) => {
    const response = await api.post('/api/stores', storeData);
    return response.data;
};

/**
 * Update a store
 */
export const updateStore = async (storeId, storeData) => {
    const response = await api.put(`/api/stores/${storeId}`, storeData);
    return response.data;
};

/**
 * Delete a store
 */
export const deleteStore = async (storeId) => {
    const response = await api.delete(`/api/stores/${storeId}`);
    return response.data;
};

// ==================== Cards ====================

/**
 * Get cards for a store
 */
export const getStoreCards = async (storeId, page = 1) => {
    const response = await api.get(`/api/stores/${storeId}/cards`, { params: { page } });
    return response.data;
};

/**
 * Get cards for a store with decrypted data (for export)
 */
export const getStoreCardsForExport = async (storeId) => {
    const response = await api.get(`/api/stores/${storeId}/cards`, { params: { export: 'true' } });
    return response.data;
};

/**
 * Generate cards for a store
 */
export const generateCards = async (storeId, count, emailType = 'random', color = 'blue', emailPrefix = null) => {
    const response = await api.post(`/api/stores/${storeId}/cards/generate`, {
        count,
        email_type: emailType,
        color,
        email_prefix: emailPrefix || undefined,
    });
    return response.data;
};

/**
 * Toggle card status (active/inactive)
 */
export const toggleCardStatus = async (cardId) => {
    const response = await api.patch(`/api/cards/${cardId}/status`);
    return response.data;
};

/**
 * Delete all cards in a batch
 */
export const deleteBatch = async (storeId, batchId) => {
    const response = await api.delete(`/api/stores/${storeId}/batches/${batchId}`);
    return response.data;
};

// ==================== Public Card Endpoints (for QR scan) ====================

/**
 * Get card data by ID with access token (public - for QR code scanning)
 */
export const getCardData = async (cardId, token = null) => {
    const params = token ? { token } : {};
    const response = await api.get(`/api/cards/${cardId}`, { params });
    return response.data;
};

/**
 * Submit phone number on first scan
 */
export const submitPhoneNumber = async (cardId, phoneNumber) => {
    const response = await api.post(`/api/cards/${cardId}/phone`, {
        phone_number: phoneNumber,
    });
    return response.data;
};

// ==================== System Cards (Generator Page) ====================

/**
 * Generate cards for the Generator page (system cards)
 */
export const generateSystemCards = async (count, emailType = 'random', color = 'blue', emailPrefix = null) => {
    const response = await api.post('/api/system/cards/generate', {
        count,
        email_type: emailType,
        color,
        email_prefix: emailPrefix || undefined,
    });
    return response.data;
};

/**
 * Get all system cards for the Generator page
 */
export const getSystemCards = async () => {
    const response = await api.get('/api/system/cards');
    return response.data;
};

/**
 * Delete a single system card
 */
export const deleteSystemCard = async (cardId) => {
    const response = await api.delete(`/api/system/cards/${cardId}`);
    return response.data;
};

/**
 * Clear all system cards
 */
export const clearSystemCards = async () => {
    const response = await api.delete('/api/system/cards');
    return response.data;
};

/**
 * Transfer system cards to a specific store
 */
export const transferSystemCards = async (cardIds, storeId) => {
    const response = await api.post('/api/system/cards/transfer', {
        card_ids: cardIds,
        store_id: storeId,
    });
    return response.data;
};

export default api;
